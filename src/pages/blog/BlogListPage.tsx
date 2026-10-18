import { useState } from "react";
import { Link } from "react-router-dom";
import { FaRegNewspaper } from "react-icons/fa6";
import { useBlogList } from "../../api/hooks/useBlogPosts";
import { blogImageFor, excerpt, formatFullDate, readingTime, splitTags } from "../../utils/format";
import { EmptyState, PageHero, Pagination, Reveal, WorkCardSkeleton } from "../../site/ui";
import { usePageTitle } from "../../site/usePageTitle";
import { usePortfolioPath } from "../../portfolio/PortfolioScope";

export function BlogListPage() {
  const path = usePortfolioPath();
  usePageTitle("Blog");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBlogList(page, 9);
  const items = data?.items ?? [];

  return (
    <>
      <PageHero
        eyebrow="Blog"
        title={
          <>
            Articles &amp; <span className="gc-accent-text">notes</span>
          </>
        }
        lead="Notes on the projects I've built, the tools I use, and things I've picked up along the way."
      />

      <section className="gc-section-tight">
        <div className="gc-container">
          <div className="gc-work-grid gc-work-grid-3">
            {isLoading && !data
              ? Array.from({ length: 3 }, (_, i) => <WorkCardSkeleton key={i} />)
              : items.map((post, i) => {
                  const [tag] = splitTags(post.tags);
                  return (
                    <Reveal key={post.id} delay={(i % 3) * 80}>
                      <Link to={path(`/blog/${post.slug}`)} className="gc-post-card">
                        <div className="gc-post-media">
                          <img src={blogImageFor(post.id)} alt="" loading="lazy" />
                        </div>
                        <div className="gc-work-body">
                          <div className="gc-work-meta">
                            {tag && <span className="gc-chip gc-chip-accent">{tag}</span>}
                            <span>{formatFullDate(post.publishedDate)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{readingTime(post.content)}</span>
                          </div>
                          <h2 className="gc-work-title">{post.title}</h2>
                          <p className="gc-work-desc">{excerpt(post.content)}</p>
                        </div>
                      </Link>
                    </Reveal>
                  );
                })}
            {!isLoading && items.length === 0 && (
              <EmptyState
                icon={<FaRegNewspaper />}
                title="No articles yet"
                message="I haven't published anything here yet — check back soon."
              />
            )}
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </section>
    </>
  );
}
