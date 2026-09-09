import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, Expense } from "../../types";

export interface ExpenseFormInput {
  amount: string;
  date: string;
  description?: string | null;
  categoryId: number;
  paidByAdminUserId?: number;
  // Which savings pot this was spent from — optional.
  savingsGoalId?: number | null;
  // Ad-hoc trip/event bucket (e.g. "Goa Trip 2026") — optional.
  expenseGroupId?: number | null;
  // Members to equally split this expense among — omitted/empty means no split.
  splitAdminUserIds?: number[];
}

export function useExpenses(enabled = true) {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<Expense[]>>("/admin/expenses");
      return data.data;
    },
    enabled,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["expenses"] });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExpenseFormInput) => {
      const { data } = await apiClient.post<ApiEnvelope<Expense>>("/admin/expenses", input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<ExpenseFormInput> }) => {
      const { data } = await apiClient.put<ApiEnvelope<Expense>>(`/admin/expenses/${id}`, input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/expenses/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
