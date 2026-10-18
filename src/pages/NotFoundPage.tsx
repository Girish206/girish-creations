import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { Reveal } from "../site/ui";
import { usePageTitle } from "../site/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page not found");

  return (
    <section className="gc-page-hero">
      <Reveal className="gc-container gc-stack gc-gap-24">
        <span className="gc-eyebrow">Error 404</span>
        <h1 className="gc-display">
          This page <span className="gc-accent-text">wandered off</span>.
        </h1>
        <p className="gc-lead">The page you're looking for doesn't exist or has moved. Let's get you back on track.</p>
        <div className="gc-row" style={{ gap: 12 }}>
          <Link to="/" className="gc-btn gc-btn-primary">
            <FaArrowLeft /> Back home
          </Link>
          <Link to="/projects" className="gc-btn gc-btn-ghost">
            See my work
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
