import { createContext, useContext, useState, type ReactNode } from "react";
import { apiClient, getAdminToken, setAdminToken } from "../api/client";
import type { ApiEnvelope } from "../api/types";

// Top-level shell switch (Portfolio vs. the whole Expense Tracker). Which
// *sections* of the Expense Tracker a given account can see (Expenses/
// Investments/Savings) is a separate, more granular concern — see
// hasExpensesAccess/hasInvestmentsAccess/hasSavingsAccess below and
// AdminSubModule in ProtectedRoute.tsx.
export type AdminModule = "portfolio" | "expense";

interface AdminIdentity {
  sub: string;
  email: string;
  name: string | null;
  isOwner: boolean;
  hasPortfolioAccess: boolean;
  hasExpensesAccess: boolean;
  hasInvestmentsAccess: boolean;
  hasSavingsAccess: boolean;
}

interface AdminAuthContextValue {
  isAuthenticated: boolean;
  admin: AdminIdentity | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  // Ported from the reference DMS app's AuthContext: a user-selectable
  // background tint for the admin shell (swatches live in the Navbar's
  // profile sidebar). Fully functional here — genuinely just local
  // preference state, no backend concept needed.
  mainBg: string;
  setMainBg: (bg: string) => void;
  // Which of the two admin modules (portfolio content vs. expense/
  // investment/savings tracker) is currently shown — drives which
  // Sidebar menu + dashboard renders. Defaults to whichever module the
  // account has access to; if it has both, remembers the last choice.
  activeModule: AdminModule;
  setActiveModule: (module: AdminModule) => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

function hasAnyExpenseAccess(admin: Pick<AdminIdentity, "hasExpensesAccess" | "hasInvestmentsAccess" | "hasSavingsAccess">): boolean {
  return admin.hasExpensesAccess || admin.hasInvestmentsAccess || admin.hasSavingsAccess;
}

function decodeAdminFromToken(token: string): AdminIdentity | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      isOwner: Boolean(payload.isOwner),
      hasPortfolioAccess: Boolean(payload.hasPortfolioAccess),
      hasExpensesAccess: Boolean(payload.hasExpensesAccess),
      hasInvestmentsAccess: Boolean(payload.hasInvestmentsAccess),
      hasSavingsAccess: Boolean(payload.hasSavingsAccess),
    };
  } catch {
    return null;
  }
}

function defaultModuleFor(admin: AdminIdentity | null): AdminModule {
  if (!admin) return "portfolio";
  const stored = localStorage.getItem("admin_activeModule");
  if ((stored === "portfolio" || stored === "expense") && admin.hasPortfolioAccess && hasAnyExpenseAccess(admin)) {
    return stored;
  }
  if (admin.hasPortfolioAccess) return "portfolio";
  if (hasAnyExpenseAccess(admin)) return "expense";
  return "portfolio";
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminIdentity | null>(() => {
    const token = getAdminToken();
    return token ? decodeAdminFromToken(token) : null;
  });
  const [mainBg, setMainBgState] = useState(() => localStorage.getItem("admin_mainBg") || "bg-light");
  const [activeModule, setActiveModuleState] = useState<AdminModule>(() => defaultModuleFor(admin));

  function setMainBg(bg: string) {
    localStorage.setItem("admin_mainBg", bg);
    setMainBgState(bg);
  }

  function setActiveModule(module: AdminModule) {
    localStorage.setItem("admin_activeModule", module);
    setActiveModuleState(module);
  }

  async function login(email: string, password: string) {
    const { data } = await apiClient.post<ApiEnvelope<{ token: string; admin: AdminIdentity }>>(
      "/admin/auth/login",
      { email, password },
    );
    setAdminToken(data.data.token);
    setAdmin(data.data.admin);
    setActiveModuleState(defaultModuleFor(data.data.admin));
  }

  function logout() {
    setAdminToken(null);
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated: admin !== null,
        admin,
        login,
        logout,
        mainBg,
        setMainBg,
        activeModule,
        setActiveModule,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}
