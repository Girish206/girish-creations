import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { ApiEnvelope, BlogPost, PaginatedResponse } from "../types";

export function useBlogList(page: number, pageSize = 10) {
  return useQuery({
    queryKey: ["blog", "list", page, pageSize],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<PaginatedResponse<BlogPost>>>("/blog", {
        params: { page, pageSize },
      });
      return data.data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useBlogPost(slug: string | undefined) {
  return useQuery({
    queryKey: ["blog", "detail", slug],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<BlogPost>>(`/blog/${slug}`);
      return data.data;
    },
    enabled: Boolean(slug),
  });
}
