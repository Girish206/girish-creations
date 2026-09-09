import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { ApiEnvelope, UserProfile } from "../types";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<UserProfile>>("/profile");
      return data.data;
    },
    staleTime: Infinity,
  });
}
