import { Eye, Printer, Save } from "lucide-react";
import { useState } from "react";

import { errorMessage } from "@/api/errors";
import type { Patient, User, Visit, VisitCreate, Vitals } from "@/api/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { todayInputValue } from "@/lib/formatters";
import forms from "@/styles/forms.module.css";

import { useCreateVisit } from "./api";
import { emptyRow, type MedicineRow } from "./medicines";
import { MedicineRowsEditor } from "./MedicineRowsEditor";
import styles from "./PrescriptionForm.module.css";
import { PrescriptionPad } from "./PrescriptionPad";

interface FormState {
  vitals: Required<{ [K in keyof Vitals]: string }>;
  complaints: string;
  diagnosis: string;
  medicines: MedicineRow[];
  advice: string;
  followUpDate: string;
}

const initialState = (): FormState => ({
  vitals: { bp: "", temperature: "", pulse: "", weight: "", spo2: "" },
  complaints: "",
  diagnosis: "",
  medicines: [emptyRow()],
  advice: "",
  followUpDate: "",
});

const VITALS: { key: keyof Vitals; label: string; placeholder: string }[] = [
  { key: "bp", label: "Blood pressure", placeholder: "120/80" },
  { key: "temperature", label: "Temperature", placeholder: "98.4°F" },
  { key: "pulse", label: "Pulse", placeholder: "76" },
  { key: "weight", label: "Weight", placeholder: "62kg" },
  { key: "spo2", label: "SpO2", placeholder: "98%" },
];

function toRequest(patientId: string, form: FormState): VisitCreate {
  return {
    patient_id: patientId,
    vitals: form.vitals,
    complaints: form.complaints,
    diagnosis: form.diagnosis,
    medicines: form.medicines.filter((m) => m.name.trim()),
    advice: form.advice,
    follow_up_date: form.followUpDate || null,
  };
}

function validate(form: FormState): string {
  if (!form.diagnosis.trim()) return "Please enter a diagnosis before saving.";
  if (!form.medicines.some((m) => m.name.trim())) return "Add at least one medicine.";
  if (form.followUpDate && form.followUpDate < todayInputValue()) {
    return "The follow-up date can't be in the past.";
  }
  return "";
}

/** The prescribing doctor is always the signed-in user: the server enforces it too. */
export function PrescriptionForm({
  patient,
  doctor,
  onSaved,
}: {
  patient: Patient;
  doctor: User;
  onSaved: (visit: Visit, options: { print: boolean }) => void;
}) {
  const [form, setForm] = useState<FormState>(initialState);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState("");
  const create = useCreateVisit();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setVital = (key: keyof Vitals, value: string) =>
    setForm((f) => ({ ...f, vitals: { ...f.vitals, [key]: value } }));

  function save(print: boolean) {
    const problem = validate(form);
    setError(problem);
    if (problem) return;
    create.mutate(toRequest(patient.id, form), {
      onSuccess: (visit) => {
        setForm(initialState());
        onSaved(visit, { print });
      },
    });
  }

  const draft = toRequest(patient.id, form);

  return (
    <div className={styles.wrap}>
      <form
        className={styles.formCol}
        onSubmit={(e) => e.preventDefault()}
        aria-label="New prescription"
      >
        <p className={forms.sectionTitle}>Vitals</p>
        <div className={styles.vitalsGrid}>
          {VITALS.map((v) => (
            <div key={v.key} className={forms.field}>
              <label className={forms.label} htmlFor={`vital-${v.key}`}>
                {v.label}
              </label>
              <input
                id={`vital-${v.key}`}
                className={forms.input}
                placeholder={v.placeholder}
                maxLength={20}
                value={form.vitals[v.key]}
                onChange={(e) => setVital(v.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <p className={forms.sectionTitle}>Consultation</p>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="rx-complaints">
            Chief complaints
          </label>
          <textarea
            id="rx-complaints"
            className={forms.textarea}
            maxLength={2000}
            value={form.complaints}
            onChange={(e) => set("complaints", e.target.value)}
            placeholder="What is the patient presenting with?"
          />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="rx-diagnosis">
            Diagnosis
          </label>
          <textarea
            id="rx-diagnosis"
            className={forms.textarea}
            maxLength={500}
            value={form.diagnosis}
            onChange={(e) => set("diagnosis", e.target.value)}
            placeholder="Clinical diagnosis"
          />
        </div>

        <p className={forms.sectionTitle}>℞ Medicines</p>
        <MedicineRowsEditor rows={form.medicines} onChange={(rows) => set("medicines", rows)} />

        <p className={forms.sectionTitle}>Advice &amp; follow-up</p>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="rx-advice">
            Advice / notes <span className={forms.optional}>(optional)</span>
          </label>
          <textarea
            id="rx-advice"
            className={forms.textarea}
            maxLength={2000}
            value={form.advice}
            onChange={(e) => set("advice", e.target.value)}
            placeholder="Lifestyle advice, diet, tests to get done…"
          />
        </div>
        <div className={forms.field}>
          <label className={forms.label} htmlFor="rx-follow-up">
            Follow-up date <span className={forms.optional}>(optional)</span>
          </label>
          <input
            id="rx-follow-up"
            type="date"
            className={forms.input}
            min={todayInputValue()}
            value={form.followUpDate}
            onChange={(e) => set("followUpDate", e.target.value)}
          />
        </div>

        {(error || create.error) && <Alert>{error || errorMessage(create.error)}</Alert>}

        <div className={styles.actions}>
          <Button variant="ghost" icon={<Eye size={16} />} onClick={() => setPreviewOpen(true)}>
            Preview
          </Button>
          <Button
            variant="secondary"
            icon={<Save size={16} />}
            onClick={() => save(false)}
            disabled={create.isPending}
          >
            Save
          </Button>
          <Button
            icon={<Printer size={16} />}
            onClick={() => save(true)}
            disabled={create.isPending}
          >
            Save &amp; Print
          </Button>
        </div>
      </form>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Prescription preview"
        width={820}
      >
        <PrescriptionPad
          patient={patient}
          doctor={doctor}
          visit={{
            ...draft,
            vitals: draft.vitals ?? {},
            follow_up_date: draft.follow_up_date,
          }}
        />
      </Modal>
    </div>
  );
}
