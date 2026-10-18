import { useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { Reveal, SectionHead } from "../../site/ui";
import { SERVICES } from "./services";

const STEPS = [
  {
    title: "Understand",
    description: "We talk through the problem, the people using it and what success looks like before any code is written.",
  },
  {
    title: "Build",
    description: "I design the data model and APIs, then build the interface — sharing progress early so you can steer.",
  },
  {
    title: "Ship & support",
    description: "I deploy to production, hand over everything you need, and stay available for fixes and improvements.",
  },
];

const FAQ_ITEMS = [
  {
    question: "What technologies do you work with?",
    answer:
      "Mainly Python/Django and PHP/Laravel for back-end work, Node.js and React for full-stack JavaScript projects, and MySQL/PostgreSQL for data storage. The About page lists every skill and tool.",
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
    answer: "The form on the Contact page is the quickest way, or you can email or call me directly using the details there.",
  },
];

export function ServicesSection({ isPage = false }: { isPage?: boolean }) {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <section className={`gc-section${isPage ? " gc-section-page" : ""}`} id="services">
      <div className="gc-container">
        <SectionHead
          level={isPage ? 1 : 2}
          eyebrow="Services"
          title={
            <>
              How I can <span className="gc-accent-text">help</span>
            </>
          }
          description="I build and ship full stack web applications end to end, from database design through to a deployed, working product."
        />
        <div className="gc-service-grid">
          {SERVICES.map((service, i) => (
            <Reveal className="gc-service gc-spot" key={service.title} delay={(i % 2) * 80}>
              <div className="gc-service-top">
                <span className="gc-service-icon" aria-hidden="true">
                  {service.icon}
                </span>
                <span className="gc-service-num">0{i + 1}</span>
              </div>
              <h3 className="gc-h3">{service.title}</h3>
              <p>{service.description}</p>
            </Reveal>
          ))}
        </div>

        <h3 className="gc-h3 gc-mt-40" style={{ marginBottom: 8 }}>
          How I work
        </h3>
        <div className="gc-steps">
          {STEPS.map((step, i) => (
            <Reveal className="gc-step gc-spot" key={step.title} delay={i * 80}>
              <h4 className="gc-h3">{step.title}</h4>
              <p>{step.description}</p>
            </Reveal>
          ))}
        </div>

        <div className="gc-split gc-mt-40" style={{ paddingTop: 24 }}>
          <div className="gc-split-sticky">
            <span className="gc-eyebrow">FAQ</span>
            <h3 className="gc-h2">Frequently asked questions</h3>
          </div>
          <Reveal className="gc-faq">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div className={`gc-faq-item${isOpen ? " is-open" : ""}`} key={item.question}>
                  <h4 style={{ margin: 0 }}>
                    <button
                      type="button"
                      className="gc-faq-q"
                      aria-expanded={isOpen}
                      aria-controls={`faq-${index}`}
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    >
                      {item.question}
                      <span className="gc-faq-icon" aria-hidden="true">
                        <FaPlus size={12} />
                      </span>
                    </button>
                  </h4>
                  <div className="gc-faq-a" id={`faq-${index}`} role="region">
                    <div>
                      <p>{item.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
