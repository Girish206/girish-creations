import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ActivityEntry, ApiEnvelope } from "../../types";

// One record's history, or a page's: "expenses", "savings", or "daily"
// (repayments on daily splits).
export interface ActivityFilter {
  expenseId?: number;
  expenseGroupId?: number;
  savingsGoalId?: number;
  area?: "expenses" | "savings" | "daily";
}

// Limited by the server to what each person may see.
export function useExpenseActivity(filter: ActivityFilter, enabled = true) {
  return useQuery({
    queryKey: ["expense-activity", filter],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<ActivityEntry[]>>("/admin/expense-activity", {
        params: filter,
      });
      return data.data;
    },
    enabled,
  });
}
