import { useState } from "react";
import { useSkills } from "../api/hooks/useSkills";
import { useTools } from "../api/hooks/useTools";
import type { ProficiencyLevel } from "../api/types";
import { monogram } from "../utils/format";
import { FaCode } from "react-icons/fa6";
import { CtaBand, EmptyState, PageHero, Reveal, SectionHead } from "../site/ui";
import { usePageTitle } from "../site/usePageTitle";
import { useIsClassic } from "../portfolio/portfolioStyle";

const LEVELS: ProficiencyLevel[] = ["Expert", "Advanced", "Intermediate", "Beginner"];
const LEVEL_RANK: Record<ProficiencyLevel, number> = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };

type Filter = ProficiencyLevel | "All";

function LevelMeter({ level }: { level: ProficiencyLevel }) {
  return (
    <span className="gc-level" role="img" aria-label={`${level}, ${LEVEL_RANK[level]} out of 4`}>
      {[1, 2, 3, 4].map((n) => (
        <i key={n} className={n <= LEVEL_RANK[level] ? "on" : ""} />
      ))}
    </span>
  );
}

export function SkillsPage() {
  usePageTitle("Skills");
  const classic = useIsClassic();
  const { data: skills, isLoading } = useSkills();
  const { data: tools } = useTools();
  const [filter, setFilter] = useState<Filter>("All");

  const sorted = [...(skills ?? [])].sort((a, b) => LEVEL_RANK[b.proficiencyLevel] - LEVEL_RANK[a.proficiencyLevel]);
  const shown = filter === "All" ? sorted : sorted.filter((skill) => skill.proficiencyLevel === filter);
  const countFor = (level: ProficiencyLevel) => sorted.filter((skill) => skill.proficiencyLevel === level).length;
  const levels = LEVELS.filter((level) => countFor(level) > 0);

  return (
    <>
      <PageHero
        eyebrow="Skills & tools"
        title={
          classic ? (
            <>
              Skills &amp; <span className="gc-accent-text">strengths</span>
            </>
          ) : (
            <>
              The <span className="gc-accent-text">stack</span> I build with
            </>
          )
        }
      />

      {!isLoading && !skills?.length && !tools?.length && (
        <section className="gc-section-tight">
          <div className="gc-container">
            <EmptyState icon={<FaCode />} title="No skills listed yet" message="Check back soon." />
          </div>
        </section>
      )}

      {(isLoading || Boolean(skills?.length)) && (
        <>
          <section className="gc-section-tight">
            <div className="gc-container">
              <Reveal className="gc-level-summary" style={{ gridTemplateColumns: `repeat(${Math.max(levels.length, 1)}, minmax(0, 1fr))` }}>
                {levels.map((level) => (
                  <div className="gc-metric gc-glass" key={level}>
                    <strong>{countFor(level)}</strong>
                    <span>{level}</span>
                    <LevelMeter level={level} />
                  </div>
                ))}
              </Reveal>
            </div>
          </section>

          <section className="gc-section-tight">
            <div className="gc-container">
              <SectionHead
                eyebrow={classic ? "Skills" : "Technologies"}
                title={`${skills?.length ?? 0} ${classic ? "skills" : "technologies"}`}
              />
              <div className="gc-toolbar">
                <div className="gc-tabs" role="group" aria-label="Filter by proficiency">
                  {(["All", ...levels] as Filter[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      className="gc-tab"
                      aria-pressed={filter === level}
                      onClick={() => setFilter(level)}
                    >
                      {level}
                      <span className="gc-tab-count">{level === "All" ? sorted.length : countFor(level)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="gc-skill-grid">
                {isLoading && !skills
                  ? Array.from({ length: 8 }, (_, i) => <div key={i} className="gc-skeleton" style={{ height: 76, borderRadius: 16 }} />)
                  : shown.map((skill, i) => (
                      <Reveal key={`${filter}-${skill.id}`} delay={(i % 4) * 50}>
                        <div className="gc-skill-card gc-glass gc-spot">
                          <span className="gc-monogram" aria-hidden="true">
                            {monogram(skill.skillName)}
                          </span>
                          <div className="gc-skill-card-body">
                            <span className="gc-skill-card-name">{skill.skillName}</span>
                            <span className="gc-skill-card-level">
                              {skill.proficiencyLevel}
                              <LevelMeter level={skill.proficiencyLevel} />
                            </span>
                          </div>
                        </div>
                      </Reveal>
                    ))}
              </div>
            </div>
          </section>
        </>
      )}

      {tools && tools.length > 0 && (
        <section className="gc-section">
          <div className="gc-container">
            <SectionHead eyebrow="Toolbox" title="Tools" />
            <div className="gc-skill-grid">
              {tools.map((tool, i) => (
                <Reveal key={tool.id} delay={(i % 4) * 50}>
                  <div className="gc-skill-card gc-glass gc-spot">
                    <span className="gc-monogram" aria-hidden="true">
                      {monogram(tool.toolName)}
                    </span>
                    <div className="gc-skill-card-body">
                      <span className="gc-skill-card-name">{tool.toolName}</span>
                    </div>
                  </div>
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
