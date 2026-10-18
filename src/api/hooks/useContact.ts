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
    // ContactForm shows its own inline error message.
    meta: { skipGlobalError: true },
    mutationFn: async (input: ContactFormInput) => {
      const { data } = await apiClient.post<ApiEnvelope<ContactMessage>>("/contact", input);
      return data.data;
    },
  });
}
