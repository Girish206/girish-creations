// Which account's portfolio a super admin is managing in the admin panel
// (null = their own). Sent to the API as the X-Portfolio-User header on
// admin requests (api/client.ts); the server ignores it for anyone who isn't
// a super admin.
const STORAGE_KEY = "admin_portfolioUser";

export function getPortfolioTarget(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setPortfolioTarget(adminUserId: string | null) {
  try {
    if (adminUserId) {
      localStorage.setItem(STORAGE_KEY, adminUserId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable: the choice just won't survive a reload.
  }
}
