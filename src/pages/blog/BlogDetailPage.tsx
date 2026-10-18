import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaLink, FaLinkedinIn, FaRegNewspaper, FaXTwitter } from "react-icons/fa6";
import { useBlogList, useBlogPost } from "../../api/hooks/useBlogPosts";
import { blogImageFor, formatFullDate, readingTime, splitTags } from "../../utils/format";
import { CtaBand, EmptyState, Reveal, SectionHead } from "../../site/ui";
import { usePageTitle } from "../../site/usePageTitle";

function ShareLinks({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — the address bar still has the link.
    }
  }

  return (
    <div className="gc-row" style={{ gap: 8 }}>
      <span className="gc-muted" style={{ fontSize: 14, marginRight: 4 }}>
        Share
      </span>
      <a
        className="gc-icon-btn"
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on LinkedIn"
      >
        <FaLinkedinIn />
      </a>
      <a
        className="gc-icon-btn"
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on X"
      >
        <FaXTwitter />
      </a>
      <button type="button" className="gc-icon-btn" onClick={copyLink} aria-label={copied ? "Link copied" : "Copy link"}>
        {copied ? <FaCheck /> : <FaLink />}
      </button>
    </div>
  );
}

export function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, isError } = useBlogPost(slug);
  const { data: relatedData } = useBlogList(1, 4);
  usePageTitle(post?.title ?? "Blog");

  if (isError) {
    return (
      <section className="gc-page-hero">
        <div className="gc-container">
          <Link to="/blog" className="gc-back">
            <FaArrowLeft /> All articles
          </Link>
          <EmptyState
            icon={<FaRegNewspaper />}
            title="Article not found"
            message="The article you're looking for doesn't exist or may have been removed."
          />
        </div>
      </section>
    );
  }

  if (isLoading || !post) {
    return (
      <section className="gc-page-hero" aria-busy="true">
        <div className="gc-container gc-stack gc-gap-16" style={{ maxWidth: 820 }}>
          <div className="gc-skeleton" style={{ height: 20, width: 160 }} />
          <div className="gc-skeleton" style={{ height: 56 }} />
          <div className="gc-skeleton" style={{ height: 360, borderRadius: 24 }} />
        </div>
      </section>
    );
  }

  const tags = splitTags(post.tags);
  const paragraphs = post.content.split(/\r?\n+/).filter((line) => line.trim().length > 0);
  const relatedPosts = (relatedData?.items ?? []).filter((item) => item.slug !== post.slug).slice(0, 3);

  return (
    <>
      <article>
        <header className="gc-page-hero">
          <div className="gc-container" style={{ maxWidth: 868 }}>
            <Link to="/blog" className="gc-back">
              <FaArrowLeft /> All articles
            </Link>
            <Reveal className="gc-stack gc-gap-16">
              <div className="gc-work-meta">
                <span>{formatFullDate(post.publishedDate)}</span>
                <span aria-hidden="true">·</span>
                <span>{readingTime(post.content)}</span>
              </div>
              <h1 className="gc-h1">{post.title}</h1>
            </Reveal>
          </div>
        </header>

        <div className="gc-container" style={{ maxWidth: 1068 }}>
          <Reveal className="gc-post-media" as="figure" >
            <img src={blogImageFor(post.id)} alt="" />
          </Reveal>
        </div>

        <div className="gc-container gc-section-tight" style={{ maxWidth: 868 }}>
          <div className="gc-prose">
            {(paragraphs.length > 0 ? paragraphs : [post.content]).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          <hr className="gc-divider gc-mt-40" />
          <div className="gc-row gc-mt-24" style={{ justifyContent: "space-between", gap: 16 }}>
            <div className="gc-chips">
              {tags.map((tag) => (
                <span className="gc-chip" key={tag}>
                  #{tag}
                </span>
              ))}
            </div>
            <ShareLinks title={post.title} />
          </div>
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="gc-section">
          <div className="gc-container">
            <SectionHead eyebrow="Keep reading" title="More articles" />
            <div className="gc-work-grid gc-work-grid-3">
              {relatedPosts.map((related) => (
                <Link key={related.id} to={`/blog/${related.slug}`} className="gc-post-card">
                  <div className="gc-post-media">
                    <img src={blogImageFor(related.id)} alt="" loading="lazy" />
                  </div>
                  <div className="gc-work-body">
                    <div className="gc-work-meta">
                      <span>{formatFullDate(related.publishedDate)}</span>
                    </div>
                    <h3 className="gc-work-title">{related.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand />
    </>
  );
}
