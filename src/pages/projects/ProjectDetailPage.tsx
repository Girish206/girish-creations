import { Link, useParams } from "react-router-dom";
import { FaArrowLeft, FaArrowRight, FaFolderOpen } from "react-icons/fa6";
import { useProject, useProjectsList } from "../../api/hooks/useProjects";
import { uploadUrl } from "../../api/client";
import { formatDuration } from "../../utils/date";
import { formatYear } from "../../utils/format";
import { ArrowUpRight, CtaBand, EmptyState, Reveal } from "../../site/ui";
import { usePageTitle } from "../../site/usePageTitle";
import { ALL_PROJECTS } from "../home/constants";
import { usePortfolioPath } from "../../portfolio/PortfolioScope";

export function ProjectDetailPage() {
  const path = usePortfolioPath();
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, isError } = useProject(id);
  const { data: allProjects } = useProjectsList(1, ALL_PROJECTS);
  usePageTitle(project?.title ?? "Work");

  if (isError) {
    return (
      <section className="gc-page-hero">
        <div className="gc-container">
          <Link to={path("/projects")} className="gc-back">
            <FaArrowLeft /> All projects
          </Link>
          <EmptyState
            icon={<FaFolderOpen />}
            title="Project not found"
            message="The project you're looking for doesn't exist or may have been removed."
          />
        </div>
      </section>
    );
  }

  if (isLoading || !project) {
    return (
      <section className="gc-page-hero" aria-busy="true">
        <div className="gc-container gc-stack gc-gap-16">
          <div className="gc-skeleton" style={{ height: 20, width: 120 }} />
          <div className="gc-skeleton" style={{ height: 56, width: "60%" }} />
          <div className="gc-skeleton" style={{ height: 380, borderRadius: 28 }} />
        </div>
      </section>
    );
  }

  const image = uploadUrl(project.image);
  const paragraphs = project.description.split(/\r?\n+/).filter((line) => line.trim());
  const list = allProjects?.items ?? [];
  const index = list.findIndex((item) => item.id === project.id);
  const prev = index > 0 ? list[index - 1] : undefined;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : undefined;

  const facts = [
    { label: "Stack", value: project.technologiesUsed },
    { label: "Timeline", value: `${formatYear(project.startDate)} – ${formatYear(project.endDate)}` },
    { label: "Duration", value: formatDuration(project.startDate, project.endDate) },
    { label: "Status", value: project.endDate ? "Delivered" : "Ongoing" },
  ];

  return (
    <>
      <section className="gc-page-hero">
        <div className="gc-container">
          <Link to={path("/projects")} className="gc-back">
            <FaArrowLeft /> All projects
          </Link>
          <Reveal className="gc-stack gc-gap-24">
            <span className="gc-eyebrow">Case study · {project.technologiesUsed}</span>
            <h1 className="gc-h1">{project.title}</h1>
            {project.projectUrl && (
              <div>
                <a className="gc-btn gc-btn-primary" href={project.projectUrl} target="_blank" rel="noreferrer">
                  Visit live site <ArrowUpRight />
                </a>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {image && (
        <section>
          <div className="gc-container">
            <Reveal className="gc-case-media">
              <div className="gc-detail-media">
                <img src={image} alt={project.title} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <section className="gc-section">
        <div className="gc-container gc-case-grid">
          <Reveal className="gc-case-aside gc-glass" as="dl">
            {facts.map((fact) => (
              <div className="gc-fact" key={fact.label}>
                <dt className="gc-fact-label">{fact.label}</dt>
                <dd className="gc-fact-value">{fact.value}</dd>
              </div>
            ))}
            {project.projectUrl && (
              <div className="gc-fact">
                <dt className="gc-fact-label">Live site</dt>
                <dd className="gc-fact-value">
                  <a className="gc-link" href={project.projectUrl} target="_blank" rel="noreferrer">
                    {project.projectUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                </dd>
              </div>
            )}
          </Reveal>
          <Reveal className="gc-stack gc-gap-16" delay={80}>
            <h2 className="gc-h2">Overview</h2>
            <div className="gc-prose">
              {paragraphs.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {(prev || next) && (
        <section className="gc-section-tight">
          <nav className="gc-container gc-pager" aria-label="More projects">
            {prev ? (
              <Link to={path(`/projects/${prev.id}`)} className="gc-pager-link gc-glass gc-spot">
                <span>
                  <FaArrowLeft /> Previous
                </span>
                <strong>{prev.title}</strong>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={path(`/projects/${next.id}`)} className="gc-pager-link is-next gc-glass gc-spot">
                <span>
                  Next <FaArrowRight />
                </span>
                <strong>{next.title}</strong>
              </Link>
            )}
          </nav>
        </section>
      )}

      <CtaBand />
    </>
  );
}
