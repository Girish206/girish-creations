import { useState, useRef } from "react";
import { MenuItem } from "./MenuItem";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Sidebar = ({
    activeSubItem,
    activeItem,
    isSidebarOpen,
    toggleSidebar,
    setSidebarOpen,
}: {
    activeSubItem: string;
    activeItem: string;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
}) => {
    const { logout, admin } = useAdminAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isExpenseModule = location.pathname.startsWith("/admin/expense");

    const sidebarRef = useRef<HTMLDivElement | null>(null);

    const portfolioMenuGroups = [
        {
            label: "Main",
            items: [
                {
                    id: "dashboard",
                    label: "Dashboard",
                    icon: "fa-solid fa-chart-pie",
                    link: "/admin",
                    submenu: [],
                },
            ],
        },
        {
            label: "Portfolio Content",
            items: [
                {
                    id: "profile",
                    label: "Profile",
                    icon: "fa-solid fa-user",
                    link: "/admin/profile",
                    submenu: [],
                },
                {
                    id: "experience",
                    label: "Experience",
                    icon: "fa-solid fa-briefcase",
                    link: "/admin/experience",
                    submenu: [],
                },
                {
                    id: "education",
                    label: "Education",
                    icon: "fa-solid fa-graduation-cap",
                    link: "/admin/education",
                    submenu: [],
                },
                {
                    id: "certifications",
                    label: "Certifications",
                    icon: "fa-solid fa-certificate",
                    link: "/admin/certifications",
                    submenu: [],
                },
                {
                    id: "skills",
                    label: "Skills",
                    icon: "fa-solid fa-star",
                    link: "/admin/skills",
                    submenu: [],
                },
                {
                    id: "tools",
                    label: "Tools",
                    icon: "fa-solid fa-toolbox",
                    link: "/admin/tools",
                    submenu: [],
                },
                {
                    id: "projects",
                    label: "Projects",
                    icon: "fa-solid fa-diagram-project",
                    link: "/admin/projects",
                    submenu: [],
                },
                {
                    id: "blog",
                    label: "Blog",
                    icon: "fa-solid fa-blog",
                    link: "/admin/blog",
                    submenu: [],
                },
            ],
        },
        {
            label: "Inbox",
            items: [
                {
                    id: "contact",
                    label: "Contact Messages",
                    icon: "fa-solid fa-envelope",
                    link: "/admin/contact",
                    submenu: [],
                },
            ],
        },
    ];

    const expenseMenuGroups = [
        {
            label: "Main",
            items: [
                {
                    id: "expense-dashboard",
                    label: "Dashboard",
                    icon: "fa-solid fa-chart-pie",
                    link: "/admin/expense",
                    submenu: [],
                },
            ],
        },
        {
            // Each item gated by its own independent access flag — one
            // member might have Savings only, another Expenses only, etc.
            label: "Tracking",
            items: [
                ...(admin?.hasExpensesAccess
                    ? [
                          {
                              id: "expense-categories",
                              label: "Categories",
                              icon: "fa-solid fa-tags",
                              link: "/admin/expense/categories",
                              submenu: [],
                          },
                          {
                              id: "expense-expenses",
                              label: "Expenses",
                              icon: "fa-solid fa-receipt",
                              link: "/admin/expense/expenses",
                              submenu: [],
                          },
                      ]
                    : []),
                ...(admin?.hasSavingsAccess
                    ? [
                          {
                              id: "expense-savings",
                              label: "Savings",
                              icon: "fa-solid fa-piggy-bank",
                              link: "/admin/expense/savings",
                              submenu: [],
                          },
                      ]
                    : []),
            ],
        },
        // Owner-only: managing who can sign in and which module(s) they see.
        ...(admin?.isOwner
            ? [
                  {
                      label: "Administration",
                      items: [
                          {
                              id: "expense-admin-users",
                              label: "Admin Accounts",
                              icon: "fa-solid fa-user-shield",
                              link: "/admin/expense/admin-users",
                              submenu: [],
                          },
                      ],
                  },
              ]
            : []),
    ];

    const menuGroups = (isExpenseModule ? expenseMenuGroups : portfolioMenuGroups).filter(
        (group) => group.items.length > 0,
    );

    const [isSubMenuOpenItems, setIsSubMenuOpenItems] = useState<{
        [key: string]: boolean;
    }>(() => {
        const initialState: { [key: string]: boolean } = {};
        menuGroups.forEach((group) => {
            group.items.forEach((item) => {
                if (
                    item.submenu &&
                    item.submenu.some((sub: any) => sub.id === activeSubItem)
                ) {
                    initialState[item.id] = true;
                }
            });
        });
        return initialState;
    });

    const toggleSubmenu = (id: string) => {
        setIsSubMenuOpenItems((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const handleNavigate = () => {
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/admin/login", { replace: true });
    };

    return (
        <div
            ref={sidebarRef}
            className={`sidebar ${isSidebarOpen ? "sidebar-open" : "sidebar-close"}`}
        >
            <button
                className="sidebar-toggle-btn"
                onClick={toggleSidebar}
                title={isSidebarOpen ? "Collapse" : "Expand"}
            >
                <i
                    className={`fa-solid fa-chevron-${isSidebarOpen ? "left" : "right"}`}
                ></i>
            </button>

            <div className="scrollable-content pt-2">
                <ul className="nav nav-pills flex-column mb-auto">
                    {menuGroups.map((group, groupIndex) => {
                        return (
                            <div key={groupIndex} className="menu-group">
                                <div className="menu-group-label">
                                    <span>{group.label}</span>
                                    {isSidebarOpen && (
                                        <div className="menu-group-line"></div>
                                    )}
                                </div>
                                {group.items.map((item, index) => (
                                    <MenuItem
                                        key={index}
                                        activeItem={activeItem}
                                        activeSubItem={activeSubItem}
                                        isSidebarOpen={isSidebarOpen}
                                        mainItem={item}
                                        isSubMenuOpen={
                                            !!isSubMenuOpenItems[item.id]
                                        }
                                        toggleSubmenu={() =>
                                            toggleSubmenu(item.id)
                                        }
                                        onNavigate={handleNavigate}
                                    />
                                ))}
                            </div>
                        );
                    })}
                </ul>
            </div>

            <div className="sidebar-footer">
                <Link
                    to="#"
                    onClick={(e) => {
                        e.preventDefault();
                        handleLogout();
                    }}
                    className={`logout-btn nav-link ${!isSidebarOpen ? "justify-content-center" : ""}`}
                    title={!isSidebarOpen ? "Logout" : undefined}
                >
                    <i className="fa-solid fa-right-from-bracket icon"></i>
                    {isSidebarOpen && <span>Logout</span>}
                </Link>
            </div>
        </div>
    );
};

export default Sidebar;
