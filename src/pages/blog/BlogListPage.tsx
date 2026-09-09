import { useState } from "react";
import { Link } from "react-router-dom";
import { ProfileCard } from "../../layouts/ProfileCard";
import { PaginationControls } from "../../components/PaginationControls";
import { useBlogList } from "../../api/hooks/useBlogPosts";
import type { BlogPost } from "../../api/types";
import { blogImageFor, excerpt, formatFullDate, readingTime, splitTags } from "../../utils/format";

export function BlogListPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBlogList(page, 10);
  const items: BlogPost[] = data?.items ?? [];

  return (
    <section className="content-box-area mt-4">
      <div className="container">
        <div className="row g-4">
          <div className="col-xl-4">
            <ProfileCard />
          </div>
          <div className="col-xl-8">
            <div className="card content-box-card">
              <div className="card-body portfolio-card">
                <div className="top-info">
                  <div className="text">
                    <h1 className="main-title">My Recent Article and Publications</h1>
                    <p>Notes on the projects I've built, the tools I use, and things I've picked up along the way.</p>
                  </div>
                </div>
                <div className="article-publications article-area">
                  <div className="article-publications-main">
                    <div className="row">
                      {!isLoading && items.length === 0 && (
                        <div style={{ alignItems: "center", justifyContent: "center", display: "flex" }}>
                          <img src="/assets/img/shopping.png" style={{ maxHeight: 150, maxWidth: 150 }} alt="" />
                          <p>No Blog Posts</p>
                        </div>
                      )}
                      {items.map((post, i) => {
                        const [tag] = splitTags(post.tags);
                        return (
                          <div className="col-xl-6 col-lg-4 col-md-6" key={post.id}>
                            <div className="article-publications-item">
                              <div className="image">
                                <Link to={`/blog/${post.slug}`} className="d-block w-100">
                                  <img
                                    src={blogImageFor(i)}
                                    alt={post.title}
                                    className="img-fluid w-100"
                                  />
                                </Link>
                                {tag && (
                                  <Link to={`/blog/${post.slug}`} className="tags">
                                    {tag}
                                  </Link>
                                )}
                              </div>
                              <div className="text">
                                <Link to={`/blog/${post.slug}`} className="title">
                                  {post.title}
                                </Link>
                                <p className="excerpt">{excerpt(post.content)}</p>
                                <ul className="list-unstyled">
                                  <li>{readingTime(post.content)}</li>
                                  <li>{formatFullDate(post.publishedDate)}</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <PaginationControls page={page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* background shape area start */}
      <div className="background-shapes">
        <div className="shape-1 common-shape">
          <img src="/assets/img/bg/banner-shape-1.png" alt="banner-shape-1" />
        </div>
        <div className="shape-2 common-shape">
          <img src="/assets/img/bg/banner-shape-1.png" alt="banner-shape-1" />
        </div>
        <div className="threed-shape-1 move-with-cursor" data-value="1">
          <img src="/assets/img/bg/object-3d-1.png" alt="object-3d-1" />
        </div>
        <div className="threed-shape-2 move-with-cursor" data-value="1">
          <img src="/assets/img/bg/object-3d-2.png" alt="object-3d-2" />
        </div>
      </div>
      {/* background shape area end */}
    </section>
  );
}
