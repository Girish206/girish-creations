import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { usePortfolioScope } from "../../portfolio/PortfolioScope";
import type { ApiEnvelope, CertificationDetails } from "../types";

export function useCertifications() {
  const scope = usePortfolioScope();
  return useQuery({
    queryKey: ["certifications", scope?.cacheKey],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<CertificationDetails[]>>(`${scope?.apiBase}/certifications`);
      return data.data;
    },
    enabled: Boolean(scope),
  });
}
