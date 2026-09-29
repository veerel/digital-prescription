import { createBrowserRouter, Navigate } from "react-router";

import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { DoctorsPage } from "@/features/doctors/DoctorsPage";
import { PatientDetailPage } from "@/features/patients/PatientDetailPage";
import { PatientsListPage } from "@/features/patients/PatientsListPage";
import { PrescriptionPrintPage } from "@/features/visits/PrescriptionPrintPage";
import { VisitLogPage } from "@/features/visits/VisitLogPage";
import { NotFoundPage } from "@/routes/NotFoundPage";
import { ProtectedRoute } from "@/routes/ProtectedRoute";

export const routes = [
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      // Full-page, no sidebar: this is what gets printed.
      { path: "prescriptions/:visitId/print", element: <PrescriptionPrintPage /> },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "patients", element: <PatientsListPage /> },
          { path: "patients/:patientId", element: <PatientDetailPage /> },
          { path: "visits", element: <VisitLogPage /> },
          { path: "doctors", element: <DoctorsPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
