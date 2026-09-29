import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import type { Activity, DashboardSummary } from "@/api/types";

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard"),
  activities: (limit: number) => api.get<Activity[]>("/activities", { query: { limit } }),
};

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.summary });
}

export function useActivities(limit = 6) {
  return useQuery({
    queryKey: ["activities", limit],
    queryFn: () => dashboardApi.activities(limit),
  });
}
