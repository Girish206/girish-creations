import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient, getAdminToken, hasRefreshToken, onSessionRefreshed, refreshSession, setAdminToken } from "../api/client";
import { setPortfolioTarget } from "../portfolio/adminPortfolioTarget";
import type { ApiEnvelope } from "../api/types";

interface AdminIdentity {
  sub: string;
  // Null for an account that signs in with its mobile number.
  email: string | null;
  name: string | null;
  isOwner: boolean;
  // Sees every account's data in the admin panel (the owner always does).
  isSuperAdmin: boolean;
  hasPortfolioAccess: boolean;
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
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

function decodeTokenPayload(token: string) {
  // JWT segments are base64url ("-"/"_", no padding); atob() only accepts
  // standard base64 and throws on those characters.
  const segment = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(segment.padEnd(Math.ceil(segment.length / 4) * 4, "=")));
}

// Refresh on open only when the access token is this close to running out.
const REFRESH_AHEAD_MS = 10 * 60_000;

// True when the token has expired, is about to, or can't be read.
function tokenNeedsRefresh(token: string) {
  try {
    const { exp } = decodeTokenPayload(token);
    return typeof exp !== "number" || exp * 1000 - Date.now() < REFRESH_AHEAD_MS;
  } catch {
    return true;
  }
}

function decodeAdminFromToken(token: string): AdminIdentity | null {
  try {
    const payload = decodeTokenPayload(token);
    return {
      sub: payload.sub,
      email: payload.email ?? null,
      name: payload.name ?? null,
      isOwner: Boolean(payload.isOwner),
      isSuperAdmin: Boolean(payload.isSuperAdmin || payload.isOwner),
      hasPortfolioAccess: Boolean(payload.hasPortfolioAccess),
    };
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [admin, setAdmin] = useState<AdminIdentity | null>(() => {
    const token = getAdminToken();
    return token ? decodeAdminFromToken(token) : null;
  });
  const [mainBg, setMainBgState] = useState(() => localStorage.getItem("admin_mainBg") || "bg-light");

  // Every refresh (on open, or when an expired token gets a 401) brings a token
  // with what the account can do now, so the menus follow along.
  useEffect(
    () =>
      onSessionRefreshed((token) => {
        const identity = decodeAdminFromToken(token);
        if (!identity?.isSuperAdmin) setPortfolioTarget(null);
        setAdmin(identity);
      }),
    [],
  );

  // On open, reuse a token that still has a while to run; refresh only one
  // that has run out or is about to, so the first screen's data doesn't each
  // hit a 401 first. Calls that do get a 401 later refresh then (api/client).
  // A session from before refresh tokens refreshes now, while its token still
  // works, to get one. Only a refused refresh signs out.
  useEffect(() => {
    const token = getAdminToken();
    if (!token || !window.location.pathname.startsWith("/admin")) return;
    if (hasRefreshToken() && !tokenNeedsRefresh(token)) return;
    refreshSession().catch(() => {
      // Offline, a server hiccup, or a session that has ended — the next
      // request deals with it.
    });
  }, []);

  function setMainBg(bg: string) {
    localStorage.setItem("admin_mainBg", bg);
    setMainBgState(bg);
  }

  function startSession({ token, refreshToken }: { token: string; refreshToken?: string }) {
    // Same source as a page reload: the response's `admin` carries `id`, not
    // the `sub` the rest of the app reads.
    const identity = decodeAdminFromToken(token);
    // An account without portfolio access has nothing to open here.
    if (identity && !identity.hasPortfolioAccess) {
      throw new NoAdminModuleError();
    }
    setAdminToken(token, refreshToken);
    // Admin data (own portfolio, contact messages, ...) is per account.
    setPortfolioTarget(null);
    queryClient.clear();
    setAdmin(identity);
  }

  async function login(identifier: string, password: string) {
    const { data } = await apiClient.post<ApiEnvelope<{ token: string; refreshToken?: string }>>(
      "/admin/auth/login",
      { email: identifier, password },
    );
    startSession(data.data);
  }

  async function loginWithCode(identifier: string, code: string) {
    const { data } = await apiClient.post<ApiEnvelope<{ token: string; refreshToken?: string }>>(
      "/admin/auth/otp/login",
      { email: identifier, code },
    );
    startSession(data.data);
  }

  async function resetPassword(identifier: string, code: string, newPassword: string) {
    const { data } = await apiClient.post<ApiEnvelope<{ token: string; refreshToken?: string }>>(
      "/admin/auth/password/reset",
      { email: identifier, code, newPassword },
    );
    startSession(data.data);
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
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

// Signed in fine, but the account has no portfolio access.
export class NoAdminModuleError extends Error {
  constructor() {
    super("This account has no access to the Girish Creations admin. Ask an administrator for access.");
  }
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}
