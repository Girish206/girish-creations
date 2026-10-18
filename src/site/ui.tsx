import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaArrowRight, FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { uploadUrl } from "../api/client";
import type { ProjectDetails, UserProfile } from "../api/types";
import { formatYear, monogram } from "../utils/format";
import { usePortfolioPath } from "../portfolio/PortfolioScope";
import { useIsCreator } from "../portfolio/portfolioStyle";

// Fades/slides its content in the first time it scrolls into view. Content
// is never hidden for users who prefer reduced motion (see site.css).
export function Reveal({
  as: Tag = "div",
  className = "",
  delay = 0,
  style,
  children,
}: {
  as?: ElementType;
  className?: string;
  delay?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`gc-reveal ${className}`.trim()} style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}>
      {children}
    </Tag>
  );
}

export function ArrowUpRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.5 11.5L11.5 4.5M5.5 4.5h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// `level={1}` when the section is the page itself (its title is the page's
// <h1>); the default h2 is for a section within a page.
export function SectionHead({
  eyebrow,
  title,
  description,
  action,
  level = 2,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  level?: 1 | 2;
}) {
  return (
    <Reveal className="gc-section-head">
      <div>
        <span className="gc-eyebrow">{eyebrow}</span>
        {level === 1 ? <h1 className="gc-h1">{title}</h1> : <h2 className="gc-h2">{title}</h2>}
        {description && <p>{description}</p>}
      </div>
      {action}
    </Reveal>
  );
}

// Title block at the top of an inner page. `aside` (e.g. a few metrics)
// sits beside the title on wide screens and below it on narrow ones.
export function PageHero({
  eyebrow,
  title,
  lead,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="gc-page-hero">
      <div className={`gc-container${aside ? " gc-page-hero-grid" : ""}`}>
        <Reveal className="gc-stack">
          <span className="gc-eyebrow">{eyebrow}</span>
          <h1 className="gc-h1">{title}</h1>
          {lead && <p className="gc-lead">{lead}</p>}
        </Reveal>
        {aside && <Reveal delay={100}>{aside}</Reveal>}
      </div>
    </section>
  );
}

export function Metrics({ items }: { items: { value: ReactNode; label: string }[] }) {
  return (
    <div className="gc-hero-metrics">
      {items.map((item) => (
        <div className="gc-metric gc-glass" key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// Freelance availability — only the site creator takes on projects here.
export function AvailabilityBadge() {
  const isCreator = useIsCreator();
  if (!isCreator) return null;
  return (
    <span className="gc-status">
      <span className="gc-status-dot" aria-hidden="true" />
      Available for new projects
    </span>
  );
}

export function SocialLinks({ profile }: { profile: UserProfile | undefined }) {
  if (!profile) return null;
  const links = [
    { href: profile.linkedinId, label: "LinkedIn", icon: <FaLinkedinIn /> },
    { href: profile.instaId, label: "Instagram", icon: <FaInstagram /> },
    { href: profile.facebookId, label: "Facebook", icon: <FaFacebookF /> },
    { href: profile.twitterId, label: "X (Twitter)", icon: <FaXTwitter /> },
  ].filter((link) => link.href);

  return (
    <div className="gc-socials">
      {links.map((link) => (
        <a key={link.label} className="gc-icon-btn" href={link.href!} target="_blank" rel="noreferrer" aria-label={link.label}>
          {link.icon}
        </a>
      ))}
    </div>
  );
}

export function WorkCard({ project, showDescription = false }: { project: ProjectDetails; showDescription?: boolean }) {
  const path = usePortfolioPath();
  const image = uploadUrl(project.image);
  return (
    <Link to={path(`/projects/${project.id}`)} className="gc-work-card gc-spot">
      <div className="gc-work-media">
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <span className="gc-work-media-placeholder" aria-hidden="true">
            {project.title.charAt(0)}
          </span>
        )}
        <span className="gc-work-arrow" aria-hidden="true">
          <ArrowUpRight size={18} />
        </span>
      </div>
      <div className="gc-work-body">
        <div className="gc-work-meta">
          <span className="gc-chip gc-chip-accent">{project.technologiesUsed}</span>
          <span>
            {formatYear(project.startDate)} – {formatYear(project.endDate)}
          </span>
        </div>
        <h3 className="gc-work-title">{project.title}</h3>
        {showDescription && <p className="gc-work-desc">{project.description}</p>}
      </div>
    </Link>
  );
}

export function WorkCardSkeleton() {
  return (
    <div className="gc-work-card" aria-hidden="true">
      <div className="gc-skeleton" style={{ aspectRatio: "16 / 11", borderRadius: 24 }} />
      <div className="gc-skeleton" style={{ height: 18, width: "40%" }} />
      <div className="gc-skeleton" style={{ height: 24, width: "70%" }} />
    </div>
  );
}

// Inside a <button class="gc-portrait">: the photo, the person's initials
// when they haven't uploaded one, or a skeleton while the profile loads.
export function PortraitContent({ profile, src }: { profile: UserProfile | undefined; src: string | null | undefined }) {
  if (src) return <img src={src} alt={profile?.fullName ?? ""} />;
  if (profile) {
    return (
      <span className="gc-portrait-initials" aria-hidden="true">
        {monogram(profile.fullName)}
      </span>
    );
  }
  return <span className="gc-skeleton" style={{ position: "absolute", inset: 0 }} />;
}

export function CtaBand() {
  const path = usePortfolioPath();
  const isCreator = useIsCreator();
  return (
    <section className="gc-section">
      <div className="gc-container">
        <Reveal className="gc-cta">
          {isCreator ? (
            <div>
              <h2>Have a project in mind?</h2>
              <p>I'm open to freelance work and full-time roles. Tell me what you're building and I'll get back to you.</p>
            </div>
          ) : (
            <div>
              <h2>Want to get in touch?</h2>
              <p>Have a question or an opportunity to share? Send a message and I'll get back to you.</p>
            </div>
          )}
          <Link to={path("/contact")} className="gc-btn gc-btn-primary">
            {isCreator ? "Let's work together" : "Get in touch"} <FaArrowRight />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function EmptyState({ icon, title, message }: { icon: ReactNode; title: string; message: string }) {
  return (
    <div className="gc-empty">
      <span className="gc-empty-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  function go(next: number) {
    onPageChange(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <nav className="gc-pagination" aria-label="Pagination">
      <button type="button" className="gc-page-btn" onClick={() => go(page - 1)} disabled={page <= 1}>
        <FaArrowLeft /> Prev
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          className="gc-page-btn"
          aria-current={p === page ? "page" : undefined}
          onClick={() => go(p)}
        >
          {p}
        </button>
      ))}
      <button type="button" className="gc-page-btn" onClick={() => go(page + 1)} disabled={page >= totalPages}>
        Next <FaArrowRight />
      </button>
    </nav>
  );
}
