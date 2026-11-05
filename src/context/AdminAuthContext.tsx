import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient, getAdminToken, setAdminToken } from "../api/client";
import { setPortfolioTarget } from "../portfolio/adminPortfolioTarget";
import type { ApiEnvelope } from "../api/types";

// Top-level shell switch (Portfolio vs. the whole Expense Tracker). Which
// *sections* of the Expense Tracker a given account can see (Expenses/
// Savings) is a separate, more granular concern — see
// hasExpensesAccess/hasSavingsAccess below and
// AdminSubModule in ProtectedRoute.tsx.
export type AdminModule = "portfolio" | "expense";

interface AdminIdentity {
  sub: string;
  // Null for an account that signs in with its mobile number.
  email: string | null;
  name: string | null;
  isOwner: boolean;
  // Sees every account's data in the admin panel (the owner always does).
  isSuperAdmin: boolean;
  hasPortfolioAccess: boolean;
  hasExpensesAccess: boolean;
  hasSavingsAccess: boolean;
}

interface AdminAuthContextValue {
  isAuthenticated: boolean;
  admin: AdminIdentity | null;
  // `identifier` is an email address or a mobile number.
  login: (identifier: string, password: string) => Promise<void>;
  // Sign in with a code emailed to the account.
  loginWithCode: (identifier: string, code: string) => Promise<void>;
  // Sets a new password using a code emailed to the account, and signs in.
  resetPassword: (identifier: string, code: string, newPassword: string) => Promise<void>;
  logout: () => void;
  // Ported from the reference DMS app's AuthContext: a user-selectable
  // background tint for the admin shell (swatches live in the Navbar's
  // profile sidebar). Fully functional here — genuinely just local
  // preference state, no backend concept needed.
  mainBg: string;
  setMainBg: (bg: string) => void;
  // Which of the two admin modules (portfolio content vs. expense/
  // savings tracker) is currently shown — drives which
  // Sidebar menu + dashboard renders. Defaults to whichever module the
  // account has access to; if it has both, remembers the last choice.
  activeModule: AdminModule;
  setActiveModule: (module: AdminModule) => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

function hasAnyExpenseAccess(admin: Pick<AdminIdentity, "hasExpensesAccess" | "hasSavingsAccess">): boolean {
  return admin.hasExpensesAccess || admin.hasSavingsAccess;
}

function decodeAdminFromToken(token: string): AdminIdentity | null {
  try {
    // JWT segments are base64url ("-"/"_", no padding); atob() only accepts
    // standard base64 and throws on those characters.
    const segment = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(segment.padEnd(Math.ceil(segment.length / 4) * 4, "=")));
    return {
      sub: payload.sub,
      email: payload.email ?? null,
      name: payload.name ?? null,
      isOwner: Boolean(payload.isOwner),
      isSuperAdmin: Boolean(payload.isSuperAdmin || payload.isOwner),
      hasPortfolioAccess: Boolean(payload.hasPortfolioAccess),
      hasExpensesAccess: Boolean(payload.hasExpensesAccess),
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
  const queryClient = useQueryClient();
  const [admin, setAdmin] = useState<AdminIdentity | null>(() => {
    const token = getAdminToken();
    return token ? decodeAdminFromToken(token) : null;
  });
  const [mainBg, setMainBgState] = useState(() => localStorage.getItem("admin_mainBg") || "bg-light");
  const [activeModule, setActiveModuleState] = useState<AdminModule>(() => defaultModuleFor(admin));

  // The token holds what the account could do when it was issued, so the menus
  // catch up with any change when the admin opens. The server checks every
  // request regardless; an ended session gets a 401, which goes to the login page.
  useEffect(() => {
    const token = getAdminToken();
    if (!token || !window.location.pathname.startsWith("/admin")) return;
    apiClient
      .post<ApiEnvelope<{ token: string }>>("/admin/auth/refresh")
      .then(({ data }) => {
        // They signed out or in as someone else while this was on its way.
        if (getAdminToken() !== token) return;
        const identity = decodeAdminFromToken(data.data.token);
        setAdminToken(data.data.token);
        if (!identity?.isSuperAdmin) setPortfolioTarget(null);
        setAdmin(identity);
        setActiveModuleState(defaultModuleFor(identity));
      })
      .catch(() => {
        // Offline or a server hiccup: carry on with what we have.
      });
  }, []);

  function setMainBg(bg: string) {
    localStorage.setItem("admin_mainBg", bg);
    setMainBgState(bg);
  }

  function setActiveModule(module: AdminModule) {
    localStorage.setItem("admin_activeModule", module);
    setActiveModuleState(module);
  }

  function startSession(token: string) {
    // Same source as a page reload: the response's `admin` carries `id`, not
    // the `sub` the rest of the app reads.
    const identity = decodeAdminFromToken(token);
    // A cricket-only (CrickVerse) account has nothing to open here.
    if (identity && !identity.hasPortfolioAccess && !hasAnyExpenseAccess(identity)) {
      throw new NoAdminModuleError();
    }
    setAdminToken(token);
    // Admin data (own portfolio, contact messages, ...) is per account.
    setPortfolioTarget(null);
    queryClient.clear();
    setAdmin(identity);
    setActiveModuleState(defaultModuleFor(identity));
  }

  async function login(identifier: string, password: string) {
    const { data } = await apiClient.post<ApiEnvelope<{ token: string }>>(
      "/admin/auth/login",
      { app: "admin", email: identifier, password },
    );
    startSession(data.data.token);
  }

  async function loginWithCode(identifier: string, code: string) {
    const { data } = await apiClient.post<ApiEnvelope<{ token: string }>>(
      "/admin/auth/otp/login",
      { app: "admin", email: identifier, code },
    );
    startSession(data.data.token);
  }

  async function resetPassword(identifier: string, code: string, newPassword: string) {
    const { data } = await apiClient.post<ApiEnvelope<{ token: string }>>(
      "/admin/auth/password/reset",
      { app: "admin", email: identifier, code, newPassword },
    );
    startSession(data.data.token);
  }

  function logout() {
    setAdminToken(null);
    setPortfolioTarget(null);
    queryClient.clear();
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated: admin !== null,
        admin,
        login,
        loginWithCode,
        resetPassword,
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

// Signed in fine, but the account has neither portfolio nor expense access.
export class NoAdminModuleError extends Error {
  constructor() {
    super("This account has no access to the Girish Creations admin. Cricket players sign in to CrickVerse instead.");
  }
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}
