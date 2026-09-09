import { Outlet, useLocation } from "react-router-dom";
import Layout from "./Layout";

const LayoutWrapper = () => {
    const location = useLocation();
    const path = location.pathname;
    const isExpenseModule = path.startsWith("/admin/expense");

    const getActiveItem = () => {
        if (isExpenseModule) {
            if (path.includes("/admin/expense/categories")) return "expense-categories";
            if (path.includes("/admin/expense/expenses")) return "expense-expenses";
            if (path.includes("/admin/expense/investments")) return "expense-investments";
            if (path.includes("/admin/expense/savings")) return "expense-savings";
            if (path.includes("/admin/expense/admin-users")) return "expense-admin-users";
            return "expense-dashboard";
        }

        if (path.includes("/admin/profile")) return "profile";
        if (path.includes("/admin/experience")) return "experience";
        if (path.includes("/admin/education")) return "education";
        if (path.includes("/admin/certifications")) return "certifications";
        if (path.includes("/admin/skills")) return "skills";
        if (path.includes("/admin/tools")) return "tools";
        if (path.includes("/admin/projects")) return "projects";
        if (path.includes("/admin/blog")) return "blog";
        if (path.includes("/admin/contact")) return "contact";

        return "dashboard";
    };

    return (
        <Layout activeItem={getActiveItem()} activeSubItem="">
            <Outlet />
        </Layout>
    );
};

export default LayoutWrapper;
