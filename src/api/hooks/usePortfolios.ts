import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { ApiEnvelope, PortfolioSummary } from "../types";

// Everyone with a public portfolio, for the home page directory.
export function usePortfolios() {
  return useQuery({
    queryKey: ["portfolios"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<PortfolioSummary[]>>("/portfolios");
      return data.data;
    },
  });
}
