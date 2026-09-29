import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it } from "vitest";

import { patient, useClinicData } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, apiError, loggedInAs, regularUser, server } from "@/test/server";

describe("DashboardPage", () => {
  it("shows the clinic's numbers from the API", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp("/dashboard");

    expect(await screen.findByText("12")).toBeVisible(); // total patients
    expect(screen.getByText("Prescriptions This Month").nextSibling).toHaveTextContent("9");
    expect(screen.getByText("Active Doctors").nextSibling).toHaveTextContent("5");
    const diagnoses = screen.getByRole("list", { name: "Top diagnoses" });
    expect(within(diagnoses).getByText("Hypertension")).toBeVisible();
  });

  it("lists follow-ups and recent activity with links to the patient", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp("/dashboard");

    const followUp = await screen.findByRole("link", { name: /Fathima Begum.*Tomorrow/ });
    expect(followUp).toHaveAttribute("href", `/patients/${patient.id}`);
    expect(
      await screen.findByRole("link", { name: /created a prescription for Fathima Begum/ }),
    ).toHaveAttribute("href", `/patients/${patient.id}`);
    expect(screen.getByText("Dr. Vikram Shah signed in")).toBeVisible();
    expect(screen.getByText("5m ago")).toBeVisible();
  });

  it("shows an error when the summary can't load", async () => {
    loggedInAs(regularUser);
    useClinicData();
    server.use(
      http.get(`${API}/dashboard`, () => apiError(500, "internal_error", "Something went wrong")),
    );
    renderApp("/dashboard");
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });
});
