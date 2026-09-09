import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, BlogPost } from "../../types";

export interface BlogFormInput {
  title: string;
  content: string;
  tags?: string | null;
  slug?: string;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["blog"] });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BlogFormInput) => {
      const { data } = await apiClient.post<ApiEnvelope<BlogPost>>("/admin/blog", input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<BlogFormInput> }) => {
      const { data } = await apiClient.put<ApiEnvelope<BlogPost>>(`/admin/blog/${id}`, input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/blog/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
