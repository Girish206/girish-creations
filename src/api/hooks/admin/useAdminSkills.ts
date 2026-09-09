import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, ProficiencyLevel, Skill } from "../../types";

export interface SkillFormInput {
  skillName: string;
  proficiencyLevel: ProficiencyLevel;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["skills"] });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SkillFormInput) => {
      const { data } = await apiClient.post<ApiEnvelope<Skill>>("/admin/skills", input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<SkillFormInput> }) => {
      const { data } = await apiClient.put<ApiEnvelope<Skill>>(`/admin/skills/${id}`, input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/skills/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
