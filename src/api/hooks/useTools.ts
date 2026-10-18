import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { usePortfolioScope } from "../../portfolio/PortfolioScope";
import type { ApiEnvelope, Tool } from "../types";

export function useTools() {
  const scope = usePortfolioScope();
  return useQuery({
    queryKey: ["tools", scope?.cacheKey],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<Tool[]>>(`${scope?.apiBase}/tools`);
      return data.data;
    },
    enabled: Boolean(scope),
  });
}
