import { useLocation } from "react-router-dom";
import { useAdminAuth } from "../../../context/AdminAuthContext";

export type AdminMenuItem = {
    id: string;
    label: string;
    /** Shorter label for the mobile bottom nav, where space is tight. */
    shortLabel?: string;
    icon: string;
    link: string;
    submenu: { id: string; label: string; link: string }[];
};

export type AdminMenuGroup = { label: string; items: AdminMenuItem[] };

/** Ids shown in the mobile bottom nav, in order, for each module. Anything
    else is reached through the sidebar drawer ("More" tab in portfolio, the
    top-bar menu button in both). */
const BOTTOM_NAV_IDS = {
    portfolio: ["dashboard", "profile", "projects", "contact"],
    // No "More" here, so four tabs with the centre "+" between them.
    expense: ["expense-dashboard", "expense-expenses", "expense-savings", "expense-admin-users"],
};

/** The sidebar menu for the current module (portfolio or expense), shared by
    Sidebar and BottomNav so both always list the same pages. */
export function useAdminMenu() {
    const { admin } = useAdminAuth();
    const location = useLocation();
    const isExpenseModule = location.pathname.startsWith("/admin/expense");

    const portfolioMenuGroups: AdminMenuGroup[] = [
        {
            label: "Main",
            items: [
                { id: "dashboard", label: "Dashboard", shortLabel: "Home", icon: "fa-solid fa-chart-pie", link: "/admin", submenu: [] },
            ],
        },
        {
            label: "Portfolio Content",
            items: [
                { id: "profile", label: "Profile", icon: "fa-solid fa-user", link: "/admin/profile", submenu: [] },
                { id: "experience", label: "Experience", icon: "fa-solid fa-briefcase", link: "/admin/experience", submenu: [] },
                { id: "education", label: "Education", icon: "fa-solid fa-graduation-cap", link: "/admin/education", submenu: [] },
                { id: "skills", label: "Expertise", icon: "fa-solid fa-star", link: "/admin/skills", submenu: [] },
                { id: "projects", label: "Projects", icon: "fa-solid fa-diagram-project", link: "/admin/projects", submenu: [] },
                { id: "blog", label: "Blog", icon: "fa-solid fa-blog", link: "/admin/blog", submenu: [] },
            ],
        },
        {
            label: "Inbox",
            items: [
                { id: "contact", label: "Contact Messages", shortLabel: "Inbox", icon: "fa-solid fa-envelope", link: "/admin/contact", submenu: [] },
            ],
        },
        ...(admin?.isSuperAdmin
            ? [
                  {
                      label: "Administration",
                      items: [
                          { id: "admin-users", label: "Admin Accounts", icon: "fa-solid fa-user-shield", link: "/admin/admin-users", submenu: [] },
                      ],
                  },
              ]
            : []),
    ];

    const expenseMenuGroups: AdminMenuGroup[] = [
        {
            label: "Main",
            items: [
                { id: "expense-dashboard", label: "Dashboard", shortLabel: "Home", icon: "fa-solid fa-chart-pie", link: "/admin/expense", submenu: [] },
            ],
        },
        {
            // Each item gated by its own independent access flag — one
            // member might have Savings only, another Expenses only, etc.
            label: "Tracking",
            items: [
                ...(admin?.hasExpensesAccess
                    ? [
                          { id: "expense-categories", label: "Categories", icon: "fa-solid fa-tags", link: "/admin/expense/categories", submenu: [] },
                          { id: "expense-expenses", label: "Expenses", icon: "fa-solid fa-receipt", link: "/admin/expense/expenses", submenu: [] },
                      ]
                    : []),
                ...(admin?.hasSavingsAccess
                    ? [{ id: "expense-savings", label: "Savings", icon: "fa-solid fa-piggy-bank", link: "/admin/expense/savings", submenu: [] }]
                    : []),
            ],
        },
        // Super admins manage every account; other members get "Members" —
        // the same page, limited to people they add for expenses/savings.
        {
            label: "People",
            items: [
                {
                    id: "expense-admin-users",
                    label: "People",
                    icon: admin?.isSuperAdmin ? "fa-solid fa-user-shield" : "fa-solid fa-users",
                    link: "/admin/expense/admin-users",
                    submenu: [],
                },
            ],
        },
    ];

    const menuGroups = (isExpenseModule ? expenseMenuGroups : portfolioMenuGroups).filter(
        (group) => group.items.length > 0,
    );

    const allItems = menuGroups.flatMap((group) => group.items);
    const bottomIds = BOTTOM_NAV_IDS[isExpenseModule ? "expense" : "portfolio"];
    const bottomItems = bottomIds
        .map((id) => allItems.find((item) => item.id === id))
        .filter((item): item is AdminMenuItem => Boolean(item));
    const overflowItems = allItems.filter((item) => !bottomItems.includes(item));

    return { menuGroups, bottomItems, overflowItems };
}
