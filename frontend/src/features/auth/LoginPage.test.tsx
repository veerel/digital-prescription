import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { useClinicData } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { API, apiError, regularUser, server } from "@/test/server";

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(await screen.findByLabelText("Email address"), email);
  if (password) await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginPage", () => {
  it("redirects anonymous visitors to the login page", async () => {
    const { router } = renderApp("/dashboard");
    expect(await screen.findByRole("heading", { name: "Welcome back, Doctor" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/login");
  });

  it("has no demo 'sign in as' shortcuts", async () => {
    renderApp("/login");
    await screen.findByRole("heading", { name: "Welcome back, Doctor" });
    expect(screen.queryByText(/quick sign-in/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sign in as")).not.toBeInTheDocument();
  });

  it("shows and hides the password with the eye button", async () => {
    const user = userEvent.setup();
    renderApp("/login");
    const password = await screen.findByLabelText("Password");
    await user.type(password, "secret-value");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("secret-value");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("validates input before calling the API", async () => {
    renderApp("/login");
    await fillAndSubmit("", "");
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("shows the server's message when credentials are wrong", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        apiError(401, "not_authenticated", "Invalid email or password"),
      ),
    );
    renderApp("/login");

    await fillAndSubmit("doctor@clinic.in", "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
  });

  it("logs in and returns to the page the doctor originally asked for", async () => {
    useClinicData();
    let sent: unknown = null;
    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(regularUser);
      }),
    );
    const { router } = renderApp("/visits");
    await screen.findByRole("heading", { name: "Welcome back, Doctor" });

    await fillAndSubmit("vikram.shah@clinic.in", "correct-password");

    expect(await screen.findByRole("heading", { name: "Visit Log" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/visits");
    expect(sent).toEqual({ email: "vikram.shah@clinic.in", password: "correct-password" });
  });

  it("goes to the dashboard by default", async () => {
    useClinicData();
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json(regularUser)));
    const { router } = renderApp("/login");

    await fillAndSubmit("vikram.shah@clinic.in", "correct-password");

    expect(await screen.findByRole("heading", { name: /Dr. Vikram Shah/ })).toBeVisible();
    expect(router.state.location.pathname).toBe("/dashboard");
  });
});
