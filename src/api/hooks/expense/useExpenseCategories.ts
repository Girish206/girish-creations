import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, ExpenseCategory } from "../../types";

export function useExpenseCategories(enabled = true) {
  return useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<ExpenseCategory[]>>("/admin/expense-categories");
      return data.data;
    },
    enabled,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiClient.post<ApiEnvelope<ExpenseCategory>>("/admin/expense-categories", { name });
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const { data } = await apiClient.put<ApiEnvelope<ExpenseCategory>>(`/admin/expense-categories/${id}`, {
        name,
      });
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/expense-categories/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
