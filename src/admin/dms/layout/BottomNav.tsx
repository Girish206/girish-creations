import { Link } from "react-router-dom";
import { useAdminMenu, type AdminMenuItem } from "./useAdminMenu";
import "../css/BottomNav.css";

/** Mobile-only (< 768px) tab bar pinned to the bottom of the admin screens.
    Shows the main pages; "More" opens the sidebar drawer for the rest (and Logout). */
const BottomNav = ({
    activeItem,
    onMore,
}: {
    activeItem: string;
    onMore: () => void;
}) => {
    const { bottomItems, overflowItems } = useAdminMenu();
    const moreActive = overflowItems.some((item) => item.id === activeItem);

    const renderTab = (item: AdminMenuItem) => {
        const active = item.id === activeItem;
        return (
            <Link
                key={item.id}
                to={item.link}
                className={`admin-bottom-nav-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
            >
                <i className={item.icon} aria-hidden="true"></i>
                <span>{item.shortLabel ?? item.label}</span>
            </Link>
        );
    };

    return (
        <nav className="admin-bottom-nav d-md-none" aria-label="Main">
            {bottomItems.map(renderTab)}
            <button
                type="button"
                className={`admin-bottom-nav-item ${moreActive ? "active" : ""}`}
                onClick={onMore}
            >
                <i className="fa-solid fa-bars" aria-hidden="true"></i>
                <span>More</span>
            </button>
        </nav>
    );
};

export default BottomNav;
