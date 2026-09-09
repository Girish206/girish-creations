import { FaCircle } from "react-icons/fa6";
import { ProfileCard } from "../layouts/ProfileCard";
import { useProfile } from "../api/hooks/useProfile";
import { useExperience } from "../api/hooks/useExperience";
import { useEducation } from "../api/hooks/useEducation";
import { useSkills } from "../api/hooks/useSkills";
import { useTools } from "../api/hooks/useTools";
import { useProjectsList } from "../api/hooks/useProjects";
import { endYearOrPresent, formatDuration, yearOf } from "../utils/date";

export function AboutPage() {
  const { data: profile } = useProfile();
  const { data: experience } = useExperience();
  const { data: education } = useEducation();
  const { data: skills } = useSkills();
  const { data: tools } = useTools();
  const { data: projectsPage } = useProjectsList(1, 1);

  return (
    <>
      <section className="content-box-area mt-4 mb-4">
        <div className="container">
          <div className="row g-4">
            <div className="col-xl-4">
              <ProfileCard />
            </div>
            <div className="col-xl-8">
              <div className="card content-box-card">
                <div className="card-body">
                  <div className="top-info">
                    <div className="text">
                      <h1 className="main-title">
                        Hi, This Is <span>{profile?.fullName}</span> 👋
                      </h1>
                      <p style={{ fontSize: 18 }}>{profile?.objective}</p>
                    </div>
                    <div className="available-btn">
                      <span>
                        <FaCircle /> Available For Hire
                      </span>
                    </div>
                  </div>
                  <div className="counter-area">
                    <div className="counter">
                      <div className="counter-item">
                        <h3 className="number">{profile?.formattedExperienceInYears}+</h3>
                        <p className="subtitle">Year of Experience</p>
                      </div>
                      <div className="counter-item">
                        <h3 className="number">{projectsPage?.total}+</h3>
                        <p className="subtitle">Project Completed</p>
                      </div>
                    </div>
                    <div className="circle-area">
                      <div className="circle-text">
                        <img className="circle-image" src="/assets/img/about-us/circle-text.svg" alt="circle-text" />
                        <img
                          className="circle-image circle-image-light d-none"
                          src="/assets/img/about-us/circle-text-light.svg"
                          alt="circle-text"
                        />
                        <span className="arrow-down">
                          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 5V35" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M15 30L20 35L25 30" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Work Experience */}
                  <div className="awards-recognitions">
                    <h2 className="main-common-title">Work Experience Details</h2>
                    <div className="awards-recognitions-main">
                      <ul className="list-unstyled">
                        {experience?.map((exp) => (
                          <li key={exp.id}>
                            <a href="#" className="d-block w-100">
                              <div className="awards-item">
                                <div className="award-name">
                                  <div className="text">
                                    <h4 className="title">{exp.jobTitle}</h4>
                                    <p className="year">
                                      {yearOf(exp.startDate)} - {endYearOrPresent(exp.endDate)}
                                    </p>
                                  </div>
                                </div>
                                <div className="award-name">
                                  <div className="text">
                                    <h4 className="title">{exp.companyName}</h4>
                                    <p className="year">{exp.location}</p>
                                  </div>
                                </div>
                                <div className="project-btn">
                                  <span>{formatDuration(exp.startDate, exp.endDate)}</span>
                                </div>
                              </div>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {/* Educational Details */}
                  <div className="awards-recognitions">
                    <h2 className="main-common-title">Educational Details</h2>
                    <div className="awards-recognitions-main">
                      <ul className="list-unstyled">
                        {education?.map((edu) => (
                          <li key={edu.id}>
                            <a href="#" className="d-block w-100">
                              <div className="awards-item">
                                <div className="award-name">
                                  <div className="text">
                                    <h4 className="title">{edu.course}</h4>
                                    <p className="year">{edu.specialization}</p>
                                  </div>
                                </div>
                                <div className="award-name">
                                  <div className="text">
                                    <h4 className="title">{edu.institutionName}</h4>
                                    <p className="year">
                                      {yearOf(edu.startDate)} - {endYearOrPresent(edu.endDate)}
                                    </p>
                                  </div>
                                </div>
                                <div className="project-btn">
                                  <span>{edu.grade}</span>
                                </div>
                              </div>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {/* Skills */}
                  <div className="working-with-area mt-3">
                    <h2 className="main-common-title">Skills</h2>
                    <div className="working-with-main">
                      {skills?.map((skill) => (
                        <div key={skill.id} className="items" style={{ color: "#d6430e" }}>
                          {skill.skillName}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Tools */}
                  <div className="working-with-area mt-3">
                    <h2 className="main-common-title">Tools</h2>
                    <div className="working-with-main">
                      {tools?.map((tool) => (
                        <div key={tool.id} className="items" style={{ color: "#F63008" }}>
                          {tool.toolName}
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
