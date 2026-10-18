import { Link } from "react-router-dom";
import { FaBriefcase, FaCheck, FaCode, FaLocationDot, FaPaperPlane, FaRocket, FaUser, FaWandMagicSparkles } from "react-icons/fa6";
import type { ExperienceDetails, Skill, Tool, UserProfile } from "../../api/types";
import { formatDuration } from "../../utils/date";
import { ArrowUpRight, Reveal, SectionHead } from "../../site/ui";
import { SERVICES } from "./services";
import { usePortfolioPath } from "../../portfolio/PortfolioScope";

// "#26A, 5th cross, …, Bengaluru 560092" -> "Bengaluru, India": the full
// street address belongs on the Contact page, not in a small tile.
function cityOf(address: string | null | undefined): string {
  const last = address?.split(",").pop()?.replace(/\d+/g, "").trim();
  return last ? `${last}, India` : "India";
}

const LEVEL_ORDER = ["Expert", "Advanced", "Intermediate", "Beginner"];

// "At a glance" grid on the home page: one tile per topic, each linking to
// the page that covers it in full.
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
  const currentRole = experience?.find((exp) => !exp.endDate) ?? experience?.[0];
  const topSkills = [...(skills ?? [])]
    .sort((a, b) => LEVEL_ORDER.indexOf(a.proficiencyLevel) - LEVEL_ORDER.indexOf(b.proficiencyLevel))
    .slice(0, 10);

  return (
    <section className="gc-section" id="overview">
      <div className="gc-container">
        <SectionHead eyebrow="At a glance" title="Everything in one place" />
        <div className="gc-bento">
          <Reveal className="gc-tile-2" delay={0}>
            <Link to={path("/about")} className="gc-tile gc-glass gc-spot" style={{ height: "100%" }}>
              <span className="gc-tile-label">
                <FaUser /> About
              </span>
              <span className="gc-tile-title">Building products from the database up to the pixels.</span>
              {profile?.objective && <p className="gc-clamp-4">{profile.objective}</p>}
              <span className="gc-tile-foot">
                <span className="gc-muted">More about me</span>
                <span className="gc-tile-arrow">
                  <ArrowUpRight />
                </span>
              </span>
            </Link>
          </Reveal>

          <Reveal delay={60}>
            <Link to={path("/experience")} className="gc-tile gc-glass gc-spot" style={{ height: "100%" }}>
              <span className="gc-tile-label">
                <FaBriefcase /> Experience
              </span>
              <span className="gc-tile-big">{profile ? `${profile.formattedExperienceInYears}+` : "—"}</span>
              <span className="gc-tile-foot">
                <span className="gc-muted">years shipping software</span>
                <span className="gc-tile-arrow">
                  <ArrowUpRight />
                </span>
              </span>
            </Link>
          </Reveal>

          <Reveal delay={120}>
            <Link to={path("/projects")} className="gc-tile gc-glass gc-spot" style={{ height: "100%" }}>
              <span className="gc-tile-label">
                <FaRocket /> Projects
              </span>
              <span className="gc-tile-big">{projectCount !== undefined ? `${projectCount}+` : "—"}</span>
              <span className="gc-tile-foot">
                <span className="gc-muted">apps built end to end</span>
                <span className="gc-tile-arrow">
                  <ArrowUpRight />
                </span>
              </span>
            </Link>
          </Reveal>

          <Reveal className="gc-tile-2" delay={0}>
            <Link to={path("/experience")} className="gc-tile gc-glass gc-spot" style={{ height: "100%" }}>
              <span className="gc-tile-label">
                <span className="gc-status-dot" aria-hidden="true" /> Currently
              </span>
              <span className="gc-tile-title">{currentRole?.jobTitle ?? "Full Stack Developer"}</span>
              {currentRole && (
                <p>
                  {currentRole.companyName}
                  {currentRole.location ? ` · ${currentRole.location}` : ""}
                </p>
              )}
              <span className="gc-tile-foot">
                {currentRole ? (
                  <span className="gc-chip gc-chip-accent">{formatDuration(currentRole.startDate, currentRole.endDate)}</span>
                ) : (
                  <span />
                )}
                <span className="gc-tile-arrow">
                  <ArrowUpRight />
                </span>
              </span>
            </Link>
          </Reveal>

          <Reveal className="gc-tile-2" delay={60}>
            <Link to={path("/skills")} className="gc-tile gc-glass gc-spot" style={{ height: "100%" }}>
              <span className="gc-tile-label">
                <FaCode /> Tech stack
              </span>
              <span className="gc-chips">
                {topSkills.map((skill) => (
                  <span className="gc-chip" key={skill.id}>
                    {skill.skillName}
                  </span>
                ))}
              </span>
              <span className="gc-tile-foot">
                <span className="gc-muted">
                  {skills?.length ?? 0} technologies · {tools?.length ?? 0} tools
                </span>
                <span className="gc-tile-arrow">
                  <ArrowUpRight />
                </span>
              </span>
            </Link>
          </Reveal>

          <Reveal className="gc-tile-2" delay={0}>
            <Link to={path("/services")} className="gc-tile gc-glass gc-spot" style={{ height: "100%" }}>
              <span className="gc-tile-label">
                <FaWandMagicSparkles /> What I do
              </span>
              <ul className="gc-check-list">
                {SERVICES.map((service) => (
                  <li key={service.title}>
                    <FaCheck /> {service.title}
                  </li>
                ))}
              </ul>
              <span className="gc-tile-foot">
                <span className="gc-muted">Services &amp; process</span>
                <span className="gc-tile-arrow">
                  <ArrowUpRight />
                </span>
              </span>
            </Link>
          </Reveal>

          <Reveal delay={60}>
            <div className="gc-tile gc-glass gc-spot" style={{ height: "100%" }}>
              <span className="gc-tile-label">
                <FaLocationDot /> Based in
              </span>
              <span className="gc-tile-title">{cityOf(profile?.address)}</span>
              <span className="gc-tile-foot">
                <span className="gc-muted">Open to remote work</span>
              </span>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <Link to={path("/contact")} className="gc-tile gc-glass gc-spot" style={{ height: "100%" }}>
              <span className="gc-tile-label">
                <FaPaperPlane /> Say hello
              </span>
              <span className="gc-tile-title">Let's build something together.</span>
              <span className="gc-tile-foot">
                <span className="gc-muted">Get in touch</span>
                <span className="gc-tile-arrow">
                  <ArrowUpRight />
                </span>
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
