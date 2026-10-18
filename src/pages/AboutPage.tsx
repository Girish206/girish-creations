import { Link } from "react-router-dom";
import { FaBolt, FaBriefcase, FaCode, FaFilePdf, FaHandshake, FaLayerGroup, FaRocket } from "react-icons/fa6";
import { useProfile } from "../api/hooks/useProfile";
import { useExperience } from "../api/hooks/useExperience";
import { useCertifications } from "../api/hooks/useCertifications";
import { useSkills } from "../api/hooks/useSkills";
import { useTools } from "../api/hooks/useTools";
import { useProjectsList } from "../api/hooks/useProjects";
import { uploadUrl } from "../api/client";
import { formatBio } from "../utils/bio";
import { useImageLightbox } from "../components/lightbox/useImageLightbox";
import { CopyEmailButton } from "../components/CopyEmailButton";
import { ArrowUpRight, CtaBand, PortraitContent, Reveal, SectionHead, SocialLinks } from "../site/ui";
import { usePageTitle } from "../site/usePageTitle";
import { usePortfolioPath } from "../portfolio/PortfolioScope";
import { useIsClassic } from "../portfolio/portfolioStyle";
import { CertificationsSection } from "./home/ProfileSections";

const VALUES = [
  {
    icon: <FaLayerGroup />,
    title: "End-to-end ownership",
    text: "From the data model to deployment, I take a feature all the way to production instead of handing off halves.",
  },
  {
    icon: <FaBolt />,
    title: "Ship early, iterate",
    text: "Working software in front of real users beats a perfect plan. I share progress early and refine from feedback.",
  },
  {
    icon: <FaHandshake />,
    title: "Clear communication",
    text: "Plain-language updates, honest estimates and documentation that the next developer will thank you for.",
  },
];

export function AboutPage() {
  const path = usePortfolioPath();
  const classic = useIsClassic();
  usePageTitle("About");
  const { data: profile } = useProfile();
  const { data: experience } = useExperience();
  const { data: certifications } = useCertifications();
  const { data: skills } = useSkills();
  const { data: tools } = useTools();
  const { data: projectsPage } = useProjectsList(1, 1);

  const portrait = uploadUrl(profile?.profilePicture);
  const { openAt, lightbox } = useImageLightbox(portrait ? [portrait] : []);
  const currentRole = experience?.find((exp) => !exp.endDate) ?? experience?.[0];

  // Only numbers worth showing: a new portfolio's zeros are left out.
  const stats = [
    { count: profile?.formattedExperienceInYears, value: `${profile?.formattedExperienceInYears}+`, label: "Years of experience" },
    { count: projectsPage?.total, value: `${projectsPage?.total}+`, label: "Projects" },
    { count: skills?.length, value: String(skills?.length), label: classic ? "Skills" : "Technologies" },
    { count: tools?.length, value: String(tools?.length), label: "Tools" },
  ].filter((stat) => stat.count);
  const facts = [
    { label: "Current role", value: currentRole ? `${currentRole.jobTitle}, ${currentRole.companyName}` : undefined },
    { label: "Experience", value: profile?.formattedExperience },
    { label: "Based in", value: profile?.address ?? undefined },
    {
      label: "Phone",
      value: profile?.contactNumber ? `+91 ${profile.contactNumber}` : undefined,
      href: profile?.contactNumber ? `tel:+91${profile.contactNumber}` : undefined,
    },
  ].filter((fact) => fact.value);

  const counts = profile?.counts;
  const explore = [
    counts && counts.experience + counts.education > 0 && {
      to: "/experience",
      icon: <FaBriefcase />,
      title: "Experience",
      text: "Work history and education.",
    },
    counts && counts.skills + counts.tools > 0 && {
      to: "/skills",
      icon: <FaCode />,
      title: "Skills & tools",
      text: "Skills and the tools I use.",
    },
    counts && counts.projects > 0 && {
      to: "/projects",
      icon: <FaRocket />,
      title: "Projects",
      text: "A closer look at my work.",
    },
  ].filter((item): item is Exclude<typeof item, false | undefined> => Boolean(item));

  return (
    <>
      <section className="gc-page-hero">
        <div className="gc-container gc-about-hero">
          <Reveal className="gc-about-photo">
            <span className="gc-portrait-accent" aria-hidden="true" />
            <button type="button" className="gc-portrait" onClick={() => portrait && openAt(0)} aria-label="View profile photo">
              <PortraitContent profile={profile} src={portrait} />
            </button>
            {lightbox}
          </Reveal>

          <Reveal className="gc-stack gc-gap-24" delay={80}>
            <span className="gc-eyebrow">About me</span>
            <h1 className="gc-h1">
              Hi, I'm <span className="gc-accent-text">{profile?.fullName ?? "…"}</span>
            </h1>
            {profile?.bio && <p className="gc-lead">{formatBio(profile.bio, profile.formattedExperience)}</p>}
            {profile?.objective && <p>{profile.objective}</p>}
            <dl className="gc-facts gc-facts-2">
              {facts.map((fact) => (
                <div className="gc-fact" key={fact.label}>
                  <dt className="gc-fact-label">{fact.label}</dt>
                  <dd className="gc-fact-value">
                    {fact.href ? (
                      <a className="gc-link" href={fact.href}>
                        {fact.value}
                      </a>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="gc-row" style={{ gap: 12 }}>
              {profile?.resume && (
                <a className="gc-btn gc-btn-primary" href={uploadUrl(profile.resume)} target="_blank" rel="noreferrer">
                  <FaFilePdf /> Download résumé
                </a>
              )}
              {profile?.email && <CopyEmailButton email={profile.email} />}
            </div>
            <SocialLinks profile={profile} />
          </Reveal>
        </div>
      </section>

      {stats.length > 0 && (
        <section className="gc-section-tight">
          <div className="gc-container">
            <Reveal className="gc-stats">
              {stats.map((stat) => (
                <div className="gc-stat" key={stat.label}>
                  <strong className="gc-accent-text">{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* How the creator works with freelance clients — their portfolio only. */}
      {profile?.isCreator && (
        <section className="gc-section">
          <div className="gc-container">
            <SectionHead eyebrow="How I work" title="What you can expect" />
            <div className="gc-value-grid">
              {VALUES.map((value, i) => (
                <Reveal className="gc-value gc-glass gc-spot" key={value.title} delay={i * 80}>
                  <span className="gc-service-icon" aria-hidden="true">
                    {value.icon}
                  </span>
                  <h3 className="gc-h3">{value.title}</h3>
                  <p>{value.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <CertificationsSection certifications={certifications} />

      {explore.length > 0 && (
        <section className="gc-section">
          <div className="gc-container">
            <SectionHead eyebrow="Keep exploring" title="Dig deeper" />
            <div className="gc-explore-grid">
              {explore.map((item, i) => (
                <Reveal key={item.to} delay={i * 80}>
                  <Link to={path(item.to)} className="gc-tile gc-glass gc-spot" style={{ height: "100%", minHeight: 0 }}>
                    <span className="gc-tile-label">
                      {item.icon} {item.title}
                    </span>
                    <p>{item.text}</p>
                    <span className="gc-tile-foot">
                      <span className="gc-muted">Open</span>
                      <span className="gc-tile-arrow">
                        <ArrowUpRight />
                      </span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand />
    </>
  );
}
