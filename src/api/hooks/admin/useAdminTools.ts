import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, Tool } from "../../types";

export interface ToolFormInput {
  toolName: string;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["tools"] });
}

export function useCreateTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ToolFormInput) => {
      const { data } = await apiClient.post<ApiEnvelope<Tool>>("/admin/tools", input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<ToolFormInput> }) => {
      const { data } = await apiClient.put<ApiEnvelope<Tool>>(`/admin/tools/${id}`, input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/tools/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
