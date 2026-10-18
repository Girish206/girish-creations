import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, CategoryIconType, ExpenseCategory } from "../../types";

export interface ExpenseCategoryInput {
  name: string;
  iconType: CategoryIconType;
  icon: string;
  // New image to upload when iconType is "image".
  imageFile?: File | null;
}

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
  // Expenses embed their category, so its icon shows there too.
  queryClient.invalidateQueries({ queryKey: ["expenses"] });
}

function toFormData({ imageFile, ...rest }: ExpenseCategoryInput) {
  const formData = new FormData();
  Object.entries(rest).forEach(([key, value]) => formData.append(key, value));
  if (imageFile) formData.append("image", imageFile);
  return formData;
}

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExpenseCategoryInput) => {
      const { data } = await apiClient.post<ApiEnvelope<ExpenseCategory>>(
        "/admin/expense-categories",
        toFormData(input),
        multipart,
      );
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ExpenseCategoryInput & { id: number }) => {
      const { data } = await apiClient.put<ApiEnvelope<ExpenseCategory>>(
        `/admin/expense-categories/${id}`,
        toFormData(input),
        multipart,
      );
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
