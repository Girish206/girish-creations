import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, ProjectDetails } from "../../types";

export interface ProjectFormInput {
  title: string;
  description: string;
  technologiesUsed: string;
  projectUrl?: string | null;
  startDate: string;
  endDate?: string | null;
  imageFile?: File | null;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["projects"] });
}

function toFormData(input: ProjectFormInput) {
  const formData = new FormData();
  const { imageFile, ...rest } = input;
  Object.entries(rest).forEach(([key, value]) => {
    formData.append(key, value ?? "");
  });
  if (imageFile) formData.append("image", imageFile);
  return formData;
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectFormInput) => {
      const { data } = await apiClient.post<ApiEnvelope<ProjectDetails>>("/admin/projects", toFormData(input), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<ProjectFormInput> }) => {
      const { data } = await apiClient.put<ApiEnvelope<ProjectDetails>>(`/admin/projects/${id}`, toFormData(input as ProjectFormInput), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/projects/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
