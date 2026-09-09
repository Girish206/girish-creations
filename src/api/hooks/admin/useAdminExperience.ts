import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, ExperienceDetails } from "../../types";

export interface ExperienceFormInput {
  jobTitle: string;
  companyName: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["experience"] });
  queryClient.invalidateQueries({ queryKey: ["profile"] });
}

export function useCreateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExperienceFormInput) => {
      const { data } = await apiClient.post<ApiEnvelope<ExperienceDetails>>("/admin/experience", input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<ExperienceFormInput> }) => {
      const { data } = await apiClient.put<ApiEnvelope<ExperienceDetails>>(`/admin/experience/${id}`, input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/experience/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
