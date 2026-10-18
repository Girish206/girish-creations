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

export interface ExpenseGroupInput {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
}

export function useCreateExpenseGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    // A bare name is accepted too, for the "type a new group" pickers.
    mutationFn: async (input: ExpenseGroupInput | string) => {
      const body = typeof input === "string" ? { name: input } : input;
      const { data } = await apiClient.post<ApiEnvelope<ExpenseGroup>>("/admin/expense-groups", body);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateExpenseGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<ExpenseGroupInput> }) => {
      const { data } = await apiClient.put<ApiEnvelope<ExpenseGroup>>(`/admin/expense-groups/${id}`, input);
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

export function useSetExpenseGroupClosed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, closed }: { id: number; closed: boolean }) => {
      const { data } = await apiClient.put<ApiEnvelope<ExpenseGroup>>(`/admin/expense-groups/${id}/status`, { closed });
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export interface ExpenseGroupSettlementInput {
  amount: string;
  date: string;
  fromAdminUserId: number;
  toAdminUserId: number;
}

export function useAddExpenseGroupSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, input }: { groupId: number; input: ExpenseGroupSettlementInput }) => {
      const { data } = await apiClient.post<ApiEnvelope<ExpenseGroup>>(
        `/admin/expense-groups/${groupId}/settlements`,
        input,
      );
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteExpenseGroupSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, settlementId }: { groupId: number; settlementId: number }) => {
      await apiClient.delete(`/admin/expense-groups/${groupId}/settlements/${settlementId}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
