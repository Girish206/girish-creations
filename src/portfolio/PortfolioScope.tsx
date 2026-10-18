import { createContext, useCallback, useContext, type ReactNode } from "react";

// Which portfolio the portfolio data hooks (useProfile, useSkills, ...) read.
// A public page at /<username> reads that person's portfolio; the admin
// panel reads the signed-in account's own one to edit it.
export interface PortfolioScope {
  // API prefix the read endpoints hang off ("/portfolios/<username>" or
  // "/admin/portfolio").
  apiBase: string;
  // Distinguishes cached data between portfolios — and between accounts on
  // the admin side, where apiBase is the same for everyone.
  cacheKey: string;
  // Client route prefix for links inside a public portfolio ("/<username>"),
  // empty in the admin panel.
  basePath: string;
}

const PortfolioScopeContext = createContext<PortfolioScope | null>(null);

export function PortfolioScopeProvider({ value, children }: { value: PortfolioScope; children: ReactNode }) {
  return <PortfolioScopeContext.Provider value={value}>{children}</PortfolioScopeContext.Provider>;
}

// Null outside a portfolio (the people directory, the top-level 404); the
// data hooks stay idle there.
export function usePortfolioScope() {
  return useContext(PortfolioScopeContext);
}

export function publicPortfolioScope(username: string): PortfolioScope {
  return { apiBase: `/portfolios/${encodeURIComponent(username)}`, cacheKey: username, basePath: `/${username}` };
}

// Builds a link inside the current portfolio: path("/about") → "/<username>/about",
// path("/") → "/<username>".
export function usePortfolioPath() {
  const basePath = usePortfolioScope()?.basePath ?? "";
  return useCallback((path: string) => (path === "/" ? basePath || "/" : `${basePath}${path}`), [basePath]);
}
