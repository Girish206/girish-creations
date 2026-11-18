import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import DefaultModal from "../components/DefaultModal";
import { AdminExpenseForm } from "../../expense/expenses/AdminExpenseForm";
import { AdminExpenseGroupQuickForm } from "../../expense/expenses/AdminExpenseGroupQuickForm";
import { AdminSavingsGoalForm } from "../../expense/savings/AdminSavingsGoalForm";
import { useAdminMenu, type AdminMenuItem } from "./useAdminMenu";
import "../css/BottomNav.css";

type CreateKind = "expense" | "group" | "saving";

const CREATE_FORMS: Record<CreateKind, { title: string; size: "md" | "lg" }> = {
    expense: { title: "New Expense", size: "lg" },
    group: { title: "New Expense Group", size: "md" },
    saving: { title: "New Savings Goal", size: "lg" },
};

/** Mobile-only (< 768px) tab bar pinned to the bottom of the admin screens.
    Shows the module's main pages; in the portfolio module "More" opens the
    sidebar drawer for the rest (and Logout). In the expense module a centre "+" opens a small
    card of tiles just above it to create an expense, expense group or savings goal from any page. */
const BottomNav = ({
    activeItem,
    onMore,
}: {
    activeItem: string;
    onMore: () => void;
}) => {
    const { admin } = useAdminAuth();
    const location = useLocation();
    const isExpenseModule = location.pathname.startsWith("/admin/expense");
    const { bottomItems, overflowItems } = useAdminMenu();
    const moreActive = overflowItems.some((item) => item.id === activeItem);

    const [menuOpen, setMenuOpen] = useState(false);
    const [creating, setCreating] = useState<CreateKind | null>(null);

    // Close the speed dial on Escape and whenever the page changes.
    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [menuOpen]);
    useEffect(() => setMenuOpen(false), [location.pathname]);

    const createOptions = [
        admin?.hasExpensesAccess && { kind: "expense" as const, label: "Expense", icon: "fa-solid fa-receipt" },
        admin?.hasSavingsAccess && { kind: "saving" as const, label: "Savings goal", icon: "fa-solid fa-piggy-bank" },
        admin?.hasExpensesAccess && { kind: "group" as const, label: "Expense group", icon: "fa-solid fa-people-group" },
    ].filter((option): option is { kind: CreateKind; label: string; icon: string } => Boolean(option));
    const showPlus = isExpenseModule && createOptions.length > 0;

    // The plus sits in the middle: half the tabs before it, half after.
    const split = Math.ceil(bottomItems.length / 2);
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
        <>
            <nav className="admin-bottom-nav d-md-none" aria-label="Main">
                {(showPlus ? bottomItems.slice(0, split) : bottomItems).map(renderTab)}
                {showPlus && (
                    <div className="admin-bottom-nav-plus-slot">
                        <button
                            type="button"
                            className={`admin-bottom-nav-plus ${menuOpen ? "open" : ""}`}
                            onClick={() => setMenuOpen((open) => !open)}
                            aria-label={menuOpen ? "Close create menu" : "Create new"}
                            aria-expanded={menuOpen}
                            aria-haspopup="menu"
                        >
                            <i className="fa-solid fa-plus" aria-hidden="true"></i>
                        </button>
                    </div>
                )}
                {showPlus && bottomItems.slice(split).map(renderTab)}
                {/* The expense module has no "More": its tabs cover the main
                    pages and the top-bar menu button opens the drawer. */}
                {!isExpenseModule && (
                    <button
                        type="button"
                        className={`admin-bottom-nav-item ${moreActive ? "active" : ""}`}
                        onClick={onMore}
                    >
                        <i className="fa-solid fa-bars" aria-hidden="true"></i>
                        <span>More</span>
                    </button>
                )}
            </nav>

            {menuOpen && (
                <div className="admin-speed-dial d-md-none" onClick={() => setMenuOpen(false)}>
                    <div
                        className="admin-speed-dial-options"
                        role="menu"
                        aria-label="Create new"
                        style={{ gridTemplateColumns: `repeat(${createOptions.length}, 1fr)` }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {createOptions.map((option) => (
                            <button
                                key={option.kind}
                                type="button"
                                role="menuitem"
                                className="admin-speed-dial-option"
                                onClick={() => {
                                    setMenuOpen(false);
                                    setCreating(option.kind);
                                }}
                            >
                                <i className={option.icon} aria-hidden="true"></i>
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {creating && (
                <DefaultModal
                    title={CREATE_FORMS[creating].title}
                    onClose={() => setCreating(null)}
                    showFooter={false}
                    size={CREATE_FORMS[creating].size}
                    component={
                        creating === "expense" ? (
                            <AdminExpenseForm onSaved={() => setCreating(null)} />
                        ) : creating === "group" ? (
                            <AdminExpenseGroupQuickForm onSaved={() => setCreating(null)} />
                        ) : (
                            <AdminSavingsGoalForm onSaved={() => setCreating(null)} />
                        )
                    }
                />
            )}
        </>
    );
};

export default BottomNav;
