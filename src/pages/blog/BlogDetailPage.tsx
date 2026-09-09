import { Link, useParams } from "react-router-dom";
import { FaFacebook, FaGithub, FaPinterest, FaYoutube } from "react-icons/fa6";
import { ProfileCard } from "../../layouts/ProfileCard";
import { useBlogList, useBlogPost } from "../../api/hooks/useBlogPosts";
import { blogImageFor, formatFullDate, readingTime, splitTags } from "../../utils/format";

export function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, isError } = useBlogPost(slug);
  const { data: relatedData } = useBlogList(1, 3);

  if (isError) {
    return (
      <section className="content-box-area mt-4">
        <div className="container">
          <div className="row g-4">
            <div className="col-xl-4">
              <ProfileCard />
            </div>
            <div className="col-xl-8">
              <div className="card content-box-card">
                <div className="card-body portfolio-card text-center">
                  <h4 className="card-title">Post not found</h4>
                  <p>
                    The article you're looking for doesn't exist or may have been removed.
                    <br />
                    <Link to="/blog">Back to Blog</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading || !post) {
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
                  <p>Loading...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const tags = splitTags(post.tags);
  const paragraphs = post.content.split(/\r?\n+/).filter((line) => line.trim().length > 0);
  const relatedPosts = (relatedData?.items ?? []).filter((item) => item.slug !== post.slug).slice(0, 2);

  return (
    <section className="content-box-area mt-4">
      <div className="container">
        <div className="row g-4">
          <div className="col-xl-4">
            <ProfileCard />
          </div>
          <div className="col-xl-8">
            <div className="card content-box-card">
              <div className="card-body portfolio-card article-details-card">
                <div className="article-details-area">
                  <div className="main-image">
                    <img src={blogImageFor(post.id)} alt={post.title} className="img-fluid w-100" />
                  </div>
                  <ul className="list-unstyled article-tags">
                    <li>{readingTime(post.content)}</li>
                    <li>{formatFullDate(post.publishedDate)}</li>
                  </ul>
                  <div className="article-details-text">
                    <h3 className="main-title">{post.title}</h3>
                    {paragraphs.length > 0 ? (
                      paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)
                    ) : (
                      <p>{post.content}</p>
                    )}
                    {tags.length > 0 && (
                      <div className="tags-and-share">
                        <div className="tags">
                          <h3 className="title">Tags:</h3>
                          <ul className="list-unstyled">
                            {tags.map((tag) => (
                              <li key={tag}>
                                <a href="#">{tag}</a>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="share">
                          <h3 className="title">Share:</h3>
                          <div className="social-media-icon mt-0">
                            <ul className="list-unstyled">
                              <li>
                                <a href="#">
                                  <FaFacebook />
                                </a>
                              </li>
                              <li>
                                <a href="#">
                                  <FaPinterest />
                                </a>
                              </li>
                              <li>
                                <a href="#">
                                  <FaGithub />
                                </a>
                              </li>
                              <li>
                                <a href="#">
                                  <FaYoutube />
                                </a>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    {relatedPosts.length > 0 && (
                      <div className="related-post">
                        <h2 className="main-common-title">Related Post</h2>
                        <div className="row g-4">
                          {relatedPosts.map((related) => (
                            <div className="col-md-6" key={related.id}>
                              <div className="article-publications-item">
                                <div className="image">
                                  <Link to={`/blog/${related.slug}`} className="d-block w-100">
                                    <img
                                      src={blogImageFor(related.id)}
                                      alt={related.title}
                                      className="img-fluid w-100"
                                    />
                                  </Link>
                                </div>
                                <div className="text">
                                  <Link to={`/blog/${related.slug}`} className="title">
                                    {related.title}
                                  </Link>
                                  <ul className="list-unstyled">
                                    <li>{readingTime(related.content)}</li>
                                    <li>{formatFullDate(related.publishedDate)}</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
