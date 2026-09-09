import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { ApiEnvelope, ContactMessage } from "../types";

export interface ContactFormInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export function useSubmitContactMessage() {
  return useMutation({
    mutationFn: async (input: ContactFormInput) => {
      const { data } = await apiClient.post<ApiEnvelope<ContactMessage>>("/contact", input);
      return data.data;
    },
  });
}
