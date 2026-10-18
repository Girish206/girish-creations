import { useState } from "react";
import { FaFolderOpen, FaMagnifyingGlass } from "react-icons/fa6";
import { useProjectsList } from "../../api/hooks/useProjects";
import { CtaBand, EmptyState, Metrics, PageHero, Reveal, WorkCard, WorkCardSkeleton } from "../../site/ui";
import { usePageTitle } from "../../site/usePageTitle";
import { ALL_PROJECTS } from "../home/constants";

// Every project on one page, filterable by stack and searchable by name.
export function ProjectsListPage() {
  usePageTitle("Projects");
  const { data, isLoading } = useProjectsList(1, ALL_PROJECTS);
  const [stack, setStack] = useState("All");
  const [query, setQuery] = useState("");

  const projects = data?.items ?? [];
  const stacks = [...new Set(projects.map((project) => project.technologiesUsed.trim()))].sort();
  const needle = query.trim().toLowerCase();
  const shown = projects.filter(
    (project) =>
      (stack === "All" || project.technologiesUsed.trim() === stack) &&
      (!needle || `${project.title} ${project.description} ${project.technologiesUsed}`.toLowerCase().includes(needle)),
  );
  const live = projects.filter((project) => project.projectUrl).length;

  return (
    <>
      <PageHero
        eyebrow="Projects"
        title={
          <>
            Things I've <span className="gc-accent-text">built</span>
          </>
        }
        lead="Applications I've designed, built and deployed end to end. Open any one for the full case study."
        aside={
          <Metrics
            items={[
              { value: data ? data.total : "—", label: "Projects" },
              { value: stacks.length || "—", label: "Stacks" },
              { value: data ? live : "—", label: "Live sites" },
            ]}
          />
        }
      />

      <section className="gc-section-tight">
        <div className="gc-container">
          <div className="gc-toolbar">
            <div className="gc-tabs" role="group" aria-label="Filter by stack">
              {["All", ...stacks].map((name) => (
                <button key={name} type="button" className="gc-tab" aria-pressed={stack === name} onClick={() => setStack(name)}>
                  {name}
                  <span className="gc-tab-count">
                    {name === "All" ? projects.length : projects.filter((p) => p.technologiesUsed.trim() === name).length}
                  </span>
                </button>
              ))}
            </div>
            <label className="gc-search">
              <span className="gc-visually-hidden">Search projects</span>
              <FaMagnifyingGlass aria-hidden="true" />
              <input
                type="search"
                className="gc-input"
                placeholder="Search projects…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          <div className="gc-work-grid gc-work-grid-3">
            {isLoading && !data
              ? Array.from({ length: 3 }, (_, i) => <WorkCardSkeleton key={i} />)
              : shown.map((project, i) => (
                  <Reveal key={project.id} delay={(i % 3) * 80}>
                    <WorkCard project={project} showDescription />
                  </Reveal>
                ))}
            {!isLoading && shown.length === 0 && (
              <EmptyState
                icon={<FaFolderOpen />}
                title={projects.length ? "No matching projects" : "No projects yet"}
                message={projects.length ? "Try a different stack or search term." : "New work will show up here soon."}
              />
            )}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
