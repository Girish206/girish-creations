import { Toaster } from "sonner";
import { useIsAdminDark } from "../admin/useAdminTheme";

// The one place toasts appear, following the admin's light/dark choice rather
// than the device's. Only admin screens show toasts.
export function AppToaster() {
  const isDark = useIsAdminDark();
  return <Toaster position="top-right" theme={isDark ? "dark" : "light"} richColors closeButton />;
}
