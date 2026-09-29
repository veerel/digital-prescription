import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import type { Visit, VisitCreate, VisitPage } from "@/api/types";

export interface VisitFilters {
  patientId?: string;
  doctorId?: string;
  q?: string;
  dateFrom?: string; // YYYY-MM-DD, inclusive, clinic timezone
  dateTo?: string;
  offset?: number;
  limit?: number;
}

export const visitsApi = {
  list: ({ patientId, doctorId, q, dateFrom, dateTo, offset = 0, limit = 50 }: VisitFilters) =>
    api.get<VisitPage>("/visits", {
      query: {
        patient_id: patientId || undefined,
        doctor_id: doctorId || undefined,
        q: q || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        offset,
        limit,
      },
    }),
  get: (id: string) => api.get<Visit>(`/visits/${encodeURIComponent(id)}`),
  create: (input: VisitCreate) => api.post<Visit>("/visits", input),
};

export const visitKeys = {
  all: ["visits"] as const,
  list: (filters: VisitFilters) => [...visitKeys.all, "list", filters] as const,
  detail: (id: string) => [...visitKeys.all, "detail", id] as const,
};

export function useVisits(filters: VisitFilters) {
  return useQuery({
    queryKey: visitKeys.list(filters),
    queryFn: () => visitsApi.list(filters),
    placeholderData: keepPreviousData,
  });
}

export function useVisit(id: string) {
  return useQuery({ queryKey: visitKeys.detail(id), queryFn: () => visitsApi.get(id) });
}

export function useCreateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: visitsApi.create,
    onSuccess: (visit) => {
      queryClient.setQueryData(visitKeys.detail(visit.id), visit);
      for (const key of [visitKeys.all, ["patients"], ["doctors"], ["dashboard"], ["activities"]]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
