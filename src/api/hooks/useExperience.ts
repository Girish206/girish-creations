import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { ApiEnvelope, ExperienceDetails } from "../types";

export function useExperience() {
  return useQuery({
    queryKey: ["experience"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<ExperienceDetails[]>>("/experience");
      return data.data;
    },
  });
}
