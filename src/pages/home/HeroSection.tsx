import { Link } from "react-router-dom";
import { FaArrowRight, FaFilePdf } from "react-icons/fa6";
import { uploadUrl } from "../../api/client";
import type { ExperienceDetails, Skill, Tool, UserProfile } from "../../api/types";
import { formatBio } from "../../utils/bio";
import { useImageLightbox } from "../../components/lightbox/useImageLightbox";
import { CopyEmailButton } from "../../components/CopyEmailButton";
import { AvailabilityBadge, PortraitContent, Reveal, SocialLinks } from "../../site/ui";
import { usePortfolioPath } from "../../portfolio/PortfolioScope";
import { useIsClassic } from "../../portfolio/portfolioStyle";

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
  const classic = useIsClassic();
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
  // The scrolling tech ticker is part of the developer look only.
  const marqueeItems = classic
    ? []
    : [...(skills ?? []).map((s) => s.skillName), ...(tools ?? []).map((t) => t.toolName)];
  const bio = profile ? formatBio(profile.bio, profile.formattedExperience) || profile.objective : null;

  return (
    <>
      <section className="gc-hero" id="top">
        <div className="gc-container gc-hero-grid">
          <Reveal className="gc-hero-copy">
            <AvailabilityBadge />
            <h1 className="gc-display gc-hero-title">
              Hi, I'm {firstName ?? "…"}.
              {currentRole && <span className="gc-hero-role">{currentRole.jobTitle}.</span>}
            </h1>
            {(bio || !profile) && <p className="gc-lead">{bio || " "}</p>}
            <div className="gc-hero-actions">
              {projectCount ? (
                <Link to={path("/projects")} className="gc-btn gc-btn-primary">
                  {classic ? "See my work" : "Explore my work"} <FaArrowRight />
                </Link>
              ) : (
                <Link to={path("/about")} className="gc-btn gc-btn-primary">
                  More about me <FaArrowRight />
                </Link>
              )}
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
              <PortraitContent profile={profile} src={portrait} />
            </button>
            {!classic && profile && (
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
                  <p className="gc-terminal-out">
                    {[profile.fullName, currentRole?.jobTitle].filter(Boolean).join(" · ").toLowerCase()}
                  </p>
                  {topStack && (
                    <>
                      <p>
                        <span className="gc-terminal-prompt">~ $</span> <span className="gc-terminal-cmd">stack --top</span>
                      </p>
                      <p className="gc-terminal-out">{topStack}</p>
                    </>
                  )}
                  <p>
                    <span className="gc-terminal-prompt">~ $</span> <span className="gc-caret" />
                  </p>
                </div>
              </div>
            )}
            {projectCount ? (
              <div className="gc-float-stat gc-float-stat-2">
                <strong>{projectCount}+</strong>
                <span>
                  projects
                  <br />
                  completed
                </span>
              </div>
            ) : null}
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
