import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { ApiEnvelope, EducationDetails } from "../types";

export function useEducation() {
  return useQuery({
    queryKey: ["education"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<EducationDetails[]>>("/education");
      return data.data;
    },
  });
}
