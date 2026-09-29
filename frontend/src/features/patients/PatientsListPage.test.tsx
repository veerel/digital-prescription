import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { PatientCreate } from "@/api/types";
import { newPatient, page, patient, useClinicData } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { adminUser, API, apiError, loggedInAs, regularUser, server } from "@/test/server";

describe("PatientsListPage", () => {
  it("lists patients with their doctor and status", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp("/patients");

    const table = await screen.findByRole("table");
    const row = within(table).getByRole("link", { name: "Fathima Begum" }).closest("tr")!;
    expect(within(row).getByText("Dr. Ananya Rao")).toBeVisible();
    expect(within(row).getByText("Follow-up due")).toBeVisible(); // due in 2 days
    const fresh = within(table).getByRole("link", { name: "Suresh Babu" }).closest("tr")!;
    expect(within(fresh).getByText("New")).toBeVisible();
    expect(screen.getByText("Showing 2 of 2 patients")).toBeVisible();
  });

  it("searches and filters on the server", async () => {
    loggedInAs(regularUser);
    useClinicData();
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(`${API}/patients`, ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([patient]));
      }),
    );
    renderApp("/patients");
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Search patients by name or phone"), "fath");
    await user.selectOptions(
      screen.getByLabelText("Filter by assigned doctor"),
      await screen.findByRole("option", { name: "Dr. Ananya Rao" }),
    );

    await vi.waitFor(() =>
      expect(
        requests.some((r) => r.get("q") === "fath" && r.get("doctor_id") === adminUser.id),
      ).toBe(true),
    );
  });

  it("reads the doctor filter from the URL (Doctors page 'View patients')", async () => {
    loggedInAs(regularUser);
    useClinicData();
    const doctorIds: (string | null)[] = [];
    server.use(
      http.get(`${API}/patients`, ({ request }) => {
        doctorIds.push(new URL(request.url).searchParams.get("doctor_id"));
        return HttpResponse.json(page([]));
      }),
    );
    renderApp(`/patients?doctor=${adminUser.id}`);

    expect(await screen.findByText("No patients match your search")).toBeVisible();
    expect(doctorIds).toContain(adminUser.id);
  });

  it("pages through results", async () => {
    loggedInAs(regularUser);
    useClinicData();
    server.use(
      http.get(`${API}/patients`, ({ request }) => {
        const offset = Number(new URL(request.url).searchParams.get("offset") ?? 0);
        return HttpResponse.json(page([patient], 60, offset));
      }),
    );
    renderApp("/patients");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Next" }));
    expect(await screen.findByText("26–50 of 60")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(await screen.findByText("1–25 of 60")).toBeVisible();
  });

  it("registers a patient and opens their new prescription", async () => {
    loggedInAs(regularUser);
    useClinicData();
    let sent: PatientCreate | null = null;
    server.use(
      http.post(`${API}/patients`, async ({ request }) => {
        sent = (await request.json()) as PatientCreate;
        return HttpResponse.json(patient, { status: 201 });
      }),
    );
    const { router } = renderApp("/patients");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add Patient" }));
    const drawer = screen.getByRole("dialog", { name: "Add New Patient" });
    await user.click(within(drawer).getByRole("button", { name: "Add Patient" }));
    expect(within(drawer).getByText("Enter the patient's name")).toBeVisible();

    await user.type(within(drawer).getByLabelText("Full name"), "Fathima Begum");
    await user.type(within(drawer).getByLabelText("Age"), "69");
    await user.type(within(drawer).getByLabelText("Phone number"), "+91 90000 11122");
    await user.selectOptions(within(drawer).getByLabelText("Blood group"), "B-");
    await user.selectOptions(within(drawer).getByLabelText("Assigned doctor"), adminUser.id);
    await user.type(within(drawer).getByLabelText(/Known allergies/), "NSAIDs, , Dust ");
    await user.click(within(drawer).getByRole("button", { name: "Add Patient" }));

    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/patients/${patient.id}`));
    expect(sent).toEqual({
      full_name: "Fathima Begum",
      age: 69,
      gender: "female",
      phone: "+91 90000 11122",
      address: "",
      blood_group: "B-",
      allergies: ["NSAIDs", "Dust"],
      assigned_doctor_id: adminUser.id,
    });
    expect(await screen.findByRole("tab", { name: "New Prescription" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows server validation errors next to the field", async () => {
    loggedInAs(regularUser);
    useClinicData();
    server.use(
      http.post(`${API}/patients`, () =>
        apiError(422, "validation_error", "Request validation failed", [
          { loc: ["body", "phone"], msg: "String should match pattern", type: "string_pattern" },
        ]),
      ),
    );
    renderApp("/patients");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add Patient" }));
    const drawer = screen.getByRole("dialog", { name: "Add New Patient" });
    await user.type(within(drawer).getByLabelText("Full name"), "X");
    await user.type(within(drawer).getByLabelText("Age"), "5");
    await user.type(within(drawer).getByLabelText("Phone number"), "+91 90000 11122");
    await user.click(within(drawer).getByRole("button", { name: "Add Patient" }));

    expect(await within(drawer).findByText("String should match pattern")).toBeVisible();
    expect(within(drawer).getByRole("alert")).toHaveTextContent("Request validation failed");
  });

  it("shows the intent banner from 'New Prescription'", async () => {
    loggedInAs(regularUser);
    useClinicData();
    const { router } = renderApp("/dashboard");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "New Prescription" }));

    expect(router.state.location.pathname).toBe("/patients");
    expect(await screen.findByText(/Select a patient below/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/Select a patient below/)).not.toBeInTheDocument();
  });

  it("shows an error when the list can't load", async () => {
    loggedInAs(regularUser);
    useClinicData();
    server.use(
      http.get(`${API}/patients`, () => apiError(500, "internal_error", "Something went wrong")),
    );
    renderApp("/patients");
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("opens a patient when their row is clicked", async () => {
    loggedInAs(regularUser);
    useClinicData();
    server.use(http.get(`${API}/patients`, () => HttpResponse.json(page([newPatient]))));
    const { router } = renderApp("/patients");

    await userEvent.click(await screen.findByText("+91 90000 11122"));

    expect(router.state.location.pathname).toBe(`/patients/${newPatient.id}`);
  });
});
