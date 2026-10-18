import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../client";
import type { ApiEnvelope, UserProfile } from "../../types";

export interface ProfileFormInput {
  username?: string;
  fullName: string;
  email: string;
  bio?: string | null;
  objective?: string | null;
  contactNumber?: string | null;
  address?: string | null;
  facebookId?: string | null;
  instaId?: string | null;
  linkedinId?: string | null;
  twitterId?: string | null;
  profilePictureFile?: File | null;
  signatureFile?: File | null;
  // Ignored if signatureFile is also set — the new upload wins.
  removeSignature?: boolean;
  resumeFile?: File | null;
  // Same rule as removeSignature, for the résumé PDF.
  removeResume?: boolean;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileFormInput) => {
      const formData = new FormData();
      const { profilePictureFile, signatureFile, removeSignature, resumeFile, removeResume, ...rest } = input;
      Object.entries(rest).forEach(([key, value]) => {
        formData.append(key, value ?? "");
      });
      if (profilePictureFile) formData.append("profilePicture", profilePictureFile);
      if (signatureFile) formData.append("signature", signatureFile);
      if (removeSignature) formData.append("removeSignature", "true");
      if (resumeFile) formData.append("resume", resumeFile);
      if (removeResume) formData.append("removeResume", "true");

      const { data } = await apiClient.put<ApiEnvelope<UserProfile>>("/admin/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Name, photo and username all show in the public directory.
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });
}
