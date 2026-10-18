import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { Reveal } from "../site/ui";
import { usePageTitle } from "../site/usePageTitle";
import { usePortfolioPath, usePortfolioScope } from "../portfolio/PortfolioScope";

export function NotFoundPage() {
  usePageTitle("Page not found");
  const inPortfolio = usePortfolioScope() !== null;
  const path = usePortfolioPath();

  return (
    <section className="gc-page-hero">
      <Reveal className="gc-container gc-stack gc-gap-24">
        <span className="gc-eyebrow">Error 404</span>
        <h1 className="gc-display">
          This page <span className="gc-accent-text">wandered off</span>.
        </h1>
        <p className="gc-lead">The page you're looking for doesn't exist or has moved. Let's get you back on track.</p>
        <div className="gc-row" style={{ gap: 12 }}>
          <Link to={path("/")} className="gc-btn gc-btn-primary">
            <FaArrowLeft /> Back home
          </Link>
          {inPortfolio && (
            <Link to="/" className="gc-btn gc-btn-ghost">
              Browse all portfolios
            </Link>
          )}
        </div>
      </Reveal>
    </section>
  );
}
