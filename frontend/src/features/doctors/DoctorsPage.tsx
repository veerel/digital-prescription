import { Lock, UserPlus } from "lucide-react";
import { useState } from "react";

import { errorMessage } from "@/api/errors";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";

import { AddDoctorModal } from "./AddDoctorModal";
import { useDoctors, useUpdateDoctor } from "./api";
import { DoctorCard } from "./DoctorCard";
import styles from "./DoctorsPage.module.css";

export function DoctorsPage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const { data: doctors, error, isPending } = useDoctors();
  const update = useUpdateDoctor();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Your care team</h2>
          <p className={styles.subtitle}>
            {doctors ? `${doctors.length} doctors across the clinic` : " "}
          </p>
        </div>
        {isAdmin ? (
          <Button icon={<UserPlus size={16} />} onClick={() => setModalOpen(true)}>
            Add Doctor
          </Button>
        ) : (
          <span className={styles.lockedNote}>
            <Lock size={13} /> Only admins can add doctors
          </span>
        )}
      </div>

      {error && <Alert>{errorMessage(error)}</Alert>}
      {update.error && <Alert>{errorMessage(update.error)}</Alert>}
      {isPending && <p className="loading">Loading care team…</p>}

      <div className={styles.grid}>
        {doctors?.map((d) => (
          <DoctorCard
            key={d.id}
            doctor={d}
            busy={update.isPending}
            onToggleActive={
              isAdmin && d.id !== user?.id
                ? () => update.mutate({ id: d.id, input: { is_active: !d.is_active } })
                : undefined
            }
          />
        ))}
      </div>

      {isAdmin && <AddDoctorModal open={modalOpen} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
