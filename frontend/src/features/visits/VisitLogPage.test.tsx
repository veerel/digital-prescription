import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { patient, useClinicData, visit, visitPage } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { adminUser, API, apiError, loggedInAs, regularUser, server } from "@/test/server";

describe("VisitLogPage", () => {
  it("lists visits with totals", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp("/visits");

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Fathima Begum")).toBeVisible();
    expect(within(table).getByText("Hypertension — stable")).toBeVisible();
    expect(screen.getByText("1 visit", { exact: false })).toBeVisible();
    expect(screen.getByText("Showing 1 of 1 visit")).toBeVisible();
  });

  it("sends filters to the server and can clear them", async () => {
    loggedInAs(regularUser);
    useClinicData();
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(`${API}/visits`, ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json(visitPage([visit]));
      }),
    );
    renderApp("/visits");
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/Search visits/), "fath");
    await user.selectOptions(
      screen.getByLabelText("Filter by doctor"),
      await screen.findByRole("option", { name: "Dr. Ananya Rao" }),
    );
    await user.type(screen.getByLabelText("From"), "2026-09-01");
    await user.type(screen.getByLabelText("To"), "2026-09-30");

    await vi.waitFor(() => {
      const last = requests.at(-1)!;
      expect(last.get("q")).toBe("fath");
      expect(last.get("doctor_id")).toBe(adminUser.id);
      expect(last.get("date_from")).toBe("2026-09-01");
      expect(last.get("date_to")).toBe("2026-09-30");
    });

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await vi.waitFor(() =>
      expect([...requests.at(-1)!.keys()].sort()).toEqual(["limit", "offset"]),
    );
  });

  it("filters to one patient from the URL", async () => {
    loggedInAs(regularUser);
    useClinicData();
    const patientIds: (string | null)[] = [];
    server.use(
      http.get(`${API}/visits`, ({ request }) => {
        patientIds.push(new URL(request.url).searchParams.get("patient_id"));
        return HttpResponse.json(visitPage([]));
      }),
    );
    renderApp(`/visits?patient=${patient.id}`);

    expect(await screen.findByText("No visits in this range")).toBeVisible();
    expect(patientIds).toContain(patient.id);
  });

  it("opens the print page from a row", async () => {
    loggedInAs(regularUser);
    useClinicData();
    vi.spyOn(window, "print").mockImplementation(() => {});
    const { router } = renderApp("/visits");

    await userEvent.click(await screen.findByRole("button", { name: /Print prescription for/ }));

    expect(router.state.location.pathname).toBe(`/prescriptions/${visit.id}/print`);
  });

  it("opens the patient when a row is clicked", async () => {
    loggedInAs(regularUser);
    useClinicData();
    const { router } = renderApp("/visits");

    await userEvent.click(await screen.findByText("Hypertension — stable"));

    expect(router.state.location.pathname).toBe(`/patients/${patient.id}`);
  });

  it("shows an error when the log can't load", async () => {
    loggedInAs(regularUser);
    useClinicData();
    server.use(
      http.get(`${API}/visits`, () =>
        apiError(
          422,
          "business_rule_violation",
          "The start date must be on or before the end date",
        ),
      ),
    );
    renderApp("/visits");
    expect(await screen.findByRole("alert")).toHaveTextContent("start date must be on or before");
  });
});
