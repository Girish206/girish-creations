import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { usePortfolioScope } from "../../portfolio/PortfolioScope";
import type { ApiEnvelope, BlogPost, PaginatedResponse } from "../types";

export function useBlogList(page: number, pageSize = 10) {
  const scope = usePortfolioScope();
  return useQuery({
    queryKey: ["blog", scope?.cacheKey, "list", page, pageSize],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<PaginatedResponse<BlogPost>>>(`${scope?.apiBase}/blog`, {
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

export function useBlogPost(slug: string | undefined) {
  const scope = usePortfolioScope();
  return useQuery({
    queryKey: ["blog", scope?.cacheKey, "detail", slug],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<BlogPost>>(`${scope?.apiBase}/blog/${slug}`);
      return data.data;
    },
    enabled: Boolean(scope) && Boolean(slug),
  });
}
