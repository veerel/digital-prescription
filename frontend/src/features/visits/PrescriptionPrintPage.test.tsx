import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { clinicInfo } from "@/config/clinic";
import { useClinicData, visit } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, apiError, loggedInAs, regularUser, server } from "@/test/server";

describe("PrescriptionPrintPage", () => {
  it("renders the saved prescription on the letterhead and opens the print dialog", async () => {
    loggedInAs(regularUser);
    useClinicData();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderApp(`/prescriptions/${visit.id}/print`);

    expect(await screen.findByText(clinicInfo.name)).toBeVisible();
    expect(screen.getAllByText("Dr. Ananya Rao").length).toBeGreaterThan(0); // the prescriber
    expect(screen.getByText("Reg. No: TN/MCI/58231")).toBeVisible();
    expect(screen.getByText("PT-0007")).toBeVisible();
    expect(screen.getByText("Amlodipine 5mg")).toBeVisible();
    expect(screen.getByText("130/84")).toBeVisible();
    expect(screen.getByText(/Known allergies: NSAIDs/)).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
    await vi.waitFor(() => expect(print).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalledTimes(2);
  });

  it("shows 'not found' for an unknown prescription", async () => {
    loggedInAs(regularUser);
    useClinicData();
    server.use(http.get(`${API}/visits/:id`, () => apiError(404, "not_found", "Visit not found")));
    const { router } = renderApp(`/prescriptions/${visit.id}/print`);

    expect(await screen.findByText("Prescription not found.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Back to patients" }));
    expect(router.state.location.pathname).toBe("/patients");
  });

  it("requires sign-in", async () => {
    const { router } = renderApp(`/prescriptions/${visit.id}/print`);
    await screen.findByRole("heading", { name: "Welcome back, Doctor" });
    expect(router.state.location.pathname).toBe("/login");
  });
});
