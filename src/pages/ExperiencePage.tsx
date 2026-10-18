import { FaBuilding, FaGraduationCap, FaLocationDot } from "react-icons/fa6";
import { useExperience } from "../api/hooks/useExperience";
import { useEducation } from "../api/hooks/useEducation";
import { useProfile } from "../api/hooks/useProfile";
import { endYearOrPresent, formatDuration, yearOf } from "../utils/date";
import { formatFullDate } from "../utils/format";
import { CtaBand, Metrics, PageHero, Reveal, SectionHead } from "../site/ui";
import { usePageTitle } from "../site/usePageTitle";

// A role's description is free text with one point per line; show it as a
// list of points rather than one paragraph.
function descriptionPoints(description: string | null): string[] {
  if (!description) return [];
  return description
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean);
}

export function ExperiencePage() {
  usePageTitle("Experience");
  const { data: profile } = useProfile();
  const { data: experience, isLoading } = useExperience();
  const { data: education } = useEducation();
  const companies = new Set(experience?.map((exp) => exp.companyName)).size;

  return (
    <>
      <PageHero
        eyebrow="Experience"
        title={
          <>
            My <span className="gc-accent-text">journey</span> so far
          </>
        }
        lead="The roles I've held, what I built in each, and the education behind it."
        aside={
          <Metrics
            items={[
              { value: profile?.formattedExperienceInYears ? `${profile.formattedExperienceInYears}+` : "—", label: "Years of experience" },
              { value: experience?.length ?? "—", label: "Roles" },
              { value: companies || "—", label: "Organisations" },
            ]}
          />
        }
      />

      <section className="gc-section-tight">
        <div className="gc-container">
          <SectionHead eyebrow="Work" title="Where I've worked" />
          {isLoading && !experience ? (
            <div className="gc-skeleton" style={{ height: 220, borderRadius: 24 }} />
          ) : (
            <ol className="gc-tl">
              {experience?.map((exp, i) => {
                const points = descriptionPoints(exp.description);
                return (
                  <Reveal as="li" key={exp.id} delay={i * 60} className={`gc-tl-item gc-glass gc-spot${exp.endDate ? "" : " is-current"}`}>
                    <span className="gc-tl-node" aria-hidden="true" />
                    <div className="gc-tl-head">
                      <div>
                        <span className="gc-tl-when">
                          {formatFullDate(exp.startDate)} — {exp.endDate ? formatFullDate(exp.endDate) : "Present"}
                        </span>
                        <h3 className="gc-tl-title">{exp.jobTitle}</h3>
                        <span className="gc-tl-sub">
                          <FaBuilding aria-hidden="true" /> {exp.companyName}
                          {exp.location && (
                            <>
                              <span aria-hidden="true">·</span>
                              <FaLocationDot aria-hidden="true" /> {exp.location}
                            </>
                          )}
                        </span>
                      </div>
                      <span className="gc-chip gc-chip-accent">{formatDuration(exp.startDate, exp.endDate)}</span>
                    </div>
                    {points.length > 0 && (
                      <ul className="gc-tl-points">
                        {points.map((point, j) => (
                          <li key={j}>{point}</li>
                        ))}
                      </ul>
                    )}
                  </Reveal>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      {education && education.length > 0 && (
        <section className="gc-section">
          <div className="gc-container">
            <SectionHead eyebrow="Education" title="Academic background" />
            <ol className="gc-tl">
              {education.map((edu, i) => (
                <Reveal as="li" key={edu.id} delay={i * 60} className="gc-tl-item gc-glass gc-spot">
                  <span className="gc-tl-node" aria-hidden="true" />
                  <div className="gc-tl-head">
                    <div>
                      <span className="gc-tl-when">
                        {yearOf(edu.startDate)} — {endYearOrPresent(edu.endDate)}
                      </span>
                      <h3 className="gc-tl-title">
                        {edu.course}
                        {edu.specialization ? <span className="gc-muted"> · {edu.specialization}</span> : null}
                      </h3>
                      <span className="gc-tl-sub">
                        <FaGraduationCap aria-hidden="true" /> {edu.institutionName}
                      </span>
                    </div>
                    <span className="gc-chip">{Number(edu.grade)}%</span>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      )}

      <CtaBand />
    </>
  );
}
