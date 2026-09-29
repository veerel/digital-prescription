import { UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { z } from "zod";

import { errorMessage, isApiError } from "@/api/errors";
import type { Doctor, Patient } from "@/api/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import forms from "@/styles/forms.module.css";

import { useCreatePatient } from "./api";

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"] as const;
const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
] as const;

const schema = z.object({
  full_name: z.string().trim().min(1, "Enter the patient's name").max(200),
  age: z.coerce
    .number({ error: "Enter an age" })
    .int("Enter a whole number")
    .min(0, "Age can't be negative")
    .max(130, "Enter a realistic age"),
  gender: z.enum(["female", "male", "other"]),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 ()-]{5,29}$/, "Enter a valid phone number"),
  address: z.string().trim().max(300),
  blood_group: z.enum(BLOOD_GROUPS),
  allergies: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(100, "Keep each allergy under 100 characters")).max(20)),
  assigned_doctor_id: z.string().min(1, "Choose the assigned doctor"),
});

type Field = keyof z.input<typeof schema>;
const FORM_ID = "add-patient-form";

export function AddPatientDrawer({
  open,
  onClose,
  doctors,
  defaultDoctorId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  doctors: Doctor[];
  defaultDoctorId?: string;
  onCreated: (patient: Patient) => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const create = useCreatePatient();

  function close() {
    setErrors({});
    create.reset();
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
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
    create.mutate(parsed.data, {
      onSuccess: (patient) => {
        setErrors({});
        onCreated(patient);
      },
      onError: (error) => {
        if (isApiError(error)) setErrors(error.fieldErrors as Partial<Record<Field, string>>);
      },
    });
  }

  const error = (name: Field) =>
    errors[name] ? <p className={forms.error}>{errors[name]}</p> : null;

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Add New Patient"
      subtitle="Register a patient before starting their prescription."
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
            {create.isPending ? "Adding…" : "Add Patient"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate aria-label="Add patient">
        {create.error && <Alert>{errorMessage(create.error)}</Alert>}
        <p className={forms.sectionTitle}>Basic details</p>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="patient-name">
            Full name
          </label>
          <input
            id="patient-name"
            name="full_name"
            className={forms.input}
            placeholder="e.g. Sundari Raman"
          />
          {error("full_name")}
        </div>

        <div className={forms.grid}>
          <div className={forms.field}>
            <label className={forms.label} htmlFor="patient-age">
              Age
            </label>
            <input
              id="patient-age"
              name="age"
              className={forms.input}
              type="number"
              min="0"
              max="130"
              placeholder="34"
            />
            {error("age")}
          </div>
          <div className={forms.field}>
            <label className={forms.label} htmlFor="patient-gender">
              Gender
            </label>
            <select id="patient-gender" name="gender" className={forms.select}>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={forms.field}>
          <label className={forms.label} htmlFor="patient-phone">
            Phone number
          </label>
          <input
            id="patient-phone"
            name="phone"
            className={forms.input}
            placeholder="+91 90000 00000"
          />
          {error("phone")}
        </div>

        <div className={forms.field}>
          <label className={forms.label} htmlFor="patient-address">
            Address <span className={forms.optional}>(optional)</span>
          </label>
          <input
            id="patient-address"
            name="address"
            className={forms.input}
            placeholder="Area, City"
          />
          {error("address")}
        </div>

        <p className={forms.sectionTitle}>Medical details</p>
        <div className={forms.grid}>
          <div className={forms.field}>
            <label className={forms.label} htmlFor="patient-blood">
              Blood group
            </label>
            <select id="patient-blood" name="blood_group" className={forms.select}>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg}>{bg}</option>
              ))}
            </select>
          </div>
          <div className={forms.field}>
            <label className={forms.label} htmlFor="patient-doctor">
              Assigned doctor
            </label>
            <select
              id="patient-doctor"
              name="assigned_doctor_id"
              className={forms.select}
              defaultValue={defaultDoctorId ?? ""}
            >
              <option value="">Select doctor</option>
              {doctors
                .filter((d) => d.is_active)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
            </select>
            {error("assigned_doctor_id")}
          </div>
        </div>

        <div className={forms.field}>
          <label className={forms.label} htmlFor="patient-allergies">
            Known allergies <span className={forms.optional}>(comma separated)</span>
          </label>
          <input
            id="patient-allergies"
            name="allergies"
            className={forms.input}
            placeholder="Penicillin, Dust"
          />
          {error("allergies")}
        </div>
      </form>
    </Drawer>
  );
}
