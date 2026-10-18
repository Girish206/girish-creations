import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { usePortfolioScope } from "../../portfolio/PortfolioScope";
import type { ApiEnvelope, ProficiencyLevel, Skill } from "../types";

export interface UseSkillsOptions {
  levels?: ProficiencyLevel[];
  random?: number;
}

export function useSkills(options: UseSkillsOptions = {}) {
  const scope = usePortfolioScope();
  const { levels, random } = options;
  return useQuery({
    queryKey: ["skills", scope?.cacheKey, levels, random],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (levels?.length) params.level = levels.join(",");
      if (random) params.random = random;
      const { data } = await apiClient.get<ApiEnvelope<Skill[]>>(`${scope?.apiBase}/skills`, { params });
      return data.data;
    },
    enabled: Boolean(scope),
  });
}
