import { FileText, LogIn, type LucideIcon, Stethoscope, UserPlus } from "lucide-react";

import type { ActivityType } from "@/api/types";
import type { Tone } from "@/components/ui/Badge";

export const ACTIVITY_META: Record<ActivityType, { label: string; icon: LucideIcon; tone: Tone }> =
  {
    prescription: { label: "Prescription", icon: FileText, tone: "teal" },
    patient_added: { label: "Patient added", icon: UserPlus, tone: "info" },
    doctor_added: { label: "Doctor added", icon: Stethoscope, tone: "warning" },
    login: { label: "Sign-in", icon: LogIn, tone: "neutral" },
  };
