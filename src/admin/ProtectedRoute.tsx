import { Navigate, Outlet } from "react-router-dom";
import { useAdminAuth, type AdminModule } from "../context/AdminAuthContext";

export function ProtectedRoute() {
  const { isAuthenticated } = useAdminAuth();
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}

function hasAnyExpenseAccess(admin: ReturnType<typeof useAdminAuth>["admin"]): boolean {
  return Boolean(admin?.hasExpensesAccess || admin?.hasInvestmentsAccess || admin?.hasSavingsAccess);
}

// Wraps a top-level module's route tree (Portfolio vs. the whole Expense
// Tracker), nested under ProtectedRoute so the admin is already known to be
// authenticated here. Redirects to whichever module the account DOES have
// access to, rather than showing a dead end.
export function RequireModuleAccess({ module }: { module: AdminModule }) {
  const { admin } = useAdminAuth();
  const hasAccess = module === "portfolio" ? admin?.hasPortfolioAccess : hasAnyExpenseAccess(admin);

  if (!hasAccess) {
    if (admin?.hasPortfolioAccess) return <Navigate to="/admin" replace />;
    if (hasAnyExpenseAccess(admin)) return <Navigate to="/admin/expense" replace />;
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

export type AdminSubModule = "expenses" | "investments" | "savings";

function firstAccessibleExpensePath(admin: ReturnType<typeof useAdminAuth>["admin"]): string {
  if (admin?.hasExpensesAccess) return "/admin/expense/expenses";
  if (admin?.hasInvestmentsAccess) return "/admin/expense/investments";
  if (admin?.hasSavingsAccess) return "/admin/expense/savings";
  return "/admin/expense";
}

// Wraps one section *within* the Expense Tracker (Expenses/Categories,
// Investments, or Savings) — independent per-section access, since one
// member might have Savings only while another has Expenses only.
export function RequireSubModuleAccess({ subModule }: { subModule: AdminSubModule }) {
  const { admin } = useAdminAuth();
  const hasAccess =
    subModule === "expenses"
      ? admin?.hasExpensesAccess
      : subModule === "investments"
        ? admin?.hasInvestmentsAccess
        : admin?.hasSavingsAccess;

  if (!hasAccess) {
    return <Navigate to={firstAccessibleExpensePath(admin)} replace />;
  }

  return <Outlet />;
}
