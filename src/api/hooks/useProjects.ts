import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { ApiEnvelope, PaginatedResponse, ProjectDetails } from "../types";

export function useProjectsList(page: number, pageSize = 2) {
  return useQuery({
    queryKey: ["projects", "list", page, pageSize],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<PaginatedResponse<ProjectDetails>>>("/projects", {
        params: { page, pageSize },
      });
      return data.data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useRandomProjects(count = 2) {
  return useQuery({
    queryKey: ["projects", "random", count],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<ProjectDetails[]>>("/projects/random", {
        params: { count },
      });
      return data.data;
    },
  });
}

export function useProject(id: number | string | undefined) {
  return useQuery({
    queryKey: ["projects", "detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<ProjectDetails>>(`/projects/${id}`);
      return data.data;
    },
    enabled: id !== undefined,
  });
}
