import { Link } from "react-router-dom";
import { FaArrowRight, FaFilePdf } from "react-icons/fa6";
import { uploadUrl } from "../../api/client";
import type { ExperienceDetails, Skill, Tool, UserProfile } from "../../api/types";
import { formatBio } from "../../utils/bio";
import { useImageLightbox } from "../../components/lightbox/useImageLightbox";
import { CopyEmailButton } from "../../components/CopyEmailButton";
import { AvailabilityBadge, Reveal, SocialLinks } from "../../site/ui";
import { usePortfolioPath } from "../../portfolio/PortfolioScope";

const LEVEL_ORDER = ["Expert", "Advanced", "Intermediate", "Beginner"];

interface HeroSectionProps {
  profile: UserProfile | undefined;
  experience: ExperienceDetails[] | undefined;
  skills: Skill[] | undefined;
  tools: Tool[] | undefined;
  projectCount: number | undefined;
}

export function HeroSection({ profile, experience, skills, tools, projectCount }: HeroSectionProps) {
  const path = usePortfolioPath();
  const portrait = uploadUrl(profile?.profilePicture);
  const resume = uploadUrl(profile?.resume);
  const { openAt, lightbox } = useImageLightbox(portrait ? [portrait] : []);
  const currentRole = experience?.find((exp) => !exp.endDate) ?? experience?.[0];
  const firstName = profile?.fullName.split(" ")[0];
  const topStack = [...(skills ?? [])]
    .sort((a, b) => LEVEL_ORDER.indexOf(a.proficiencyLevel) - LEVEL_ORDER.indexOf(b.proficiencyLevel))
    .slice(0, 3)
    .map((s) => s.skillName.toLowerCase())
    .join(" · ");
  const marqueeItems = [...(skills ?? []).map((s) => s.skillName), ...(tools ?? []).map((t) => t.toolName)];

  return (
    <>
      <section className="gc-hero" id="top">
        <div className="gc-container gc-hero-grid">
          <Reveal className="gc-hero-copy">
            <AvailabilityBadge />
            <h1 className="gc-display gc-hero-title">
              Hi, I'm {firstName ?? "…"}.
              <span className="gc-hero-role">
                {currentRole?.jobTitle ?? "Full Stack Developer"}.
              </span>
            </h1>
            <p className="gc-lead">{profile ? formatBio(profile.bio, profile.formattedExperience) : "\u00a0"}</p>
            <div className="gc-hero-actions">
              <Link to={path("/projects")} className="gc-btn gc-btn-primary">
                Explore my work <FaArrowRight />
              </Link>
              {resume && (
                <a className="gc-btn gc-btn-ghost" href={resume} target="_blank" rel="noreferrer">
                  <FaFilePdf /> Résumé
                </a>
              )}
              {profile?.email && <CopyEmailButton email={profile.email} />}
            </div>
            <SocialLinks profile={profile} />
          </Reveal>

          <Reveal className="gc-hero-visual" delay={120}>
            <span className="gc-portrait-accent" aria-hidden="true" />
            <button type="button" className="gc-portrait" onClick={() => portrait && openAt(0)} aria-label="View profile photo">
              {portrait ? (
                <img src={portrait} alt={profile?.fullName ?? ""} />
              ) : (
                <span className="gc-skeleton" style={{ position: "absolute", inset: 0 }} />
              )}
            </button>
            <div className="gc-terminal" aria-hidden="true">
              <div className="gc-terminal-bar">
                <i />
                <i />
                <i />
              </div>
              <div className="gc-terminal-body">
                <p>
                  <span className="gc-terminal-prompt">~ $</span> <span className="gc-terminal-cmd">whoami</span>
                </p>
                <p className="gc-terminal-out">{(profile?.fullName ?? "").toLowerCase()} · {(currentRole?.jobTitle ?? "developer").toLowerCase()}</p>
                <p>
                  <span className="gc-terminal-prompt">~ $</span> <span className="gc-terminal-cmd">stack --top</span>
                </p>
                <p className="gc-terminal-out">{topStack || "…"}</p>
                <p>
                  <span className="gc-terminal-prompt">~ $</span> <span className="gc-caret" />
                </p>
              </div>
            </div>
            {projectCount !== undefined && (
              <div className="gc-float-stat gc-float-stat-2">
                <strong>{projectCount}+</strong>
                <span>
                  projects
                  <br />
                  shipped
                </span>
              </div>
            )}
            {lightbox}
          </Reveal>
        </div>
      </section>

      {marqueeItems.length > 0 && (
        <div className="gc-marquee" aria-hidden="true">
          <div className="gc-marquee-track">
            {[0, 1].map((copy) => (
              <div className="gc-marquee-group" key={copy}>
                {marqueeItems.map((item) => (
                  <span className="gc-marquee-item" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
