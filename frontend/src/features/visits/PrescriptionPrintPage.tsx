import "@/styles/print.css";

import { ArrowLeft, Printer } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";

import { errorMessage, isApiError } from "@/api/errors";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

import { useVisit } from "./api";
import { PrescriptionPad } from "./PrescriptionPad";
import styles from "./PrescriptionPrintPage.module.css";

export function PrescriptionPrintPage() {
  const { visitId = "" } = useParams();
  const navigate = useNavigate();
  const { data: visit, error, isPending } = useVisit(visitId);

  useEffect(() => {
    if (!visit) return undefined;
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, [visit]);

  if (isPending) return <p className="loading">Loading prescription…</p>;

  if (error) {
    const notFound = isApiError(error) && [404, 422].includes(error.status);
    return (
      <div className={styles.wrap}>
        {notFound ? <p>Prescription not found.</p> : <Alert>{errorMessage(error)}</Alert>}
        <Button
          variant="secondary"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate("/patients")}
        >
          Back to patients
        </Button>
      </div>
    );
  }

  return (
    <div className={[styles.wrap, "print-page"].join(" ")}>
      <div className={[styles.toolbar, "no-print"].join(" ")}>
        <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button icon={<Printer size={16} />} onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <PrescriptionPad patient={visit.patient} doctor={visit.doctor} visit={visit} />
    </div>
  );
}
