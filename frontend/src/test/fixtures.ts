import { http, HttpResponse } from "msw";

import type {
  Activity,
  DashboardSummary,
  Doctor,
  DoctorBrief,
  Page,
  Patient,
  Visit,
  VisitPage,
} from "@/api/types";

import { adminUser, API, regularUser, server } from "./server";

function brief(user: typeof regularUser): DoctorBrief {
  return {
    id: user.id,
    full_name: user.full_name,
    specialization: user.specialization,
    qualification: user.qualification,
    registration_number: user.registration_number,
    accent_color: user.accent_color,
  };
}

export const doctors: Doctor[] = [
  { ...adminUser, patient_count: 1, prescription_count: 3 },
  { ...regularUser, patient_count: 0, prescription_count: 1 },
];

/** A date `days` from today as "YYYY-MM-DD" (local calendar). */
export function isoDay(days = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const patient: Patient = {
  id: "33333333-3333-3333-3333-333333333333",
  patient_number: 7,
  full_name: "Fathima Begum",
  age: 69,
  gender: "female",
  phone: "+91 90000 11122",
  blood_group: "O+",
  allergies: ["NSAIDs"],
  address: "Anna Nagar, Chennai",
  assigned_doctor: brief(adminUser),
  created_at: "2025-08-01T04:00:00Z",
  visit_count: 1,
  last_visit_at: "2026-09-20T04:00:00Z",
  next_follow_up_date: isoDay(2),
};

export const newPatient: Patient = {
  ...patient,
  id: "44444444-4444-4444-4444-444444444444",
  patient_number: 8,
  full_name: "Suresh Babu",
  gender: "male",
  allergies: [],
  visit_count: 0,
  last_visit_at: null,
  next_follow_up_date: null,
};

export const visit: Visit = {
  id: "55555555-5555-5555-5555-555555555555",
  visited_at: "2026-09-20T04:00:00Z",
  vitals: { bp: "130/84", temperature: "98.4°F", pulse: null, weight: null, spo2: "99%" },
  complaints: "Routine follow-up.",
  diagnosis: "Hypertension — stable",
  advice: "Continue current medication.",
  follow_up_date: isoDay(2),
  medicines: [
    {
      name: "Amlodipine 5mg",
      dosage: "1-0-0",
      frequency: "Once daily",
      duration: "60 days",
      instructions: "After breakfast",
    },
  ],
  patient: {
    id: patient.id,
    patient_number: patient.patient_number,
    full_name: patient.full_name,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    blood_group: patient.blood_group,
    allergies: patient.allergies,
  },
  doctor: brief(adminUser),
};

export function page<T>(items: T[], total = items.length, offset = 0, limit = 25): Page<T> {
  return { items, total, offset, limit };
}

export function visitPage(items: Visit[], total = items.length): VisitPage {
  return { ...page(items, total), patient_count: 1, doctor_count: 1 };
}

export const dashboard: DashboardSummary = {
  today: isoDay(0),
  total_patients: 12,
  todays_visits: 2,
  prescriptions_this_month: 9,
  active_doctors: 5,
  visits_per_day: Array.from({ length: 7 }, (_, i) => ({ date: isoDay(i - 6), count: i })),
  top_diagnoses: [
    { label: "Hypertension", count: 6 },
    { label: "Diabetes", count: 3 },
  ],
  follow_ups: [
    {
      visit_id: visit.id,
      follow_up_date: isoDay(1),
      patient: { id: patient.id, full_name: patient.full_name },
      doctor: brief(adminUser),
    },
  ],
};

export const activities: Activity[] = [
  {
    id: "66666666-6666-6666-6666-666666666666",
    type: "prescription",
    actor_id: adminUser.id,
    patient_id: patient.id,
    description: "Dr. Ananya Rao created a prescription for Fathima Begum — Hypertension",
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    type: "login",
    actor_id: regularUser.id,
    patient_id: null,
    description: "Dr. Vikram Shah signed in",
    created_at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
  },
];

/** Handlers for the clinic's read endpoints with the sample data above. */
export function useClinicData() {
  server.use(
    http.get(`${API}/doctors`, () => HttpResponse.json(doctors)),
    http.get(`${API}/patients`, () => HttpResponse.json(page([patient, newPatient]))),
    http.get(`${API}/patients/:id`, ({ params }) =>
      params.id === patient.id
        ? HttpResponse.json(patient)
        : HttpResponse.json(
            { error: { code: "not_found", message: "Patient not found" } },
            { status: 404 },
          ),
    ),
    http.get(`${API}/visits`, () => HttpResponse.json(visitPage([visit]))),
    http.get(`${API}/visits/:id`, () => HttpResponse.json(visit)),
    http.get(`${API}/dashboard`, () => HttpResponse.json(dashboard)),
    http.get(`${API}/activities`, () => HttpResponse.json(activities)),
  );
}
