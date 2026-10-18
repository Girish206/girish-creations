import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { usePortfolioScope } from "../../portfolio/PortfolioScope";
import type { ApiEnvelope, PaginatedResponse, ProjectDetails } from "../types";

export function useProjectsList(page: number, pageSize = 2) {
  const scope = usePortfolioScope();
  return useQuery({
    queryKey: ["projects", scope?.cacheKey, "list", page, pageSize],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<PaginatedResponse<ProjectDetails>>>(`${scope?.apiBase}/projects`, {
        params: { page, pageSize },
      });
      return data.data;
    },
    // Keep the last page on screen while paging, but never another portfolio's.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === scope?.cacheKey ? previous : undefined,
    enabled: Boolean(scope),
  });
}

export function useRandomProjects(count = 2) {
  const scope = usePortfolioScope();
  return useQuery({
    queryKey: ["projects", scope?.cacheKey, "random", count],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<ProjectDetails[]>>(`${scope?.apiBase}/projects/random`, {
        params: { count },
      });
      return data.data;
    },
    enabled: Boolean(scope),
  });
}

export function useProject(id: number | string | undefined) {
  const scope = usePortfolioScope();
  return useQuery({
    queryKey: ["projects", scope?.cacheKey, "detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<ProjectDetails>>(`${scope?.apiBase}/projects/${id}`);
      return data.data;
    },
    enabled: Boolean(scope) && id !== undefined,
  });
}
