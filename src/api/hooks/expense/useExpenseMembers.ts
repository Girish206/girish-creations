import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, AdminUserRef } from "../../types";

// Minimal member list (id/email/name) for "who" pickers — savings account
// holder, expense split participants — available to any expense-module
// member, not just the owner (unlike /admin/admin-users).
export function useExpenseMembers() {
  return useQuery({
    queryKey: ["expense-members"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<AdminUserRef[]>>("/admin/expense-members");
      return data.data;
    },
  });
}
