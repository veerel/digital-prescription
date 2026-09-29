import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import type { Page, Patient, PatientCreate } from "@/api/types";

export interface PatientFilters {
  q?: string;
  doctorId?: string;
  offset?: number;
  limit?: number;
}

export const patientsApi = {
  list: ({ q, doctorId, offset = 0, limit = 50 }: PatientFilters) =>
    api.get<Page<Patient>>("/patients", {
      query: { q: q || undefined, doctor_id: doctorId || undefined, offset, limit },
    }),
  get: (id: string) => api.get<Patient>(`/patients/${encodeURIComponent(id)}`),
  create: (input: PatientCreate) => api.post<Patient>("/patients", input),
};

export const patientKeys = {
  all: ["patients"] as const,
  list: (filters: PatientFilters) => [...patientKeys.all, "list", filters] as const,
  detail: (id: string) => [...patientKeys.all, "detail", id] as const,
};

export function usePatients(filters: PatientFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: patientKeys.list(filters),
    queryFn: () => patientsApi.list(filters),
    placeholderData: keepPreviousData, // no flicker while typing a search
    enabled,
  });
}

export function usePatient(id: string) {
  return useQuery({ queryKey: patientKeys.detail(id), queryFn: () => patientsApi.get(id) });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patientsApi.create,
    onSuccess: () => {
      for (const key of [patientKeys.all, ["doctors"], ["dashboard"], ["activities"]]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
