import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaMagnifyingGlass, FaUsers } from "react-icons/fa6";
import { usePortfolios } from "../../api/hooks/usePortfolios";
import { uploadUrl } from "../../api/client";
import type { PortfolioSummary } from "../../api/types";
import { EmptyState, Reveal } from "../../site/ui";
import { usePageTitle } from "../../site/usePageTitle";
import "./directory.css";

// Past this many people, a search box helps find someone.
const SEARCH_THRESHOLD = 6;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function PersonCard({ person, index }: { person: PortfolioSummary; index: number }) {
  const photo = uploadUrl(person.profilePicture);
  const years = person.formattedExperienceInYears;

  return (
    <Reveal as="li" delay={Math.min(index, 8) * 50}>
      <Link to={`/${person.username}`} className="gc-person gc-glass gc-spot">
        <span className="gc-person-avatar">
          {photo ? <img src={photo} alt="" loading="lazy" /> : <span aria-hidden="true">{initials(person.fullName)}</span>}
        </span>
        <span className="gc-person-content">
          <span className="gc-person-name">
            {person.fullName}
            {person.isCreator && <span className="gc-person-badge">Creator</span>}
          </span>
          {person.jobTitle && <span className="gc-person-role">{person.jobTitle}</span>}
          {years > 0 && (
            <span className="gc-person-exp">
              {years}+ year{years === 1 ? "" : "s"} experience
            </span>
          )}
        </span>
        <span className="gc-person-arrow" title="View portfolio">
          <FaArrowRight aria-hidden="true" />
          <span className="gc-visually-hidden">View portfolio</span>
        </span>
      </Link>
    </Reveal>
  );
}

function PersonCardSkeleton() {
  return (
    <li className="gc-person gc-glass" aria-hidden="true">
      <span className="gc-person-avatar gc-skeleton" />
      <span className="gc-person-content">
        <span className="gc-skeleton" style={{ height: 18, width: "70%" }} />
        <span className="gc-skeleton" style={{ height: 14, width: "55%" }} />
      </span>
    </li>
  );
}

// Home page: everyone with a portfolio on the site, each card opening that
// person's portfolio at /<username>.
export function PeopleDirectoryPage() {
  usePageTitle();
  const { data: people, isLoading, isError } = usePortfolios();
  const [query, setQuery] = useState("");
  const creator = people?.find((person) => person.isCreator);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!people || !needle) return people;
    return people.filter((person) =>
      [person.fullName, person.jobTitle, person.companyName, person.username]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [people, query]);

  return (
    <>
      <section className="gc-page-hero gc-directory-hero">
        <Reveal className="gc-container gc-stack">
          <span className="gc-eyebrow">Portfolios</span>
          <h1 className="gc-display">
            One place for every <span className="gc-accent-text">portfolio</span>.
          </h1>
          {/* The people listed use the platform; it was built by one person. */}
          <p className="gc-lead">
            Girish Creations is a portfolio platform designed and built by{" "}
            {creator ? <Link to={`/${creator.username}`}>{creator.fullName}</Link> : "Girish S"}. Everyone below
            showcases their work here — pick someone to explore their profile, experience and projects.
          </p>
          {people && people.length > 0 && (
            <p className="gc-directory-count">
              <FaUsers aria-hidden="true" /> {people.length} portfolio{people.length === 1 ? "" : "s"}
            </p>
          )}
        </Reveal>
      </section>

      <section className="gc-section gc-directory">
        <div className="gc-container">
          {people && people.length > SEARCH_THRESHOLD && (
            <label className="gc-directory-search gc-glass">
              <FaMagnifyingGlass aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, role or company"
                aria-label="Search portfolios"
              />
            </label>
          )}

          {isError ? (
            <EmptyState
              icon={<FaUsers />}
              title="Couldn't load portfolios"
              message="Something went wrong on our side. Please refresh the page to try again."
            />
          ) : isLoading ? (
            <ul className="gc-people">
              {[0, 1, 2].map((i) => (
                <PersonCardSkeleton key={i} />
              ))}
            </ul>
          ) : !shown || shown.length === 0 ? (
            <EmptyState
              icon={<FaUsers />}
              title={query ? "No one matches that search" : "No portfolios yet"}
              message={query ? "Try a different name, role or company." : "Portfolios will show up here once they're published."}
            />
          ) : (
            <ul className="gc-people">
              {shown.map((person, index) => (
                <PersonCard key={person.id} person={person} index={index} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
