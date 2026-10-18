import { Link } from "react-router-dom";
import { useProfile } from "../api/hooks/useProfile";
import { SocialLinks } from "../site/ui";
import { NAV_LINKS } from "../site/navLinks";

export function Footer() {
  const { data: profile } = useProfile();
  const year = new Date().getFullYear();

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
            <p>Full stack developer building web applications end to end — from database design to deployment.</p>
            <SocialLinks profile={profile} />
          </div>
          <div>
            <span className="gc-footer-title">Pages</span>
            <ul className="gc-footer-links">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to}>{link.label}</Link>
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
              <li>
                <a href="/assets/resume/Girish S Resume.pdf" target="_blank" rel="noreferrer">
                  Download résumé
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="gc-footer-bottom">
          <span>© {year} Girish Creations. All rights reserved.</span>
          <span>Designed &amp; built by {profile?.fullName ?? "Girish S"}</span>
        </div>
      </div>
    </footer>
  );
}
