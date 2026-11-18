import { useState, useRef } from "react";
import { MenuItem } from "./MenuItem";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useAdminMenu } from "./useAdminMenu";

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
    const { logout } = useAdminAuth();
    const navigate = useNavigate();

    const sidebarRef = useRef<HTMLDivElement | null>(null);

    const { menuGroups } = useAdminMenu();

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
