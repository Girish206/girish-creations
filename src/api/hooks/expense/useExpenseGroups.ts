import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, ExpenseGroup } from "../../types";

export function useExpenseGroups(enabled = true) {
  return useQuery({
    queryKey: ["expense-groups"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<ExpenseGroup[]>>("/admin/expense-groups");
      return data.data;
    },
    enabled,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["expense-groups"] });
  // Expense list embeds expenseGroup — refresh it too so renames/deletes show up.
  queryClient.invalidateQueries({ queryKey: ["expenses"] });
}

export function useCreateExpenseGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiClient.post<ApiEnvelope<ExpenseGroup>>("/admin/expense-groups", { name });
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateExpenseGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const { data } = await apiClient.put<ApiEnvelope<ExpenseGroup>>(`/admin/expense-groups/${id}`, { name });
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteExpenseGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/expense-groups/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
