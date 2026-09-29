import { UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { z } from "zod";

import { errorMessage, isApiError } from "@/api/errors";
import type { Role } from "@/api/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import forms from "@/styles/forms.module.css";

import { useCreateDoctor } from "./api";

const SPECIALIZATIONS = [
  "General Medicine",
  "Cardiology",
  "Pediatrics",
  "Orthopedics",
  "Dermatology",
  "Gynaecology",
  "ENT",
  "Neurology",
  "Psychiatry",
];

const ACCENTS = ["#14b8a6", "#3568c9", "#b9791a", "#8b5cf6", "#dc4c8c", "#2f9e6e"];

const schema = z.object({
  full_name: z.string().trim().min(1, "Enter the doctor's name").max(196),
  specialization: z.string().min(1),
  qualification: z.string().trim().min(1, "Enter a qualification").max(200),
  registration_number: z.string().trim().min(1, "Enter the registration number").max(50),
  email: z.string().trim().min(1, "Enter an email").includes("@", { error: "Enter a valid email" }),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 ()-]{5,29}$/, "Enter a valid phone number"),
  password: z.string().min(12, "Use at least 12 characters").max(128),
});

type Field = keyof z.infer<typeof schema>;

const FORM_ID = "add-doctor-form";

export function AddDoctorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [role, setRole] = useState<Role>("doctor");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const create = useCreateDoctor();

  function close() {
    setErrors({});
    setRole("doctor");
    create.reset();
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors;
      setErrors(
        Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]])) as Partial<
          Record<Field, string>
        >,
      );
      return;
    }
    setErrors({});
    const { full_name, ...rest } = parsed.data;
    create.mutate(
      {
        ...rest,
        full_name: full_name.startsWith("Dr.") ? full_name : `Dr. ${full_name}`,
        role,
        accent_color: ACCENTS[Math.floor(Math.random() * ACCENTS.length)] ?? "#14b8a6",
      },
      {
        onSuccess: () => {
          form.reset();
          close();
        },
        onError: (error) => {
          if (isApiError(error)) setErrors(error.fieldErrors as Partial<Record<Field, string>>);
        },
      },
    );
  }

  const input = (name: Field, label: string, props: Record<string, string> = {}) => (
    <div className={forms.field}>
      <label className={forms.label} htmlFor={`doctor-${name}`}>
        {label}
      </label>
      <input
        id={`doctor-${name}`}
        name={name}
        className={forms.input}
        aria-invalid={errors[name] ? true : undefined}
        {...props}
      />
      {errors[name] && <p className={forms.error}>{errors[name]}</p>}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add New Doctor"
      subtitle="They can sign in straight away with the temporary password."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            icon={<UserPlus size={16} />}
            disabled={create.isPending}
          >
            {create.isPending ? "Adding…" : "Add Doctor"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate aria-label="Add doctor">
        {create.error && <Alert>{errorMessage(create.error)}</Alert>}
        {input("full_name", "Full name", { placeholder: "e.g. Rahul Verma" })}

        <div className={forms.grid}>
          <div className={forms.field}>
            <label className={forms.label} htmlFor="doctor-specialization">
              Specialization
            </label>
            <select id="doctor-specialization" name="specialization" className={forms.select}>
              {SPECIALIZATIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {input("qualification", "Qualification", { placeholder: "MBBS, MD" })}
        </div>

        {input("registration_number", "Medical registration number", {
          placeholder: "TN/MCI/00000",
        })}

        <div className={forms.grid}>
          {input("email", "Email (used to sign in)", {
            type: "email",
            placeholder: "doctor@clinic.in",
            autoComplete: "off",
          })}
          {input("phone", "Phone", { placeholder: "+91 90000 00000" })}
        </div>

        {input("password", "Temporary password", {
          type: "password",
          autoComplete: "new-password",
          placeholder: "At least 12 characters",
        })}
        <p className={forms.hint}>
          Share it privately; they can change it from their profile menu.
        </p>

        <div className={forms.field} style={{ marginTop: 16 }}>
          <span className={forms.label}>Access level</span>
          <div className={forms.radioRow} role="radiogroup" aria-label="Access level">
            {(["doctor", "admin"] as const).map((value) => (
              <label
                key={value}
                className={[forms.radioChip, role === value ? forms.radioChipActive : ""].join(" ")}
              >
                <input
                  type="radio"
                  name="role"
                  checked={role === value}
                  onChange={() => setRole(value)}
                />
                {value === "admin" ? "Admin (can manage doctors)" : "Doctor"}
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
