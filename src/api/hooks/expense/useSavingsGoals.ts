import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, SavingsGoal } from "../../types";

export interface SavingsGoalFormInput {
  name: string;
  // Omitted/null = open-ended goal, no fixed target.
  targetAmount?: string | null;
  targetDate?: string | null;
  bankName?: string | null;
  accountHolderAdminUserId?: number | null;
  // Who can see/use this goal — omitted/empty means everyone with access.
  memberAdminUserIds?: number[];
}

export interface SavingsContributionFormInput {
  amount: string;
  date: string;
  contributedByAdminUserId?: number;
}

export function useSavingsGoals(enabled = true) {
  return useQuery({
    queryKey: ["savings-goals"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<SavingsGoal[]>>("/admin/savings-goals");
      return data.data;
    },
    enabled,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SavingsGoalFormInput) => {
      const { data } = await apiClient.post<ApiEnvelope<SavingsGoal>>("/admin/savings-goals", input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<SavingsGoalFormInput> }) => {
      const { data } = await apiClient.put<ApiEnvelope<SavingsGoal>>(`/admin/savings-goals/${id}`, input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/savings-goals/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useAddSavingsContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, input }: { goalId: number; input: SavingsContributionFormInput }) => {
      const { data } = await apiClient.post<ApiEnvelope<SavingsGoal>>(
        `/admin/savings-goals/${goalId}/contributions`,
        input,
      );
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteSavingsContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, contributionId }: { goalId: number; contributionId: number }) => {
      await apiClient.delete(`/admin/savings-goals/${goalId}/contributions/${contributionId}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
