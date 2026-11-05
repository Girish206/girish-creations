import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  useDeactivateAdminUser,
  useDeleteAdminUserPermanently,
  useSendWelcomeEmail,
  useUpdateAdminUser,
} from "../../../api/hooks/expense/useAdminUsers";
import { messageFor } from "../../../api/mutationErrors";
import type { AdminUserAccount } from "../../../api/types";

function themedDialog() {
  return document.documentElement.getAttribute("data-bs-theme") === "dark" ? "dark" : "light";
}

const primaryColor = () => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();

// The owner changes any account; anyone else not another super admin's, since
// changing their password would mean signing in as them (the server enforces
// this too). Members only ever receive the accounts they manage.
export function canManageAccount(item: AdminUserAccount, admin: { sub: string; isOwner: boolean } | null) {
  if (!admin) return false;
  return admin.isOwner || !item.isSuperAdmin || String(item.id) === admin.sub;
}

// The email explains how to sign in, so it's only for someone who can.
export const canSendWelcome = (item: AdminUserAccount) => item.isActive && item.hasLogin && Boolean(item.email);

export const welcomeSentOn = (item: AdminUserAccount) =>
  item.welcomeEmailSentAt
    ? new Date(item.welcomeEmailSentAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

// Deactivate/reactivate, permanent delete and the welcome email, with their
// confirmations.
export function useAccountActions() {
  const deactivateAccount = useDeactivateAdminUser();
  const deleteAccount = useDeleteAdminUserPermanently();
  const updateAccount = useUpdateAdminUser();
  const sendWelcomeEmail = useSendWelcomeEmail();

  async function sendWelcome(item: AdminUserAccount) {
    const sentOn = welcomeSentOn(item);
    const result = await Swal.fire({
      title: `${sentOn ? "Resend" : "Send"} welcome email?`,
      text: `${sentOn ? `Last sent on ${sentOn}. ` : ""}This goes to ${item.email} and explains how to sign in. It doesn't include their password.`,
      icon: "question",
      theme: themedDialog(),
      showCancelButton: true,
      confirmButtonColor: primaryColor(),
      confirmButtonText: sentOn ? "Resend email" : "Send email",
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      // Keeps the dialog open, so a failure can say why and offer another try.
      preConfirm: async () => {
        try {
          await sendWelcomeEmail.mutateAsync(item.id);
          return true;
        } catch (error) {
          Swal.showValidationMessage(messageFor(error));
          return false;
        }
      },
    });
    if (result.isConfirmed) toast.success(`Welcome email sent to ${item.email}`);
  }

  async function toggleActive(item: AdminUserAccount) {
    if (item.isActive) {
      const result = await Swal.fire({
        title: `Deactivate ${item.name || item.email || "this account"}?`,
        text: "They won't be able to sign in or be picked for new splits. Their records stay, and you can reactivate them any time.",
        icon: "question",
        theme: themedDialog(),
        showCancelButton: true,
        confirmButtonColor: primaryColor(),
        confirmButtonText: "Deactivate",
      });
      if (result.isConfirmed) deactivateAccount.mutate(item.id);
      return;
    }
    updateAccount.mutate({ id: item.id, input: { isActive: true } });
  }

  // Resolves to whether it was deleted, so a details view can close itself.
  async function deletePermanently(item: AdminUserAccount): Promise<boolean> {
    const result = await Swal.fire({
      title: `Delete ${item.name || item.email || "this account"} permanently?`,
      text: "They have no expenses or savings records, so the account can be removed completely. This can't be undone.",
      icon: "warning",
      theme: themedDialog(),
      showCancelButton: true,
      confirmButtonColor: primaryColor(),
      confirmButtonText: "Delete permanently",
    });
    if (!result.isConfirmed) return false;
    await deleteAccount.mutateAsync(item.id);
    return true;
  }

  return { sendWelcome, toggleActive, deletePermanently };
}
