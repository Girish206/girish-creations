import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Layout from "./Layout";
import { PortfolioScopeProvider, type PortfolioScope } from "../../../portfolio/PortfolioScope";
import { getPortfolioTarget, setPortfolioTarget } from "../../../portfolio/adminPortfolioTarget";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { PortfolioPicker } from "../../portfolio/PortfolioPicker";

const LayoutWrapper = () => {
    const { admin } = useAdminAuth();
    const location = useLocation();
    // Super admins can switch the portfolio pages to another account; the
    // API client sends the choice as a header (api/client.ts).
    const [portfolioTarget, setTarget] = useState(() => (admin?.isSuperAdmin ? getPortfolioTarget() : null));
    const choosePortfolio = (adminUserId: string | null) => {
        setPortfolioTarget(adminUserId);
        setTarget(adminUserId);
    };
    // The portfolio data hooks read the admin's (or chosen account's)
    // portfolio. Cache entries are per chosen account; switching login
    // clears the cache entirely (AdminAuthContext).
    const scope = useMemo<PortfolioScope>(
        () => ({ apiBase: "/admin/portfolio", cacheKey: `admin:${portfolioTarget ?? "me"}`, basePath: "" }),
        [portfolioTarget],
    );
    const path = location.pathname;
    const isExpenseModule = path.startsWith("/admin/expense");

    const getActiveItem = () => {
        if (isExpenseModule) {
            if (path.includes("/admin/expense/categories")) return "expense-categories";
            if (path.includes("/admin/expense/expenses")) return "expense-expenses";
            if (path.includes("/admin/expense/savings")) return "expense-savings";
            if (path.includes("/admin/expense/admin-users")) return "expense-admin-users";
            return "expense-dashboard";
        }

        if (path.includes("/admin/profile")) return "profile";
        if (path.includes("/admin/experience")) return "experience";
        if (path.includes("/admin/education")) return "education";
        // Skills, tools and certifications are tabs of one page.
        if (path.includes("/admin/skills") || path.includes("/admin/tools") || path.includes("/admin/certifications"))
            return "skills";
        if (path.includes("/admin/projects")) return "projects";
        if (path.includes("/admin/blog")) return "blog";
        if (path.includes("/admin/contact")) return "contact";
        if (path.includes("/admin/admin-users")) return "admin-users";

        return "dashboard";
    };

    return (
        <PortfolioScopeProvider value={scope}>
            <Layout activeItem={getActiveItem()} activeSubItem="">
                {admin?.isSuperAdmin && !isExpenseModule && (
                    <PortfolioPicker adminId={admin.sub} target={portfolioTarget} onChange={choosePortfolio} />
                )}
                {/* Remount on switch so forms (e.g. the autosaving profile)
                    load the newly chosen portfolio instead of keeping state. */}
                <Outlet key={portfolioTarget ?? "me"} />
            </Layout>
        </PortfolioScopeProvider>
    );
};

export default LayoutWrapper;
