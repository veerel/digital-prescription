import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { UserCreate, UserUpdate } from "@/api/types";
import { useClinicData } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { adminUser, API, apiError, loggedInAs, regularUser, server } from "@/test/server";

describe("DoctorsPage", () => {
  it("shows the care team with workload", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp("/doctors");

    const card = await screen.findByRole("article", { name: "Dr. Ananya Rao" });
    expect(within(card).getByText("Admin")).toBeVisible();
    expect(within(card).getByText("TN/MCI/58231", { exact: false })).toBeVisible();
    expect(within(card).getByRole("link", { name: "View patients" })).toHaveAttribute(
      "href",
      `/patients?doctor=${adminUser.id}`,
    );
  });

  it("hides admin actions from regular doctors", async () => {
    loggedInAs(regularUser);
    useClinicData();
    renderApp("/doctors");

    expect(await screen.findByText("Only admins can add doctors")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add Doctor" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
  });

  it("lets an admin disable another doctor, but not themselves", async () => {
    loggedInAs(adminUser);
    useClinicData();
    let sent: { id: string; body: UserUpdate } | null = null;
    server.use(
      http.patch(`${API}/users/:id`, async ({ params, request }) => {
        sent = { id: String(params.id), body: (await request.json()) as UserUpdate };
        return HttpResponse.json({ ...regularUser, is_active: false });
      }),
    );
    renderApp("/doctors");

    const own = await screen.findByRole("article", { name: "Dr. Ananya Rao" });
    expect(within(own).queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
    const other = screen.getByRole("article", { name: "Dr. Vikram Shah" });
    await userEvent.click(within(other).getByRole("button", { name: "Disable" }));

    await vi.waitFor(() =>
      expect(sent).toEqual({ id: regularUser.id, body: { is_active: false } }),
    );
  });

  it("adds a doctor with a temporary password", async () => {
    loggedInAs(adminUser);
    useClinicData();
    let sent: UserCreate | null = null;
    server.use(
      http.post(`${API}/users`, async ({ request }) => {
        sent = (await request.json()) as UserCreate;
        return HttpResponse.json({ ...regularUser, id: "new" }, { status: 201 });
      }),
    );
    renderApp("/doctors");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add Doctor" }));
    const dialog = screen.getByRole("dialog", { name: "Add New Doctor" });
    await user.click(within(dialog).getByRole("button", { name: "Add Doctor" }));
    expect(within(dialog).getByText("Enter the doctor's name")).toBeVisible();
    expect(within(dialog).getByText("Use at least 12 characters")).toBeVisible();

    await user.type(within(dialog).getByLabelText("Full name"), "Rahul Verma");
    await user.selectOptions(within(dialog).getByLabelText("Specialization"), "ENT");
    await user.type(within(dialog).getByLabelText("Qualification"), "MBBS, MS (ENT)");
    await user.type(within(dialog).getByLabelText("Medical registration number"), "TN/1");
    await user.type(within(dialog).getByLabelText("Email (used to sign in)"), "rahul@clinic.in");
    await user.type(within(dialog).getByLabelText("Phone"), "+91 90000 00000");
    await user.type(within(dialog).getByLabelText("Temporary password"), "temporary-pass-1");
    await user.click(within(dialog).getByLabelText("Admin (can manage doctors)"));
    await user.click(within(dialog).getByRole("button", { name: "Add Doctor" }));

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(sent).toMatchObject({
      full_name: "Dr. Rahul Verma",
      specialization: "ENT",
      email: "rahul@clinic.in",
      password: "temporary-pass-1",
      role: "admin",
    });
  });

  it("shows the server's error, e.g. a duplicate email", async () => {
    loggedInAs(adminUser);
    useClinicData();
    server.use(
      http.post(`${API}/users`, () =>
        apiError(409, "conflict", "A user with this email already exists"),
      ),
    );
    renderApp("/doctors");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add Doctor" }));
    const dialog = screen.getByRole("dialog", { name: "Add New Doctor" });
    await user.type(within(dialog).getByLabelText("Full name"), "Dr. Rahul Verma");
    await user.type(within(dialog).getByLabelText("Qualification"), "MBBS");
    await user.type(within(dialog).getByLabelText("Medical registration number"), "TN/1");
    await user.type(within(dialog).getByLabelText("Email (used to sign in)"), "dup@clinic.in");
    await user.type(within(dialog).getByLabelText("Phone"), "+91 90000 00000");
    await user.type(within(dialog).getByLabelText("Temporary password"), "temporary-pass-1");
    await user.click(within(dialog).getByRole("button", { name: "Add Doctor" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "A user with this email already exists",
    );
  });
});
