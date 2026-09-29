import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Droplet,
  FileStack,
  MapPin,
  Phone,
  Stethoscope,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";

import { errorMessage, isApiError } from "@/api/errors";
import type { Visit } from "@/api/types";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/features/auth/AuthContext";
import { useVisits } from "@/features/visits/api";
import { PrescriptionForm } from "@/features/visits/PrescriptionForm";
import { formatDate, genderLabel, patientCode } from "@/lib/formatters";

import { usePatient } from "./api";
import styles from "./PatientDetailPage.module.css";
import { PatientHistoryTimeline } from "./PatientHistoryTimeline";

type Tab = "overview" | "history" | "prescription";
const HISTORY_LIMIT = 100;

export function PatientDetailPage() {
  const { patientId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const patient = usePatient(patientId);
  const history = useVisits({ patientId, limit: HISTORY_LIMIT });

  const [tab, setTab] = useState<Tab>((location.state as { tab?: Tab } | null)?.tab ?? "overview");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (!confirmation) return undefined;
    const t = setTimeout(() => setConfirmation(""), 4000);
    return () => clearTimeout(t);
  }, [confirmation]);

  if (patient.isPending) return <p className="loading">Loading patient…</p>;
  if (patient.error) {
    const notFound = isApiError(patient.error) && [404, 422].includes(patient.error.status);
    return (
      <Card>
        {notFound ? <p>Patient not found.</p> : <Alert>{errorMessage(patient.error)}</Alert>}
        <Link to="/patients" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to patients
        </Link>
      </Card>
    );
  }

  const p = patient.data;
  const visits = history.data?.items ?? [];
  const doctor = p.assigned_doctor;

  function handleSaved(visit: Visit, { print }: { print: boolean }) {
    if (print) {
      navigate(`/prescriptions/${visit.id}/print`);
    } else {
      setConfirmation("Prescription saved to this patient’s history.");
      setTab("history");
    }
  }

  const overview: [string, string][] = [
    ["Full name", p.full_name],
    ["Age / Gender", `${p.age} years · ${genderLabel(p.gender)}`],
    ["Phone", p.phone],
    ["Blood group", p.blood_group],
    ["Address", p.address ?? "—"],
    ["Known allergies", p.allergies.length ? p.allergies.join(", ") : "None recorded"],
    ["Assigned doctor", doctor.full_name],
    ["Patient ID", patientCode(p.patient_number)],
  ];

  return (
    <div className={styles.page}>
      <Link to="/patients" className={styles.backLink}>
        <ArrowLeft size={14} /> Back to patients
      </Link>

      <Card className={styles.summaryCard}>
        <div className={styles.summaryTop}>
          <Avatar name={p.full_name} size={64} />
          <div className={styles.summaryInfo}>
            <h2 className={styles.name}>{p.full_name}</h2>
            <div className={styles.metaRow}>
              <span>
                {p.age}y · {genderLabel(p.gender)}
              </span>
              <span className={styles.metaDivider} />
              <span className={styles.metaIcon}>
                <Droplet size={12} /> {p.blood_group}
              </span>
              <span className={styles.metaDivider} />
              <span className={styles.metaIcon}>
                <Phone size={12} /> {p.phone}
              </span>
              {p.address && (
                <>
                  <span className={styles.metaDivider} />
                  <span className={styles.metaIcon}>
                    <MapPin size={12} /> {p.address}
                  </span>
                </>
              )}
            </div>
            {p.allergies.length > 0 && (
              <div className={styles.allergyRow} aria-label="Known allergies">
                <AlertTriangle size={13} />
                {p.allergies.map((a) => (
                  <Badge key={a} tone="danger">
                    {a}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className={styles.assignedDoctor}>
            <span className={styles.assignedLabel}>Assigned Doctor</span>
            <div className={styles.assignedDoctorRow}>
              <Avatar name={doctor.full_name} color={doctor.accent_color} size={30} />
              <div>
                <p className={styles.assignedName}>{doctor.full_name}</p>
                <p className={styles.assignedSpec}>{doctor.specialization}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <FileStack size={15} />
            <span>
              <strong>{p.visit_count}</strong> total visits
            </span>
          </div>
          <div className={styles.stat}>
            <CalendarClock size={15} />
            <span>
              Last visit <strong>{formatDate(p.last_visit_at)}</strong>
            </span>
          </div>
          <div className={styles.stat}>
            <ClipboardList size={15} />
            <span>
              Registered <strong>{formatDate(p.created_at)}</strong>
            </span>
          </div>
        </div>
      </Card>

      {confirmation && (
        <div className={styles.confirmation} role="status">
          {confirmation}
        </div>
      )}

      <Card>
        <Tabs<Tab>
          active={tab}
          onChange={setTab}
          items={[
            { value: "overview", label: "Overview" },
            { value: "history", label: "Visit History", count: p.visit_count },
            {
              value: "prescription",
              label: "New Prescription",
              icon: <Stethoscope size={14} />,
            },
          ]}
        />

        <div className={styles.tabBody}>
          {tab === "overview" && (
            <dl className={styles.overviewGrid}>
              {overview.map(([label, value]) => (
                <div key={label}>
                  <dt className={styles.overviewLabel}>{label}</dt>
                  <dd className={styles.overviewValue}>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {tab === "history" && (
            <>
              {history.error && <Alert>{errorMessage(history.error)}</Alert>}
              {history.isPending ? (
                <p className="loading">Loading history…</p>
              ) : (
                <PatientHistoryTimeline visits={visits} />
              )}
              {p.visit_count > visits.length && !history.isPending && (
                <p className="loading">
                  Showing the latest {visits.length} of {p.visit_count} visits.{" "}
                  <Link to={`/visits?patient=${encodeURIComponent(p.id)}`}>See all</Link>
                </p>
              )}
            </>
          )}

          {tab === "prescription" && user && (
            <PrescriptionForm patient={p} doctor={user} onSaved={handleSaved} />
          )}
        </div>
      </Card>
    </div>
  );
}
