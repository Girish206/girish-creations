import { Link } from "react-router-dom";
import { ProfileCard } from "../layouts/ProfileCard";
import { useExperience } from "../api/hooks/useExperience";
import { useSkills } from "../api/hooks/useSkills";
import { useRandomProjects } from "../api/hooks/useProjects";
import { uploadUrl } from "../api/client";
import { endYearOrPresent, yearOf } from "../utils/date";

export function HomePage() {
  const { data: experience } = useExperience();
  const { data: skills } = useSkills({ levels: ["Intermediate", "Advanced", "Expert"], random: 5 });
  const { data: projects } = useRandomProjects(2);

  return (
    <>
      <section className="home-area">
        <div className="container">
          <div className="row g-4">
            <div className="col-xl-4">
              <ProfileCard />
            </div>
            <div className="col-xl-4">
              <div className="row g-4">
                <div className="col-lg-12">
                  <div className="card">
                    <div className="card-body work-experiance-card">
                      <h3 className="card-title">Work Experience</h3>
                      <div className="work-experiance-main">
                        {/* .work-experiance-slider's layout rules (flex, icon sizing, text
                            styles) are all scoped under this class, so it must stay applied —
                            but its infinite CSS scroll animation is meant for long lists that
                            overflow the 220px container. With few enough entries to fit
                            statically, the animation just makes the list constantly slide out
                            of view for no reason, so only let it run once there are enough
                            items to actually need scrolling (override via inline style, which
                            beats the stylesheet's animation rule on specificity). */}
                        <ul
                          className="work-experiance-slider list-unstyled"
                          style={(experience?.length ?? 0) > 3 ? undefined : { animation: "none" }}
                        >
                          {experience?.map((exp) => (
                            <li key={exp.id}>
                              <div className="date">
                                <p>
                                  {yearOf(exp.startDate)}-{endYearOrPresent(exp.endDate)}
                                </p>
                              </div>
                              <div className="info">
                                <div className="text">
                                  <h4 className="title">{exp.companyName}</h4>
                                  <h6 className="subtitle">{exp.jobTitle}</h6>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                        {experience?.length === 0 && <p className="mb-0">No work experience added yet.</p>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-12">
                  <div className="card">
                    <div className="card-body">
                      <h3 className="card-title">My Expert Area</h3>
                      <div className="content-box-card" style={{ height: "auto" }}>
                        <div className="working-with-area mt-3">
                          <div className="working-with-main">
                            {skills?.map((skill) => (
                              <div key={skill.id} className="items" style={{ color: "#F63008" }}>
                                {skill.skillName}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-12">
                  <div className="card lets-talk-together-card">
                    <div className="card-body">
                      <div className="scrolling-info">
                        <div className="slider-item">
                          <p>
                            Available For Hire 🚀 Full Stack Development Experience 🎨 Available For Hire 🚀 Full
                            Stack Development Experience 🎨
                          </p>
                        </div>
                      </div>
                      <h3 className="card-title">
                        Let's👋
                        <span className="d-block">Work Together</span>
                      </h3>
                      <Link className="link-btn" to="/contact">
                        Let's Talk
                        <svg className="icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.5 11.6665V6.6665H12.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M17.5 6.6665L10 14.1665L2.5 6.6665" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-4">
              <div className="card card-projects">
                <div className="card-body">
                  <h3 className="card-title">
                    Recent Projects{" "}
                    <Link className="link-btn" to="/projects">
                      All Projects
                      <svg className="icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.16699 10H15.8337" stroke="#4770FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10.833 15L15.833 10" stroke="#4770FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10.833 5L15.833 10" stroke="#4770FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </h3>
                  <div className="projects-main mt-24">
                    <div className="row g-4 parent-container">
                      {projects?.map((proj) => (
                        <div className="col-lg-12" key={proj.id}>
                          <div className="project-item">
                            <Link to={`/projects/${proj.id}`} className="image">
                              <img src={uploadUrl(proj.image)} alt={proj.title} className="img-fluid w-100" />
                              <div className="info">
                                <span className="category">{proj.title}</span>
                              </div>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
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
    </>
  );
}
