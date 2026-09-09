import { useState } from "react";
import { Link } from "react-router-dom";
import { ProfileCard } from "../../layouts/ProfileCard";
import { PaginationControls } from "../../components/PaginationControls";
import { useProjectsList } from "../../api/hooks/useProjects";
import { uploadUrl } from "../../api/client";
import type { ProjectDetails } from "../../api/types";
import { formatYear } from "../../utils/format";

export function ProjectsListPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useProjectsList(page, 6);
  const items: ProjectDetails[] = data?.items ?? [];

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
                    <h1 className="main-title">
                      Check Out My Latest <span>Projects</span>
                    </h1>
                    <p>A selection of applications I've built and shipped, spanning full stack web development.</p>
                  </div>
                </div>
                <div className="portfolio-area">
                  <div className="row g-4 parent-container">
                    {!isLoading && items.length === 0 && (
                      <div style={{ alignItems: "center", justifyContent: "center", display: "flex" }}>
                        <img src="/assets/img/shopping.png" style={{ maxHeight: 150, maxWidth: 150 }} alt="" />
                        <p>No Projects/Works</p>
                      </div>
                    )}
                    {items.map((proj) => (
                      <div className="col-lg-6" key={proj.id}>
                        <div className="portfolio-item">
                          <Link to={`/projects/${proj.id}`} className="image">
                            <img src={uploadUrl(proj.image)} alt={proj.title} className="img-fluid" />
                          </Link>
                          <div className="text">
                            <div className="info">
                              <Link to={`/projects/${proj.id}`} className="title">
                                {proj.title}
                              </Link>
                              <p className="subtitle">
                                {proj.technologiesUsed} | {formatYear(proj.startDate)}-{formatYear(proj.endDate)}
                              </p>
                            </div>
                            <div className="visite-btn">
                              <Link to={`/projects/${proj.id}`} className="website">
                                View More
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
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <PaginationControls page={page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />
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
