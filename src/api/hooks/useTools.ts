import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { ApiEnvelope, Tool } from "../types";

export function useTools() {
  return useQuery({
    queryKey: ["tools"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<Tool[]>>("/tools");
      return data.data;
    },
  });
}
