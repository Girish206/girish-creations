import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { PortfolioScopeProvider, publicPortfolioScope } from "../portfolio/PortfolioScope";
import { MainLayout } from "./MainLayout";

// /<username>/* — one person's portfolio. Everything below reads that
// person's data through the scope.
export function PortfolioLayout() {
  const { username = "" } = useParams();
  const scope = useMemo(() => publicPortfolioScope(username.toLowerCase()), [username]);
  return (
    <PortfolioScopeProvider value={scope}>
      <MainLayout />
    </PortfolioScopeProvider>
  );
}
