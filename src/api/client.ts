import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
});

const ADMIN_TOKEN_KEY = "portfolio_admin_token";

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setAdminToken(null);
      if (window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin/login") {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
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
