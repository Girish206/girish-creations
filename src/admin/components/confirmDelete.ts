import Swal from "sweetalert2";

function themeColor(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// Shared SweetAlert2 delete-confirmation dialog (a ported DMS "extra") used
// by every admin list's Delete action, themed from this app's CSS variables
// (src/admin/dms/index.css) rather than hardcoded colors.
export async function confirmDelete(itemLabel: string): Promise<boolean> {
  const result = await Swal.fire({
    title: `Delete this ${itemLabel}?`,
    text: "This can't be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: themeColor("--primary"),
    cancelButtonColor: themeColor("--muted-color"),
    confirmButtonText: "Yes, delete it",
  });
  return result.isConfirmed;
}
