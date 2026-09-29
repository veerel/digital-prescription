import type { DoctorBrief, Medicine, PatientBrief, Vitals } from "@/api/types";
import { clinicInfo } from "@/config/clinic";
import { formatDate, genderLabel, patientCode } from "@/lib/formatters";

import styles from "./PrescriptionPad.module.css";

const VITAL_LABELS: [keyof Vitals, string][] = [
  ["bp", "BP"],
  ["temperature", "Temp"],
  ["pulse", "Pulse"],
  ["weight", "Weight"],
  ["spo2", "SpO2"],
];

/** What the pad prints: a saved visit, or the draft being previewed in the form. */
export interface PadVisit {
  visited_at?: string;
  vitals: Vitals;
  complaints?: string | null;
  diagnosis: string;
  medicines: Medicine[];
  advice?: string | null;
  follow_up_date?: string | null;
}

type PadPatient = Pick<
  PatientBrief,
  "full_name" | "age" | "gender" | "patient_number" | "allergies"
>;
type PadDoctor = Pick<
  DoctorBrief,
  "full_name" | "qualification" | "specialization" | "registration_number"
>;

export function PrescriptionPad({
  patient,
  doctor,
  visit,
}: {
  patient: PadPatient;
  doctor: PadDoctor;
  visit: PadVisit;
}) {
  return (
    <div className={["prescription-pad", styles.pad].join(" ")}>
      <header className={styles.header}>
        <div>
          <p className={styles.clinicName}>{clinicInfo.name}</p>
          <p className={styles.clinicMeta}>{clinicInfo.address}</p>
          <p className={styles.clinicMeta}>
            {clinicInfo.phone} · {clinicInfo.email}
          </p>
        </div>
        <div className={styles.doctorBlock}>
          <p className={styles.doctorName}>{doctor.full_name}</p>
          {doctor.qualification && <p className={styles.doctorMeta}>{doctor.qualification}</p>}
          {doctor.specialization && <p className={styles.doctorMeta}>{doctor.specialization}</p>}
          {doctor.registration_number && (
            <p className={styles.doctorMeta}>Reg. No: {doctor.registration_number}</p>
          )}
        </div>
      </header>

      <div className={styles.divider} />

      <div className={styles.patientRow}>
        <div>
          <span className={styles.fieldLabel}>Patient</span>
          <p className={styles.fieldValue}>{patient.full_name}</p>
        </div>
        <div>
          <span className={styles.fieldLabel}>Age / Gender</span>
          <p className={styles.fieldValue}>
            {patient.age}y · {genderLabel(patient.gender)}
          </p>
        </div>
        <div>
          <span className={styles.fieldLabel}>Patient ID</span>
          <p className={styles.fieldValue}>{patientCode(patient.patient_number)}</p>
        </div>
        <div>
          <span className={styles.fieldLabel}>Date</span>
          <p className={styles.fieldValue}>{formatDate(visit.visited_at ?? new Date())}</p>
        </div>
      </div>

      <div className={styles.vitalsRow}>
        {VITAL_LABELS.map(([key, label]) => (
          <div key={key} className={styles.vital}>
            <span className={styles.vitalLabel}>{label}</span>
            <span className={styles.vitalValue}>{visit.vitals[key] || "—"}</span>
          </div>
        ))}
      </div>

      {patient.allergies.length > 0 && (
        <p className={styles.allergyLine}>⚠ Known allergies: {patient.allergies.join(", ")}</p>
      )}

      <div className={styles.section}>
        <span className={styles.fieldLabel}>Chief Complaints</span>
        <p className={styles.paragraph}>{visit.complaints || "—"}</p>
      </div>

      <div className={styles.section}>
        <span className={styles.fieldLabel}>Diagnosis</span>
        <p className={styles.paragraph}>{visit.diagnosis || "—"}</p>
      </div>

      <div className={styles.rxSection}>
        <span className={styles.rxMark}>℞</span>
        <table className={styles.rxTable}>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Medicine</th>
              <th scope="col">Dosage</th>
              <th scope="col">Frequency</th>
              <th scope="col">Duration</th>
              <th scope="col">Instructions</th>
            </tr>
          </thead>
          <tbody>
            {visit.medicines.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.emptyRx}>
                  No medicines added.
                </td>
              </tr>
            )}
            {visit.medicines.map((m, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td className={styles.medName}>{m.name}</td>
                <td>{m.dosage}</td>
                <td>{m.frequency}</td>
                <td>{m.duration}</td>
                <td>{m.instructions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visit.advice && (
        <div className={styles.section}>
          <span className={styles.fieldLabel}>Advice</span>
          <p className={styles.paragraph}>{visit.advice}</p>
        </div>
      )}

      <div className={styles.footer}>
        <div>
          <span className={styles.fieldLabel}>Next Follow-up</span>
          <p className={styles.fieldValue}>
            {visit.follow_up_date ? formatDate(visit.follow_up_date) : "Not scheduled"}
          </p>
        </div>
        <div className={styles.signature}>
          <div className={styles.signatureLine} />
          <p className={styles.signatureName}>{doctor.full_name}</p>
          <p className={styles.signatureMeta}>{doctor.registration_number}</p>
        </div>
      </div>

      <p className={styles.disclaimer}>
        This is a digitally generated prescription from {clinicInfo.name} and does not require a
        physical signature.
      </p>
    </div>
  );
}
