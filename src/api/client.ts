import axios, { type InternalAxiosRequestConfig } from "axios";
import { getPortfolioTarget } from "../portfolio/adminPortfolioTarget";

export const apiClient = axios.create({
  baseURL: "/api",
});

const ADMIN_TOKEN_KEY = "portfolio_admin_token";
const ADMIN_REFRESH_TOKEN_KEY = "portfolio_admin_refresh_token";

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

// Sessions from before refresh tokens have none until their next refresh.
export function hasRefreshToken() {
  return localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY) !== null;
}

// Stores the access token, and the refresh token when one is given. Null
// clears both (signing out).
export function setAdminToken(token: string | null, refreshToken?: string | null) {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
  }
}

// Told about every new access token a refresh brings, so the signed-in
// identity (name, access) follows along.
const refreshListeners = new Set<(token: string) => void>();
export function onSessionRefreshed(listener: (token: string) => void) {
  refreshListeners.add(listener);
  return () => void refreshListeners.delete(listener);
}

// Thrown by refreshSession when the session is really over (the server said
// 401), as opposed to being offline.
export class SessionEndedError extends Error {}

let refreshing: Promise<string> | null = null;

// Swaps the refresh token for a new pair (or, for a session from before
// refresh tokens, the still-valid access token). One request at a time: every
// call made while one is on its way waits for that one.
export function refreshSession(): Promise<string> {
  refreshing ??= (async () => {
    const refreshToken = localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY);
    const token = getAdminToken();
    if (!refreshToken && !token) throw new SessionEndedError();
    try {
      // Plain axios: this mustn't go through the 401 handling below.
      const { data } = await axios.post<{ data: { token: string; refreshToken: string } }>(
        "/api/admin/auth/refresh",
        refreshToken ? { refreshToken } : {},
        refreshToken ? undefined : { headers: { Authorization: `Bearer ${token}` } },
      );
      // Signed out (or in as someone else) while this was on its way.
      if (getAdminToken() !== token) return getAdminToken() ?? Promise.reject(new SessionEndedError());
      setAdminToken(data.data.token, data.data.refreshToken);
      refreshListeners.forEach((listener) => listener(data.data.token));
      return data.data.token;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) throw new SessionEndedError();
      throw error;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

function endSession() {
  setAdminToken(null);
  if (window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin/login") {
    window.location.href = "/admin/login";
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // A super admin managing someone else's portfolio (admin PortfolioPicker).
  const portfolioTarget = getPortfolioTarget();
  if (portfolioTarget && config.url?.startsWith("/admin/")) {
    config.headers["X-Portfolio-User"] = portfolioTarget;
  }
  return config;
});

// A 401 means the access token has run out (or the account changed): get a
// new one and send the request again, once. Only when the refresh itself is
// refused is the session over. Sign-in endpoints answer 401 for a wrong
// password or code, so those are left alone.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status !== 401 || !config || config.url?.startsWith("/admin/auth/")) {
      return Promise.reject(error);
    }
    if (config._retried || !getAdminToken()) {
      endSession();
      return Promise.reject(error);
    }
    try {
      await refreshSession();
    } catch (refreshError) {
      // Offline or a server hiccup: keep the session and let the call fail.
      if (refreshError instanceof SessionEndedError) endSession();
      return Promise.reject(error);
    }
    config._retried = true;
    return apiClient(config);
  },
);

// Uploaded images are stored in the database and the API returns the path
// they're served from ("/api/files/<id>"), usable directly as an <img src>.
// Absolute URLs pass through too.
export function uploadUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (pathOrUrl.startsWith("/") || /^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `/api/files/${pathOrUrl}`;
}
