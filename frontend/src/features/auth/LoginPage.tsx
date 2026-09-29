import { Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { z } from "zod";

import { errorMessage, isApiError } from "@/api/errors";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import forms from "@/styles/forms.module.css";

import { useAuth } from "./AuthContext";
import styles from "./LoginPage.module.css";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .includes("@", { error: "Enter a valid email" }),
  password: z.string().min(1, "Password is required"),
});

type FieldErrors = Partial<Record<"email" | "password", string>>;

/** Only allow redirects to paths inside this app (prevents open redirects). */
function safeRedirect(target: unknown): string {
  return typeof target === "string" && target.startsWith("/") && !target.startsWith("//")
    ? target
    : "/dashboard";
}

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = safeRedirect((location.state as { from?: string } | null)?.from);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (status === "authenticated") return <Navigate to={redirectTo} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors;
      setFieldErrors({ email: errors.email?.[0], password: errors.password?.[0] });
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      await login(parsed.data);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(errorMessage(error));
      if (isApiError(error)) setFieldErrors(error.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.brandPanel}>
        <div className={styles.brandMarkWrap}>
          <span className={styles.brandMark}>℞</span>
          <span className={styles.brandWordmark}>
            Digital<strong>Prescription</strong>
          </span>
        </div>
        <h2 className={styles.tagline}>Prescriptions your handwriting never had to ruin.</h2>
        <p className={styles.taglineSub}>
          Diagnose, prescribe and print in minutes — with every patient&apos;s full visit history
          one click away.
        </p>

        <ul className={styles.featureList}>
          <li>
            <ShieldCheck size={16} /> Role-aware access for doctors &amp; admins
          </li>
          <li>
            <ShieldCheck size={16} /> Complete patient &amp; medicine history
          </li>
          <li>
            <ShieldCheck size={16} /> Clean, print-ready prescription pad
          </li>
        </ul>

        <div className={styles.padPreview} aria-hidden="true">
          <div className={styles.padLine} style={{ width: "55%" }} />
          <div className={styles.padLine} style={{ width: "80%" }} />
          <div className={styles.padDivider} />
          <div className={styles.padLine} style={{ width: "40%" }} />
          <div className={styles.padLine} style={{ width: "65%" }} />
          <div className={styles.padLine} style={{ width: "50%" }} />
        </div>
      </div>

      <main className={styles.formPanel}>
        <div className={styles.formCard}>
          <h1 className={styles.title}>Welcome back, Doctor</h1>
          <p className={styles.subtitle}>Sign in to continue to your dashboard.</p>

          <form onSubmit={handleSubmit} noValidate aria-label="Sign in">
            {formError && <Alert>{formError}</Alert>}

            <div className={forms.field}>
              <label className={forms.label} htmlFor="email">
                Email address
              </label>
              <div className={styles.inputWithIcon}>
                <Mail size={16} aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  className={[forms.input, styles.bareInput].join(" ")}
                  placeholder="you@clinic.in"
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className={forms.error}>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className={forms.field}>
              <label className={forms.label} htmlFor="password">
                Password
              </label>
              <div className={styles.inputWithIcon}>
                <Lock size={16} aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={[forms.input, styles.bareInput].join(" ")}
                  placeholder="••••••••"
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  className={styles.revealButton}
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls="password"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className={forms.error}>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <Button type="submit" full icon={<LogIn size={16} />} disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
        <p className={styles.footerNote}>
          Forgot your password? Ask a clinic admin to reset your account.
        </p>
      </main>
    </div>
  );
}
