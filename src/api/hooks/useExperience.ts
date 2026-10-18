import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { usePortfolioScope } from "../../portfolio/PortfolioScope";
import type { ApiEnvelope, ExperienceDetails } from "../types";

export function useExperience() {
  const scope = usePortfolioScope();
  return useQuery({
    queryKey: ["experience", scope?.cacheKey],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<ExperienceDetails[]>>(`${scope?.apiBase}/experience`);
      return data.data;
    },
    enabled: Boolean(scope),
  });
}
