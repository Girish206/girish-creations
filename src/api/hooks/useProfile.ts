import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { usePortfolioScope } from "../../portfolio/PortfolioScope";
import type { ApiEnvelope, UserProfile } from "../types";

export function useProfile() {
  const scope = usePortfolioScope();
  return useQuery({
    queryKey: ["profile", scope?.cacheKey],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<UserProfile>>(`${scope?.apiBase}/profile`);
      return data.data;
    },
    staleTime: Infinity,
    enabled: Boolean(scope),
  });
}
