import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { isAxiosError } from "axios";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useProfile } from "../api/hooks/useProfile";
import { NotFoundPage } from "../pages/NotFoundPage";
import "../site/site.css";
import "../site/tech.css";

// Public site shell: the people directory at "/" and, inside a
// PortfolioLayout, every page of one person's portfolio.
export function MainLayout() {
  const { pathname, hash, key } = useLocation();
  // Inside a portfolio, a username nobody has gets the 404 page.
  const { error: profileError } = useProfile();
  const portfolioMissing = isAxiosError(profileError) && profileError.response?.status === 404;

  // The template's global style.css pads <body> and paints its own
  // background; `gc-body` (site.css) neutralizes that for the public site.
  useEffect(() => {
    document.body.classList.add("gc-body");
    return () => document.body.classList.remove("gc-body");
  }, []);

  // Spotlight cards (`.gc-spot`, tech.css) light up around the pointer: keep
  // the hovered card's --mx/--my at the pointer position.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const card = (event.target as Element | null)?.closest?.<HTMLElement>(".gc-spot");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // "#section" links (e.g. "/about#skills") scroll to that section; any other navigation
  // starts at the top. Depends on `key` so re-clicking the same anchor
  // scrolls again.
  //
  // Arriving from another page, the sections above the target are still
  // loading their data, so the page grows after the first scroll and pushes
  // the target down. Keep re-aligning to it until the layout has been stable
  // for a moment (or ~3s pass), and stop as soon as the visitor scrolls.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    const headerOffset = () =>
      parseFloat(getComputedStyle(document.querySelector(".gc") ?? document.body).getPropertyValue("--gc-header-h")) || 72;

    let cancelled = false;
    let stableTicks = 0;
    let elapsed = 0;
    let smoothDone = false;
    const stop = () => {
      cancelled = true;
    };
    const userEvents = ["wheel", "touchstart", "keydown", "mousedown"] as const;
    userEvents.forEach((type) => window.addEventListener(type, stop, { passive: true, once: true }));

    const timer = window.setInterval(() => {
      elapsed += 100;
      const el = document.getElementById(id);
      if (cancelled || elapsed > 3000 || stableTicks >= 6) {
        window.clearInterval(timer);
        return;
      }
      if (!el) return;
      const offset = el.getBoundingClientRect().top - headerOffset() + 1;
      if (!smoothDone) {
        // First jump is animated; later corrections are instant.
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        smoothDone = true;
        return;
      }
      if (Math.abs(offset) <= 2) {
        stableTicks += 1;
      } else {
        stableTicks = 0;
        // Let an in-flight smooth scroll finish before correcting it.
        if (elapsed > 700) window.scrollBy({ top: offset, behavior: "auto" });
      }
    }, 100);

    return () => {
      window.clearInterval(timer);
      userEvents.forEach((type) => window.removeEventListener(type, stop));
    };
  }, [pathname, hash, key]);

  return (
    <div className="gc">
      <div className="gc-backdrop" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <a href="#main" className="gc-skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="gc-main">
        {portfolioMissing ? <NotFoundPage /> : <Outlet />}
      </main>
      <Footer />
    </div>
  );
}
