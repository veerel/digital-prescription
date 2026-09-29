import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { page, patient, useClinicData } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { adminUser, API, apiError, loggedInAs, regularUser, server } from "@/test/server";

describe("AppShell", () => {
  it("shows the navigation and the signed-in doctor", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp("/dashboard");

    const nav = await screen.findByRole("navigation", { name: "Main" });
    for (const name of ["Dashboard", "Patients", "Visit Log", "Doctors"]) {
      expect(within(nav).getByRole("link", { name })).toBeVisible();
    }
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveTextContent(
      "Dr. Vikram Shah",
    );
  });

  it("collapses the sidebar", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp("/dashboard");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Collapse sidebar" }));

    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Patients" })).toBeVisible(); // icon + label
  });

  it("signs out on the server and returns to the login page", async () => {
    loggedInAs(regularUser);
    useClinicData();
    let loggedOut = false;
    server.use(
      http.post(`${API}/auth/logout`, () => {
        loggedOut = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { router } = renderApp("/dashboard");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(await screen.findByRole("heading", { name: "Welcome back, Doctor" })).toBeVisible();
    expect(loggedOut).toBe(true);
    expect(router.state.location.pathname).toBe("/login");
  });

  it("labels admins in the account menu", async () => {
    loggedInAs(adminUser);
    useClinicData();
    renderApp("/dashboard");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Account menu" }));

    expect(within(screen.getByRole("menu")).getByText("Admin")).toBeVisible();
  });

  it("searches patients from the top bar", async () => {
    loggedInAs(regularUser);
    useClinicData();
    const queries: string[] = [];
    server.use(
      http.get(`${API}/patients`, ({ request }) => {
        queries.push(new URL(request.url).searchParams.get("q") ?? "");
        return HttpResponse.json(page([patient]));
      }),
    );
    const { router } = renderApp("/dashboard");
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Search patients"), "fath");
    await user.click(await screen.findByRole("option", { name: /Fathima Begum/ }));

    expect(router.state.location.pathname).toBe(`/patients/${patient.id}`);
    expect(queries).toContain("fath");
  });

  it("changes the password", async () => {
    loggedInAs(regularUser);
    useClinicData();
    let sent: unknown = null;
    server.use(
      http.post(`${API}/auth/change-password`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(regularUser);
      }),
    );
    renderApp("/dashboard");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Change password" }));
    const dialog = screen.getByRole("dialog", { name: "Change password" });
    await user.type(within(dialog).getByLabelText("Current password"), "old-password");
    await user.type(within(dialog).getByLabelText("New password"), "short");
    await user.type(within(dialog).getByLabelText("Confirm new password"), "different");
    await user.click(within(dialog).getByRole("button", { name: "Change password" }));

    expect(within(dialog).getByText("Use at least 12 characters")).toBeVisible();
    expect(within(dialog).getByText("The passwords don't match")).toBeVisible();

    await user.clear(within(dialog).getByLabelText("New password"));
    await user.clear(within(dialog).getByLabelText("Confirm new password"));
    await user.type(within(dialog).getByLabelText("New password"), "a-brand-new-password");
    await user.type(within(dialog).getByLabelText("Confirm new password"), "a-brand-new-password");
    await user.click(within(dialog).getByRole("button", { name: "Change password" }));

    expect(await within(dialog).findByText("Your password has been changed.")).toBeVisible();
    expect(sent).toEqual({
      current_password: "old-password",
      new_password: "a-brand-new-password",
    });
  });

  it("shows the server's error when the current password is wrong", async () => {
    loggedInAs(regularUser);
    useClinicData();
    server.use(
      http.post(`${API}/auth/change-password`, () =>
        apiError(422, "business_rule_violation", "Current password is incorrect"),
      ),
    );
    renderApp("/dashboard");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Change password" }));
    const dialog = screen.getByRole("dialog", { name: "Change password" });
    await user.type(within(dialog).getByLabelText("Current password"), "wrong");
    await user.type(within(dialog).getByLabelText("New password"), "a-brand-new-password");
    await user.type(within(dialog).getByLabelText("Confirm new password"), "a-brand-new-password");
    await user.click(within(dialog).getByRole("button", { name: "Change password" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Current password is incorrect",
    );
  });

  it("shows the 404 page for unknown routes", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp("/no/such/page");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeVisible();
  });
});
