import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, EducationDetails } from "../../types";

export interface EducationFormInput {
  course: string;
  institutionName: string;
  specialization?: string | null;
  startDate: string;
  endDate?: string | null;
  grade: number | string;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["education"] });
}

export function useCreateEducation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: EducationFormInput) => {
      const { data } = await apiClient.post<ApiEnvelope<EducationDetails>>("/admin/education", input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateEducation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<EducationFormInput> }) => {
      const { data } = await apiClient.put<ApiEnvelope<EducationDetails>>(`/admin/education/${id}`, input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteEducation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/education/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
