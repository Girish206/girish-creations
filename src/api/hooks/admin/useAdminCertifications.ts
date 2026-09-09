import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, CertificationDetails } from "../../types";

export interface CertificationFormInput {
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate?: string | null;
  credentialId?: string | null;
  credentialUrl?: string | null;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["certifications"] });
}

export function useCreateCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CertificationFormInput) => {
      const { data } = await apiClient.post<ApiEnvelope<CertificationDetails>>("/admin/certifications", input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<CertificationFormInput> }) => {
      const { data } = await apiClient.put<ApiEnvelope<CertificationDetails>>(`/admin/certifications/${id}`, input);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/certifications/${id}`);
    },
    onSuccess: () => invalidate(queryClient),
  });
}
