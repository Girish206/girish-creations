import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth, type AdminModule } from "../../../context/AdminAuthContext";
import { useAdminTheme } from "../../useAdminTheme";
import "../css/Navbar.css";

interface NavbarProps {
    toggleSidebar: () => void;
    isSidebarOpen: boolean;
}

// NOTE: the background-swatch picker (bgColors/mainBg) used to live inside
// the profile sidebar below, which is temporarily commented out in favor of
// showing the admin's name + a direct Sign Out button in the navbar itself.
// Re-enable the sidebar block further down to bring the swatch picker back.
// const bgColors = [
//     { label: "white", color: "bg-white" },
//     { label: "light", color: "bg-light" },
//     { label: "danger", color: "bg-danger-light" },
//     { label: "warning", color: "bg-warning-light" },
//     { label: "primary", color: "bg-primary-light" },
//     { label: "success", color: "bg-success-light" },
//     { label: "info", color: "bg-info-light" },
//     { label: "dark", color: "bg-dark-light" },
// ];

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const { isDark, toggle: toggleTheme } = useAdminTheme();

    const { logout, admin, setActiveModule } = useAdminAuth();
    const canSwitchModules = Boolean(
        admin?.hasPortfolioAccess &&
            (admin?.hasExpensesAccess || admin?.hasSavingsAccess),
    );
    const currentModule: AdminModule = location.pathname.startsWith("/admin/expense") ? "expense" : "portfolio";

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
        navigate("/admin/login", { replace: true });
    };

    const goToModule = (targetModule: AdminModule) => {
        if (targetModule === currentModule) return;
        setActiveModule(targetModule);
        navigate(targetModule === "expense" ? "/admin/expense" : "/admin");
    };

    return (
        <>
            <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
                <div className="container-fluid d-flex justify-content-between align-items-center">
                    {/* Left side: Menu Toggle + Logo */}
                    <div className="d-flex align-items-center">
                        {/* Sidebar toggle for mobile */}
                        <Link
                            className="text-danger d-md-none me-3"
                            to="#"
                            onClick={toggleSidebar}
                        >
                            <i className="fa-solid fa-bars fs-4"></i>
                        </Link>

                        <div className="navbar-brand-container d-flex align-items-center">
                            <div className="navbar-logo-box">
                                <img
                                    src="/logo/logo.png"
                                    alt="Logo"
                                    className="img-fluid"
                                />
                            </div>
                            <div className="navbar-brand-info ms-2 d-none d-sm-flex" style={{ flexDirection: "column", lineHeight: 1.3 }}>
                                <span style={{ fontSize: "1rem", whiteSpace: "nowrap" }}>
                                    <span style={{ fontWeight: 800, color: "var(--primary)" }}>Girish</span>
                                    <span style={{ fontWeight: 700, color: "var(--theme-text-dark)" }}>Creations</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Module switcher — only shown when the account can see
                        both the portfolio and expense-tracker modules. */}
                    {canSwitchModules && (
                        <div className="navbar-module-switcher" role="tablist" aria-label="Admin module">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={currentModule === "portfolio"}
                                className={`navbar-module-switcher-btn ${currentModule === "portfolio" ? "active" : ""}`}
                                onClick={() => goToModule("portfolio")}
                            >
                                <i className="fa-solid fa-briefcase"></i>
                                <span className="d-none d-md-inline">Portfolio</span>
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={currentModule === "expense"}
                                className={`navbar-module-switcher-btn ${currentModule === "expense" ? "active" : ""}`}
                                onClick={() => goToModule("expense")}
                            >
                                <i className="fa-solid fa-sack-dollar"></i>
                                <span className="d-none d-md-inline">Group Finances</span>
                            </button>
                        </div>
                    )}

                    {/* Right side: admin identity + direct sign-out (profile
                        sidebar is commented out below for now) */}
                    <div className="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        className="navbar-theme-btn"
                        onClick={toggleTheme}
                        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        <i className={`fa-solid ${isDark ? "fa-sun" : "fa-moon"}`} aria-hidden="true"></i>
                    </button>
                    <div className="navbar-user-chip">
                        <div
                            className="user-avatar text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: "36px", height: "36px", fontSize: "0.85rem", flexShrink: 0 }}
                        >
                            {(admin?.name || admin?.email || "U").charAt(0).toUpperCase()}
                        </div>
                        <span className="navbar-user-email d-none d-sm-inline">{admin?.name || admin?.email}</span>
                        <button className="navbar-signout-btn" onClick={handleLogout} title="Sign out">
                            <i className="fa-solid fa-right-from-bracket"></i>
                            <span className="d-none d-md-inline">Sign Out</span>
                        </button>
                    </div>
                    </div>
                </div>
            </nav>

            {/* Profile Sidebar — commented out for now (see NOTE above);
                the admin's name and sign-out are shown directly in the
                navbar instead.
            {profileOpen && (
                <div
                    ref={overlayRef}
                    className={`profile-sidebar-overlay ${closing ? "fade-out" : "fade-in"}`}
                >
                    <div
                        className={`profile-sidebar ${closing ? "slide-out" : "slide-in"}`}
                        ref={profileRef}
                    >
                        <div className="profile-sidebar-header">
                            <div
                                className="user-avatar text-white rounded-circle d-flex align-items-center justify-content-center fw-bold profile-sidebar-avatar"
                                style={{ fontSize: "1.3rem" }}
                            >
                                {admin?.email ? admin.email.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="profile-sidebar-name">{admin?.email}</p>
                            </div>
                            <button
                                style={{
                                    background: "rgba(255,255,255,0.15)",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: 28, height: 28,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", color: "#fff", flexShrink: 0,
                                    alignSelf: "flex-start",
                                }}
                                onClick={handleClose}
                                aria-label="Close sidebar"
                            >
                                <i className="fa-solid fa-xmark" style={{ fontSize: 13 }}></i>
                            </button>
                        </div>

                        <div className="profile-sidebar-content">
                            <div className="sidebar-section-title">Background</div>
                            <div className="bg-swatch-grid">
                                {bgColors.map((bg) => (
                                    <div
                                        key={bg.color}
                                        className={`bg-swatch ${bg.color} ${mainBg === bg.color ? "selected" : ""}`}
                                        title={bg.label}
                                        onClick={() => setMainBg(bg.color)}
                                    >
                                        {mainBg === bg.color && (
                                            <span className="check">
                                                <i className="fa-solid fa-check"></i>
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <hr className="sidebar-hr" />
                        </div>

                        <div style={{ padding: "12px 16px", flexShrink: 0, borderTop: "1px solid #f0f0f0" }}>
                            <button
                                style={{
                                    width: "100%", padding: "10px",
                                    background: "var(--primary-dark-1)", color: "#fff",
                                    border: "none", borderRadius: 10,
                                    fontWeight: 600, fontSize: 14,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    gap: 8, cursor: "pointer",
                                }}
                                onClick={handleLogout}
                            >
                                <i className="fa-solid fa-right-from-bracket"></i> Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
            */}
        </>
    );
};

export default Navbar;
