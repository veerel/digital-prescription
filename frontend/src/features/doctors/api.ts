import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import type { Doctor, User, UserCreate, UserUpdate } from "@/api/types";

// The care-team directory is GET /doctors (every doctor). Adding and
// enabling/disabling doctors is the admin-only /users API.

export const doctorsApi = {
  list: () => api.get<Doctor[]>("/doctors"),
  create: (input: UserCreate) => api.post<User>("/users", input),
  update: (id: string, input: UserUpdate) =>
    api.patch<User>(`/users/${encodeURIComponent(id)}`, input),
};

export const doctorKeys = {
  all: ["doctors"] as const,
};

export function useDoctors() {
  return useQuery({ queryKey: doctorKeys.all, queryFn: doctorsApi.list, staleTime: 60_000 });
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: doctorsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: doctorKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserUpdate }) => doctorsApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: doctorKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
