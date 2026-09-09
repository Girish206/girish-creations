import { useState } from "react";
import { Link } from "react-router-dom";
import { FaCircle } from "react-icons/fa6";
import { ProfileCard } from "../layouts/ProfileCard";

// Matches the skills actually listed in the Skills admin section, rather than
// the generic design-agency service list this template shipped with.
const SERVICES = [
  { icon: "app.svg", title: "Full Stack Development" },
  { icon: "web-development.svg", title: "Web Development" },
  { icon: "view.svg", title: "REST API Development" },
  { icon: "prd-design.svg", title: "Database Design" },
];

const FAQ_ITEMS = [
  {
    question: "What technologies do you work with?",
    answer:
      "Mainly Python/Django and PHP/Laravel for backend work, Node.js and React for full-stack JavaScript projects, and MySQL/PostgreSQL for data storage. See the Skills and Tools sections on the About page for the full list.",
  },
  {
    question: "Are you available for freelance or full-time opportunities?",
    answer: "Yes — I'm currently open to new opportunities. Reach out through the contact form and I'll get back to you.",
  },
  {
    question: "Do you work with remote teams?",
    answer: "Yes, I'm comfortable working remotely and collaborating asynchronously.",
  },
  {
    question: "How can I get in touch?",
    answer: "The contact form on this page is the quickest way, or you can email me directly using the address in the profile card.",
  },
];

export function ServicesPage() {
  // Bootstrap's JS bundle isn't loaded in this app (only its CSS is), so the
  // old data-bs-toggle="collapse" accordion is reimplemented here with local
  // state, reusing the same accordion/collapse/show class names for styling.
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  return (
    <>
      <section className="content-box-area mt-4">
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
                        Services I <span>Offered</span>
                      </h1>
                      <p>
                        I build and ship full stack web applications end to end, from database design through to a{" "}
                        <b>deployed, working product</b>.
                      </p>
                    </div>
                    <div className="available-btn">
                      <span>
                        <FaCircle /> Available For Hire
                      </span>
                    </div>
                  </div>

                  <div className="services">
                    <div className="row g-4">
                      {SERVICES.map((service) => (
                        <div className="col-md-3 col-sm-6 col-6" key={service.title}>
                          <div className="services-item text-center">
                            <div className="image">
                              <img src={`/assets/img/icons/${service.icon}`} alt={service.icon.replace(/\.\w+$/, "")} />
                            </div>
                            <div className="text">
                              <h3 className="title">{service.title}</h3>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="frequently-asked-questions">
                    <h2 className="main-common-title">Frequently Asked Questions</h2>
                    <div className="frequently-asked-questions-main">
                      <div className="accordion" id="accordionExample">
                        {FAQ_ITEMS.map((item, index) => {
                          const isOpen = openFaqIndex === index;
                          return (
                            <div className="accordion-item" key={item.question}>
                              <h4 className="accordion-header" id={`heading-${index}`}>
                                <button
                                  className={`accordion-button${isOpen ? "" : " collapsed"}`}
                                  type="button"
                                  aria-expanded={isOpen}
                                  aria-controls={`collapse-${index}`}
                                  onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                                >
                                  {item.question}
                                  <span className="ms-auto">
                                    <span className="icon ms-4">
                                      <img className="icon-plus" src="/assets/img/icons/plus.svg" alt="plus" />
                                      <img className="icon-minus d-none" src="/assets/img/icons/minus.svg" alt="minus" />
                                    </span>
                                  </span>
                                </button>
                              </h4>
                              <div
                                id={`collapse-${index}`}
                                className={`accordion-collapse collapse${isOpen ? " show" : ""}`}
                                aria-labelledby={`heading-${index}`}
                              >
                                <div className="accordion-body">
                                  <p>{item.answer}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
