import { Stethoscope, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import { errorMessage } from "@/api/errors";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pager } from "@/components/ui/Pager";
import { SearchInput } from "@/components/ui/SearchInput";
import { useAuth } from "@/features/auth/AuthContext";
import { useDoctors } from "@/features/doctors/api";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import forms from "@/styles/forms.module.css";

import { AddPatientDrawer } from "./AddPatientDrawer";
import { usePatients } from "./api";
import { PatientTable } from "./PatientTable";
import styles from "./PatientsListPage.module.css";

const PAGE_SIZE = 25;

export function PatientsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const doctorFilter = searchParams.get("doctor") ?? "";

  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showIntentBanner, setShowIntentBanner] = useState(
    (location.state as { intent?: string } | null)?.intent === "new-prescription",
  );

  const q = useDebouncedValue(query.trim());
  const doctors = useDoctors();
  const patients = usePatients({ q, doctorId: doctorFilter, offset, limit: PAGE_SIZE });

  function changeSearch(value: string) {
    setQuery(value);
    setOffset(0);
  }

  function changeDoctor(value: string) {
    setOffset(0);
    setSearchParams(value ? { doctor: value } : {}, { replace: true });
  }

  return (
    <div className={styles.page}>
      {showIntentBanner && (
        <div className={styles.banner} role="status">
          <Stethoscope size={16} />
          <span>
            Select a patient below to start a new prescription — or add a new patient first.
          </span>
          <button type="button" onClick={() => setShowIntentBanner(false)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <Card padded={false} className={styles.card}>
        <div className={styles.toolbar}>
          <SearchInput
            value={query}
            onChange={changeSearch}
            placeholder="Search by name or phone…"
            label="Search patients by name or phone"
            className={styles.search}
          />
          <select
            className={forms.select}
            value={doctorFilter}
            onChange={(e) => changeDoctor(e.target.value)}
            style={{ width: 200 }}
            aria-label="Filter by assigned doctor"
          >
            <option value="">All doctors</option>
            {doctors.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
          <Button
            icon={<UserPlus size={16} />}
            className={styles.addBtn}
            onClick={() => setDrawerOpen(true)}
          >
            Add Patient
          </Button>
        </div>

        <div className={styles.tableSection}>
          {patients.error && <Alert>{errorMessage(patients.error)}</Alert>}
          {patients.isPending && <p className="loading">Loading patients…</p>}
          {patients.data && <PatientTable patients={patients.data.items} />}
        </div>

        <div className={styles.footerCount}>
          {patients.data && (
            <>
              <span>
                Showing {patients.data.items.length} of {patients.data.total} patients
              </span>
              <Pager
                offset={offset}
                pageSize={PAGE_SIZE}
                total={patients.data.total}
                onChange={setOffset}
              />
            </>
          )}
        </div>
      </Card>

      <AddPatientDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        doctors={doctors.data ?? []}
        defaultDoctorId={user?.id}
        onCreated={(patient) => {
          setDrawerOpen(false);
          navigate(`/patients/${patient.id}`, { state: { tab: "prescription" } });
        }}
      />
    </div>
  );
}
