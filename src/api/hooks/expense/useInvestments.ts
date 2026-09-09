import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, Investment } from "../../types";

export interface InvestmentFormInput {
  title: string;
  type: string;
  amountInvested: string;
  currentValue?: string | null;
  date: string;
  notes?: string | null;
  investedByAdminUserId?: number;
}

export function useInvestments(enabled = true) {
  return useQuery({
    queryKey: ["investments"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<Investment[]>>("/admin/investments");
      return data.data;
    },
    enabled,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["investments"] });
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvestmentFormInput) => {
      const { data } = await apiClient.post<ApiEnvelope<Investment>>("/admin/investments", input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<InvestmentFormInput> }) => {
      const { data } = await apiClient.put<ApiEnvelope<Investment>>(`/admin/investments/${id}`, input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/investments/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
