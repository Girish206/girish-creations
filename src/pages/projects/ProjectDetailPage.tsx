import { Link, useParams } from "react-router-dom";
import { ProfileCard } from "../../layouts/ProfileCard";
import { useProject } from "../../api/hooks/useProjects";
import { uploadUrl } from "../../api/client";
import { formatYear } from "../../utils/format";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, isError } = useProject(id);

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
                  <h4 className="card-title">Project not found</h4>
                  <p>
                    The project you're looking for doesn't exist or may have been removed.
                    <br />
                    <Link to="/projects">Back to Projects</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading || !project) {
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
                <div className="portfolio-details-area">
                  <div className="main-image">
                    <img src={uploadUrl(project.image)} alt={project.title} style={{ maxHeight: 400 }} />
                  </div>
                  <div className="portfolio-details-text">
                    <div className="short-info">
                      <div className="info-item">
                        <p className="subtitle">Title</p>
                        <h4 className="card-title">{project.title}</h4>
                        {project.projectUrl && (
                          <a href={project.projectUrl} className="website" target="_blank" rel="noreferrer">
                            Visit Site
                            <svg
                              className="arrow-up"
                              width="14"
                              height="15"
                              viewBox="0 0 14 15"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M9.91634 4.5835L4.08301 10.4168"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              ></path>
                              <path
                                d="M4.66699 4.5835H9.91699V9.8335"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              ></path>
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="overview">
                      <h4 className="card-title">Overview</h4>
                      <p>{project.description}</p>
                      <p>
                        <b>Technologies Used:</b> {project.technologiesUsed}
                      </p>
                      {project.projectUrl && (
                        <p>
                          <b>Actual Site URL:</b> <a href={project.projectUrl}>{project.projectUrl}</a>
                        </p>
                      )}
                      <p>
                        <b>Duration:</b> {formatYear(project.startDate)}-{formatYear(project.endDate)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="work-together-slider">
                  <div className="slider-main d-flex gap-4 align-items-center">
                    <div className="slider-item">
                      <Link to="/contact">Let's 👋 Work Together</Link>
                      <Link to="/contact">Let's 👋 Work Together</Link>
                    </div>
                    <div className="slider-item">
                      <Link to="/contact">Let's 👋 Work Together</Link>
                      <Link to="/contact">Let's 👋 Work Together</Link>
                    </div>
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
