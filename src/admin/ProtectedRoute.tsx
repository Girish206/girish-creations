import { Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

export function ProtectedRoute() {
  const { isAuthenticated } = useAdminAuth();
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}

// Wraps the admin route tree, nested under ProtectedRoute so the admin is
// already known to be authenticated here.
export function RequirePortfolioAccess() {
  const { admin } = useAdminAuth();
  if (!admin?.hasPortfolioAccess) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}
