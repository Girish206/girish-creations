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

/** Ids shown in the mobile bottom nav, in order. Anything else is reached
    through the sidebar drawer ("More" tab, or the top-bar menu button). */
const BOTTOM_NAV_IDS = ["dashboard", "profile", "projects", "contact"];

/** The admin sidebar menu, shared by Sidebar and BottomNav so both always
    list the same pages. */
export function useAdminMenu() {
    const { admin } = useAdminAuth();

    const allMenuGroups: AdminMenuGroup[] = [
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

    const menuGroups = allMenuGroups.filter((group) => group.items.length > 0);

    const allItems = menuGroups.flatMap((group) => group.items);
    const bottomItems = BOTTOM_NAV_IDS
        .map((id) => allItems.find((item) => item.id === id))
        .filter((item): item is AdminMenuItem => Boolean(item));
    const overflowItems = allItems.filter((item) => !bottomItems.includes(item));

    return { menuGroups, bottomItems, overflowItems };
}
