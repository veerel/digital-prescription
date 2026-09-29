import { CalendarDays, Stethoscope, Users, X } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { errorMessage } from "@/api/errors";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pager } from "@/components/ui/Pager";
import { SearchInput } from "@/components/ui/SearchInput";
import { useDoctors } from "@/features/doctors/api";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import forms from "@/styles/forms.module.css";

import { useVisits } from "./api";
import styles from "./VisitLogPage.module.css";
import { VisitLogTable } from "./VisitLogTable";

const PAGE_SIZE = 25;

function plural(n: number, word: string): string {
  return `${word}${n === 1 ? "" : "s"}`;
}

export function VisitLogPage() {
  // ?patient=<id> comes from "See all" on a patient's history.
  const [searchParams, setSearchParams] = useSearchParams();
  const patientId = searchParams.get("patient") ?? "";

  const [query, setQuery] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [offset, setOffset] = useState(0);
  const q = useDebouncedValue(query.trim());

  const doctors = useDoctors();
  const visits = useVisits({
    patientId,
    doctorId,
    q,
    dateFrom,
    dateTo,
    offset,
    limit: PAGE_SIZE,
  });

  const hasFilters = Boolean(query || doctorId || dateFrom || dateTo || patientId);

  // Every filter change starts again from the first page.
  function filter(apply: () => void) {
    apply();
    setOffset(0);
  }

  function clearFilters() {
    filter(() => {
      setQuery("");
      setDoctorId("");
      setDateFrom("");
      setDateTo("");
      setSearchParams({}, { replace: true });
    });
  }

  const page = visits.data;

  return (
    <div className={styles.page}>
      {page && (
        <div className={styles.summaryRow} aria-live="polite">
          <div className={styles.summaryStat}>
            <CalendarDays size={16} />
            <span>
              <strong>{page.total}</strong> {plural(page.total, "visit")}
            </span>
          </div>
          <div className={styles.summaryStat}>
            <Users size={16} />
            <span>
              <strong>{page.patient_count}</strong> {plural(page.patient_count, "patient")}
            </span>
          </div>
          <div className={styles.summaryStat}>
            <Stethoscope size={16} />
            <span>
              <strong>{page.doctor_count}</strong> {plural(page.doctor_count, "doctor")} involved
            </span>
          </div>
        </div>
      )}

      <Card padded={false}>
        <div className={styles.toolbar}>
          <SearchInput
            value={query}
            onChange={(value) => filter(() => setQuery(value))}
            placeholder="Search patient by name or phone…"
            label="Search visits by patient name or phone"
            className={styles.search}
          />

          <select
            className={forms.select}
            value={doctorId}
            onChange={(e) => filter(() => setDoctorId(e.target.value))}
            style={{ width: 190 }}
            aria-label="Filter by doctor"
          >
            <option value="">All doctors</option>
            {doctors.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>

          <div className={styles.dateRange}>
            <label className={styles.dateLabel}>
              From
              <input
                type="date"
                className={forms.input}
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => filter(() => setDateFrom(e.target.value))}
              />
            </label>
            <label className={styles.dateLabel}>
              To
              <input
                type="date"
                className={forms.input}
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => filter(() => setDateTo(e.target.value))}
              />
            </label>
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <div className={styles.tableSection}>
          {visits.error && <Alert>{errorMessage(visits.error)}</Alert>}
          {visits.isPending && <p className="loading">Loading visits…</p>}
          {page && <VisitLogTable visits={page.items} />}
        </div>

        <div className={styles.footerCount}>
          {page && (
            <>
              <span>
                Showing {page.items.length} of {page.total} {plural(page.total, "visit")}
              </span>
              <Pager offset={offset} pageSize={PAGE_SIZE} total={page.total} onChange={setOffset} />
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
