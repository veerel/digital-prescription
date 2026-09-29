import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { VisitCreate } from "@/api/types";
import { isoDay, patient, useClinicData, visit, visitPage } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, apiError, loggedInAs, regularUser, server } from "@/test/server";

const PATH = `/patients/${patient.id}`;

describe("PatientDetailPage", () => {
  it("shows the patient's summary, allergies and overview", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp(PATH);

    expect(await screen.findByRole("heading", { name: "Fathima Begum" })).toBeVisible();
    expect(within(screen.getByLabelText("Known allergies")).getByText("NSAIDs")).toBeVisible();
    expect(screen.getByText("PT-0007")).toBeVisible();
    expect(screen.getByText("69 years · Female")).toBeVisible();
  });

  it("shows the visit history timeline with print links", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp(PATH);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("tab", { name: /Visit History/ }));

    const history = await screen.findByRole("list", { name: "Visit history" });
    expect(within(history).getByText("Hypertension — stable")).toBeVisible();
    expect(within(history).getByText("Amlodipine 5mg")).toBeVisible();
    expect(within(history).getByRole("link", { name: /View \/ Print/ })).toHaveAttribute(
      "href",
      `/prescriptions/${visit.id}/print`,
    );
  });

  it("shows 'not found' for an unknown patient", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp("/patients/00000000-0000-0000-0000-000000000000");
    expect(await screen.findByText("Patient not found.")).toBeVisible();
  });

  it("validates the prescription before saving", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp(PATH);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("tab", { name: /New Prescription/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a diagnosis");

    await user.type(screen.getByLabelText("Diagnosis"), "Viral fever");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Add at least one medicine.");
  });

  it("writes a prescription and shows it in the history", async () => {
    loggedInAs(regularUser);
    useClinicData();
    let sent: VisitCreate | null = null;
    server.use(
      http.post(`${API}/visits`, async ({ request }) => {
        sent = (await request.json()) as VisitCreate;
        return HttpResponse.json(visit, { status: 201 });
      }),
    );
    renderApp(PATH);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("tab", { name: /New Prescription/ }));
    await user.type(screen.getByLabelText("Blood pressure"), "120/80");
    await user.type(screen.getByLabelText("Chief complaints"), "Fever");
    await user.type(screen.getByLabelText("Diagnosis"), "Viral fever");
    await user.type(screen.getByLabelText("Medicine 1"), "Paracetamol 500mg");
    await user.type(screen.getByLabelText("Dosage 1"), "1-1-1");
    await user.click(screen.getByRole("button", { name: "Add medicine" }));
    await user.type(screen.getByLabelText("Medicine 2"), "ORS Powder");
    await user.click(screen.getByRole("button", { name: "Add medicine" }));
    await user.click(screen.getByRole("button", { name: "Remove medicine 3" }));
    await user.type(screen.getByLabelText(/Follow-up date/), isoDay(5));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Prescription saved");
    expect(screen.getByRole("tab", { name: /Visit History/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(sent).toMatchObject({
      patient_id: patient.id,
      vitals: { bp: "120/80", temperature: "" },
      complaints: "Fever",
      diagnosis: "Viral fever",
      follow_up_date: isoDay(5),
      medicines: [
        { name: "Paracetamol 500mg", dosage: "1-1-1", frequency: "Twice daily" },
        { name: "ORS Powder" },
      ],
    });
    expect(sent).not.toHaveProperty("doctor_id"); // the server uses the signed-in doctor
  });

  it("previews the pad with the signed-in doctor's details", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp(PATH);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("tab", { name: /New Prescription/ }));
    await user.type(screen.getByLabelText("Diagnosis"), "Viral fever");
    await user.click(screen.getByRole("button", { name: "Preview" }));

    const preview = screen.getByRole("dialog", { name: "Prescription preview" });
    expect(within(preview).getAllByText("Dr. Vikram Shah").length).toBeGreaterThan(0);
    expect(within(preview).getByText("Viral fever")).toBeVisible();
    expect(within(preview).getByText(/Known allergies: NSAIDs/)).toBeVisible();
    expect(within(preview).getByText("No medicines added.")).toBeVisible();
  });

  it("'Save & Print' opens the print page", async () => {
    loggedInAs(regularUser);
    useClinicData();
    vi.spyOn(window, "print").mockImplementation(() => {});
    server.use(http.post(`${API}/visits`, () => HttpResponse.json(visit, { status: 201 })));
    const { router } = renderApp(PATH);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("tab", { name: /New Prescription/ }));
    await user.type(screen.getByLabelText("Diagnosis"), "Viral fever");
    await user.type(screen.getByLabelText("Medicine 1"), "Paracetamol 500mg");
    await user.click(screen.getByRole("button", { name: "Save & Print" }));

    await vi.waitFor(() =>
      expect(router.state.location.pathname).toBe(`/prescriptions/${visit.id}/print`),
    );
  });

  it("shows the server's error when saving fails", async () => {
    loggedInAs(regularUser);
    useClinicData();
    server.use(
      http.post(`${API}/visits`, () =>
        apiError(422, "business_rule_violation", "The follow-up date cannot be in the past"),
      ),
    );
    renderApp(PATH);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("tab", { name: /New Prescription/ }));
    await user.type(screen.getByLabelText("Diagnosis"), "Viral fever");
    await user.type(screen.getByLabelText("Medicine 1"), "Paracetamol 500mg");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("cannot be in the past");
  });

  it("links to the full log when history has more visits than shown", async () => {
    loggedInAs(regularUser);
    useClinicData();
    server.use(
      http.get(`${API}/patients/:id`, () => HttpResponse.json({ ...patient, visit_count: 150 })),
      http.get(`${API}/visits`, () => HttpResponse.json(visitPage([visit], 150))),
    );
    renderApp(PATH);

    await userEvent.click(await screen.findByRole("tab", { name: /Visit History/ }));

    expect(await screen.findByRole("link", { name: "See all" })).toHaveAttribute(
      "href",
      `/visits?patient=${patient.id}`,
    );
  });
});
