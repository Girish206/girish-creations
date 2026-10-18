import { Link } from "react-router-dom";
import { useProfile } from "../api/hooks/useProfile";
import { SocialLinks } from "../site/ui";
import { NAV_LINKS } from "../site/navLinks";
import { uploadUrl } from "../api/client";
import { usePortfolioPath, usePortfolioScope } from "../portfolio/PortfolioScope";

export function Footer() {
  const { data: profile } = useProfile();
  const inPortfolio = usePortfolioScope() !== null;
  const path = usePortfolioPath();
  const year = new Date().getFullYear();
  const resume = uploadUrl(profile?.resume);

  if (!inPortfolio) {
    return (
      <footer className="gc-footer">
        <div className="gc-container">
          <div className="gc-footer-bottom">
            <span>© {year} Girish Creations. All rights reserved.</span>
            <Link to="/admin/login">Member sign in</Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="gc-footer">
      <div className="gc-container">
        <div className="gc-footer-grid">
          <div className="gc-footer-about">
            <Link to="/" className="gc-brand">
              <img src="/logo/logo.png" alt="" />
              <span>
                Girish<span className="gc-brand-accent">Creations</span>
              </span>
            </Link>
            <p>
              {profile ? `The portfolio of ${profile.fullName}` : "\u00a0"}. <Link to="/">Meet everyone else</Link>.
            </p>
            <SocialLinks profile={profile} />
          </div>
          <div>
            <span className="gc-footer-title">Pages</span>
            <ul className="gc-footer-links">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={path(link.to)}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="gc-footer-title">Get in touch</span>
            <ul className="gc-footer-links">
              {profile?.email && (
                <li>
                  <a href={`mailto:${profile.email}`}>{profile.email}</a>
                </li>
              )}
              {profile?.contactNumber && (
                <li>
                  <a href={`tel:+91${profile.contactNumber}`}>+91 {profile.contactNumber}</a>
                </li>
              )}
              {resume && (
                <li>
                  <a href={resume} target="_blank" rel="noreferrer">
                    Download résumé
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="gc-footer-bottom">
          <span>© {year} Girish Creations. All rights reserved.</span>
          {profile && <span>Portfolio of {profile.fullName}</span>}
        </div>
      </div>
    </footer>
  );
}
