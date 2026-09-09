import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { ApiEnvelope, CertificationDetails } from "../types";

export function useCertifications() {
  return useQuery({
    queryKey: ["certifications"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<CertificationDetails[]>>("/certifications");
      return data.data;
    },
  });
}
