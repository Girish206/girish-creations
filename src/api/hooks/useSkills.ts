import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { ApiEnvelope, ProficiencyLevel, Skill } from "../types";

export interface UseSkillsOptions {
  levels?: ProficiencyLevel[];
  random?: number;
}

export function useSkills(options: UseSkillsOptions = {}) {
  const { levels, random } = options;
  return useQuery({
    queryKey: ["skills", levels, random],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (levels?.length) params.level = levels.join(",");
      if (random) params.random = random;
      const { data } = await apiClient.get<ApiEnvelope<Skill[]>>("/skills", { params });
      return data.data;
    },
  });
}
