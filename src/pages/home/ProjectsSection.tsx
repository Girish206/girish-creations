import { Link } from "react-router-dom";
import { FaArrowRight, FaFolderOpen } from "react-icons/fa6";
import type { ProjectDetails } from "../../api/types";
import { EmptyState, Reveal, SectionHead, WorkCard, WorkCardSkeleton } from "../../site/ui";
import { usePortfolioPath } from "../../portfolio/PortfolioScope";

// Projects page: every project (isPage). Home: just the latest few
// (`featured`), linking through to the full list.
export function ProjectsSection({
  projects,
  isLoading,
  isPage = false,
  featured,
}: {
  projects: ProjectDetails[] | undefined;
  isLoading: boolean;
  isPage?: boolean;
  featured?: number;
}) {
  const path = usePortfolioPath();
  const shown = featured ? projects?.slice(0, featured) : projects;
  const hasMore = featured !== undefined && (projects?.length ?? 0) > featured;

  return (
    <section className={`gc-section${isPage ? " gc-section-page" : ""}`} id="projects">
      <div className="gc-container">
        <SectionHead
          level={isPage ? 1 : 2}
          eyebrow="Projects"
          title={
            isPage ? (
              <>
                All <span className="gc-accent-text">projects</span>
              </>
            ) : (
              "Recent work"
            )
          }
          description={
            isPage && projects?.length
              ? `All ${projects.length} applications I've designed, built and deployed end to end. Open any one for the full story.`
              : "Applications designed, built and deployed end to end."
          }
          action={
            hasMore ? (
              <Link to={path("/projects")} className="gc-link">
                All {projects?.length} projects <FaArrowRight />
              </Link>
            ) : undefined
          }
        />
        <div className="gc-work-grid gc-work-grid-3">
          {isLoading && !projects
            ? Array.from({ length: 3 }, (_, i) => <WorkCardSkeleton key={i} />)
            : shown?.map((project, i) => (
                <Reveal key={project.id} delay={(i % 3) * 80}>
                  <WorkCard project={project} showDescription />
                </Reveal>
              ))}
          {!isLoading && projects?.length === 0 && (
            <EmptyState icon={<FaFolderOpen />} title="No projects yet" message="New work will show up here soon." />
          )}
        </div>
      </div>
    </section>
  );
}
