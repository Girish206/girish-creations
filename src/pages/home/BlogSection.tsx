import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa6";
import type { BlogPost } from "../../api/types";
import { blogImageFor, excerpt, formatFullDate, readingTime } from "../../utils/format";
import { Reveal, SectionHead } from "../../site/ui";
import { usePortfolioPath } from "../../portfolio/PortfolioScope";

// Only rendered once at least one article is published.
export function BlogSection({ posts, total }: { posts: BlogPost[] | undefined; total: number }) {
  const path = usePortfolioPath();
  if (!posts?.length) return null;
  return (
    <section className="gc-section" id="blog">
      <div className="gc-container">
        <SectionHead
          eyebrow="Blog"
          title="Articles & notes"
          action={
            total > posts.length ? (
              <Link to={path("/blog")} className="gc-link">
                All {total} articles <FaArrowRight />
              </Link>
            ) : undefined
          }
        />
        <div className="gc-work-grid gc-work-grid-3">
          {posts.map((post, i) => (
            <Reveal key={post.id} delay={(i % 3) * 80}>
              <Link to={path(`/blog/${post.slug}`)} className="gc-post-card">
                <div className="gc-post-media">
                  <img src={blogImageFor(post.id)} alt="" loading="lazy" />
                </div>
                <div className="gc-work-body">
                  <div className="gc-work-meta">
                    <span>{formatFullDate(post.publishedDate)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{readingTime(post.content)}</span>
                  </div>
                  <h3 className="gc-work-title">{post.title}</h3>
                  <p className="gc-work-desc">{excerpt(post.content)}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
