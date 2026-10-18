import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { FaArrowRight, FaBars, FaMoon, FaSun, FaXmark } from "react-icons/fa6";
import { useProfile } from "../api/hooks/useProfile";
import { useDarkTheme } from "../hooks/useDarkTheme";
import { usePortfolioStyle } from "../portfolio/portfolioStyle";
import { ArrowUpRight, SocialLinks } from "../site/ui";
import { useNavLinks } from "../site/navLinks";
import { usePortfolioPath, usePortfolioScope } from "../portfolio/PortfolioScope";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Classic portfolios open in the light theme unless the visitor chose dark.
  const { isDark, toggle } = useDarkTheme(usePortfolioStyle() !== "classic");
  const { data: profile } = useProfile();
  const navLinks = useNavLinks();
  const inPortfolio = usePortfolioScope() !== null;
  const path = usePortfolioPath();
  const { pathname } = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Any navigation (including the browser's back button) closes the drawer.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  // While the drawer is open: lock page scroll, close on Escape, and move
  // focus into the drawer (then back to the menu button when it closes).
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const menuButton = menuButtonRef.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      menuButton?.focus();
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const themeLabel = isDark ? "Switch to light theme" : "Switch to dark theme";

  // The brand always leads back to the people directory ("/"); "Home" in the
  // nav is the current person's portfolio home.
  const brand = (onClick?: () => void) => (
    <Link to="/" className="gc-brand" aria-label="Girish Creations — all portfolios" onClick={onClick}>
      <img src="/logo/logo.png" alt="" />
      <span>
        Girish<span className="gc-brand-accent">Creations</span>
      </span>
    </Link>
  );

  // Outside a portfolio (the directory, the top-level 404) there are no
  // portfolio pages to link to.
  if (!inPortfolio) {
    return (
      <header className={`gc-header${scrolled ? " is-scrolled" : ""}`}>
        <div className="gc-container gc-header-inner">
          {brand()}
          <div className="gc-header-actions">
            <button type="button" className="gc-icon-btn" onClick={toggle} aria-label={themeLabel}>
              {isDark ? <FaSun /> : <FaMoon />}
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className={`gc-header${scrolled ? " is-scrolled" : ""}`}>
        <div className="gc-container gc-header-inner">
          {brand()}

          <nav className="gc-nav" aria-label="Main">
            <ul className="gc-nav-list">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={path(link.to)}
                    end={link.end}
                    className={({ isActive }) => `gc-nav-link${isActive ? " active" : ""}`}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="gc-header-actions">
            <button type="button" className="gc-icon-btn" onClick={toggle} aria-label={themeLabel}>
              {isDark ? <FaSun /> : <FaMoon />}
            </button>
            <Link to={path("/contact")} className="gc-btn gc-btn-dark gc-btn-sm gc-header-cta">
              Let's talk <ArrowUpRight />
            </Link>
            <button
              ref={menuButtonRef}
              type="button"
              className="gc-icon-btn gc-menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="gc-drawer"
              aria-label="Open menu"
            >
              <FaBars />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer. Rendered outside <header>: the header's
          backdrop-filter would otherwise trap this fixed panel inside it. */}
      <div className={`gc-drawer-scrim${menuOpen ? " is-open" : ""}`} onClick={closeMenu} aria-hidden="true" />
      <div
        id="gc-drawer"
        className={`gc-drawer${menuOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!menuOpen}
      >
        <div className="gc-drawer-head">
          {brand(closeMenu)}
          <button ref={closeButtonRef} type="button" className="gc-icon-btn" onClick={closeMenu} aria-label="Close menu">
            <FaXmark />
          </button>
        </div>

        <nav aria-label="Main">
          <ol className="gc-drawer-list">
            {navLinks.map((link, i) => (
              <li key={link.to} style={{ transitionDelay: menuOpen ? `${80 + i * 35}ms` : "0ms" }}>
                <NavLink
                  to={path(link.to)}
                  end={link.end}
                  onClick={closeMenu}
                  className={({ isActive }) => `gc-drawer-link${isActive ? " active" : ""}`}
                >
                  <span className="gc-drawer-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="gc-drawer-label">{link.label}</span>
                  <FaArrowRight className="gc-drawer-arrow" aria-hidden="true" />
                </NavLink>
              </li>
            ))}
          </ol>
        </nav>

        <div className="gc-drawer-foot">
          <Link to={path("/contact")} className="gc-btn gc-btn-primary" onClick={closeMenu}>
            Let's talk <ArrowUpRight />
          </Link>
          <div className="gc-drawer-row">
            <SocialLinks profile={profile} />
            <button type="button" className="gc-icon-btn" onClick={toggle} aria-label={themeLabel}>
              {isDark ? <FaSun /> : <FaMoon />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
