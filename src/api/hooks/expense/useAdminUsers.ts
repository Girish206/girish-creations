import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { AdminUserAccount, ApiEnvelope } from "../../types";

export interface AdminUserCreateInput {
  // Omit both for a guest member (listed in pickers, can't log in).
  email?: string | null;
  // Digits only; also a sign-in.
  mobile?: string | null;
  password?: string | null;
  name?: string | null;
  hasPortfolioAccess: boolean;
  hasExpensesAccess: boolean;
  hasSavingsAccess: boolean;
  // Only the owner may send this.
  isSuperAdmin?: boolean;
}

export interface AdminUserUpdateInput {
  name?: string | null;
  // Set together to grant a guest login access, or to change an existing
  // login member's email.
  email?: string;
  // null clears it.
  mobile?: string | null;
  password?: string;
  // Back to a guest: password cleared, email kept.
  removeLogin?: boolean;
  isActive?: boolean;
  hasPortfolioAccess?: boolean;
  hasExpensesAccess?: boolean;
  hasSavingsAccess?: boolean;
  // Only the owner may send this.
  isSuperAdmin?: boolean;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<AdminUserAccount[]>>("/admin/admin-users");
      return data.data;
    },
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin-users"] });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminUserCreateInput) => {
      const { data } = await apiClient.post<ApiEnvelope<AdminUserAccount>>("/admin/admin-users", input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: AdminUserUpdateInput }) => {
      const { data } = await apiClient.put<ApiEnvelope<AdminUserAccount>>(`/admin/admin-users/${id}`, input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeactivateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/admin-users/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}

// Removes the account entirely — the server only allows it when nothing
// (expenses, savings, splits…) points at this person.
export function useDeleteAdminUserPermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/admin-users/${id}`, { params: { permanent: true } });
    },
    onSuccess: () => invalidate(queryClient),
  });
}
