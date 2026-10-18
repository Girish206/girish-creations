import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { usePortfolioScope } from "../../portfolio/PortfolioScope";
import type { ApiEnvelope, EducationDetails } from "../types";

export function useEducation() {
  const scope = usePortfolioScope();
  return useQuery({
    queryKey: ["education", scope?.cacheKey],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<EducationDetails[]>>(`${scope?.apiBase}/education`);
      return data.data;
    },
    enabled: Boolean(scope),
  });
}
