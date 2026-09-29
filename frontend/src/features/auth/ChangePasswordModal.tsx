import { useMutation } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { z } from "zod";

import { errorMessage } from "@/api/errors";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import forms from "@/styles/forms.module.css";

import { authApi } from "./api";

const schema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z
      .string()
      .min(12, "Use at least 12 characters")
      .max(128, "Use at most 128 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, {
    path: ["confirm"],
    error: "The passwords don't match",
  });

type Field = "current_password" | "new_password" | "confirm";

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [done, setDone] = useState(false);
  const change = useMutation({ mutationFn: authApi.changePassword });

  function close() {
    setErrors({});
    setDone(false);
    change.reset();
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors;
      setErrors({
        current_password: fieldErrors.current_password?.[0],
        new_password: fieldErrors.new_password?.[0],
        confirm: fieldErrors.confirm?.[0],
      });
      return;
    }
    setErrors({});
    const { current_password, new_password } = parsed.data;
    change.mutate({ current_password, new_password }, { onSuccess: () => setDone(true) });
  }

  const field = (name: Field, label: string, autoComplete: string) => (
    <div className={forms.field}>
      <label className={forms.label} htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="password"
        autoComplete={autoComplete}
        className={forms.input}
        aria-invalid={errors[name] ? true : undefined}
      />
      {errors[name] && <p className={forms.error}>{errors[name]}</p>}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title="Change password"
      subtitle="You'll stay signed in here; other devices are signed out."
      width={440}
    >
      {done ? (
        <>
          <p>Your password has been changed.</p>
          <div style={{ marginTop: 16 }}>
            <Button onClick={close}>Done</Button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate aria-label="Change password">
          {change.error && <Alert>{errorMessage(change.error)}</Alert>}
          {field("current_password", "Current password", "current-password")}
          {field("new_password", "New password", "new-password")}
          {field("confirm", "Confirm new password", "new-password")}
          <Button type="submit" icon={<KeyRound size={16} />} disabled={change.isPending}>
            {change.isPending ? "Saving…" : "Change password"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
