import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FaBriefcase, FaCheck, FaCode, FaLocationDot, FaPaperPlane, FaRocket, FaUser, FaWandMagicSparkles } from "react-icons/fa6";
import type { ExperienceDetails, Skill, Tool, UserProfile } from "../../api/types";
import { formatDuration } from "../../utils/date";
import { ArrowUpRight, Reveal, SectionHead } from "../../site/ui";
import { SERVICES } from "./services";
import { usePortfolioPath } from "../../portfolio/PortfolioScope";
import { useIsClassic } from "../../portfolio/portfolioStyle";

// "#26A, 5th cross, …, Bengaluru 560092" -> "Bengaluru": the full street
// address belongs on the Contact page, not in a small tile.
function cityOf(address: string): string {
  return address.split(",").pop()?.replace(/\d+/g, "").trim() || address;
}

const LEVEL_ORDER = ["Expert", "Advanced", "Intermediate", "Beginner"];

interface Tile {
  key: string;
  wide?: boolean;
  to?: string;
  label: ReactNode;
  body: ReactNode;
  foot?: ReactNode;
}

// "At a glance" grid on the home page: one tile per topic, each linking to
// the page that covers it in full. A tile only appears once its topic has
// something in it, so a brand-new portfolio doesn't show filler.
export function BentoSection({
  profile,
  experience,
  skills,
  tools,
  projectCount,
}: {
  profile: UserProfile | undefined;
  experience: ExperienceDetails[] | undefined;
  skills: Skill[] | undefined;
  tools: Tool[] | undefined;
  projectCount: number | undefined;
}) {
  const path = usePortfolioPath();
  const classic = useIsClassic();
  if (!profile) return null;

  const currentRole = experience?.find((exp) => !exp.endDate) ?? experience?.[0];
  const topSkills = [...(skills ?? [])]
    .sort((a, b) => LEVEL_ORDER.indexOf(a.proficiencyLevel) - LEVEL_ORDER.indexOf(b.proficiencyLevel))
    .slice(0, 10);
  const firstName = profile.fullName.split(" ")[0];
  const aboutText = profile.objective || profile.bio;

  const tiles: (Tile | false)[] = [
    Boolean(aboutText) && {
      key: "about",
      wide: true,
      to: "/about",
      label: (
        <>
          <FaUser /> About
        </>
      ),
      body: (
        <>
          <span className="gc-tile-title">
            {profile.isCreator ? "Building products from the database up to the pixels." : `Get to know ${firstName}.`}
          </span>
          <p className="gc-clamp-4">{aboutText}</p>
        </>
      ),
      foot: <span className="gc-muted">More about me</span>,
    },
    profile.formattedExperienceInYears > 0 && {
      key: "experience",
      to: "/experience",
      label: (
        <>
          <FaBriefcase /> Experience
        </>
      ),
      body: <span className="gc-tile-big">{profile.formattedExperienceInYears}+</span>,
      foot: <span className="gc-muted">years of experience</span>,
    },
    Boolean(projectCount) && {
      key: "projects",
      to: "/projects",
      label: (
        <>
          <FaRocket /> Projects
        </>
      ),
      body: <span className="gc-tile-big">{projectCount}+</span>,
      foot: <span className="gc-muted">projects completed</span>,
    },
    currentRole !== undefined && {
      key: "current",
      wide: true,
      to: "/experience",
      label: (
        <>
          <span className="gc-status-dot" aria-hidden="true" /> {currentRole.endDate ? "Most recently" : "Currently"}
        </>
      ),
      body: (
        <>
          <span className="gc-tile-title">{currentRole.jobTitle}</span>
          <p>
            {currentRole.companyName}
            {currentRole.location ? ` · ${currentRole.location}` : ""}
          </p>
        </>
      ),
      foot: <span className="gc-chip gc-chip-accent">{formatDuration(currentRole.startDate, currentRole.endDate)}</span>,
    },
    topSkills.length > 0 && {
      key: "skills",
      wide: true,
      to: "/skills",
      label: (
        <>
          <FaCode /> {classic ? "Skills" : "Tech stack"}
        </>
      ),
      body: (
        <span className="gc-chips">
          {topSkills.map((skill) => (
            <span className="gc-chip" key={skill.id}>
              {skill.skillName}
            </span>
          ))}
        </span>
      ),
      foot: (
        <span className="gc-muted">
          {skills?.length ?? 0} {classic ? "skills" : "technologies"}
          {tools?.length ? ` · ${tools.length} tools` : ""}
        </span>
      ),
    },
    // Freelance services: the site creator's portfolio only.
    profile.isCreator && {
      key: "services",
      wide: true,
      to: "/services",
      label: (
        <>
          <FaWandMagicSparkles /> What I do
        </>
      ),
      body: (
        <ul className="gc-check-list">
          {SERVICES.map((service) => (
            <li key={service.title}>
              <FaCheck /> {service.title}
            </li>
          ))}
        </ul>
      ),
      foot: <span className="gc-muted">Services &amp; process</span>,
    },
    Boolean(profile.address) && {
      key: "location",
      label: (
        <>
          <FaLocationDot /> Based in
        </>
      ),
      body: <span className="gc-tile-title">{cityOf(profile.address!)}</span>,
      foot: profile.isCreator ? <span className="gc-muted">Open to remote work</span> : undefined,
    },
    {
      key: "contact",
      to: "/contact",
      label: (
        <>
          <FaPaperPlane /> Say hello
        </>
      ),
      body: (
        <span className="gc-tile-title">{profile.isCreator ? "Let's build something together." : "Let's connect."}</span>
      ),
      foot: <span className="gc-muted">Get in touch</span>,
    },
  ];
  const shown = tiles.filter((tile): tile is Tile => Boolean(tile));

  // Just the "Say hello" tile on its own isn't worth a section.
  if (shown.length < 2) return null;

  return (
    <section className="gc-section" id="overview">
      <div className="gc-container">
        <SectionHead eyebrow="At a glance" title="Everything in one place" />
        <div className="gc-bento">
          {shown.map((tile, i) => {
            const content = (
              <>
                <span className="gc-tile-label">{tile.label}</span>
                {tile.body}
                <span className="gc-tile-foot">
                  {tile.foot ?? <span />}
                  {tile.to && (
                    <span className="gc-tile-arrow">
                      <ArrowUpRight />
                    </span>
                  )}
                </span>
              </>
            );
            return (
              <Reveal key={tile.key} className={tile.wide ? "gc-tile-2" : undefined} delay={(i % 3) * 60}>
                {tile.to ? (
                  <Link to={path(tile.to)} className="gc-tile gc-glass gc-spot" style={{ height: "100%" }}>
                    {content}
                  </Link>
                ) : (
                  <div className="gc-tile gc-glass gc-spot" style={{ height: "100%" }}>
                    {content}
                  </div>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
