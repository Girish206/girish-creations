import { FaEnvelope, FaLocationDot, FaPhone } from "react-icons/fa6";
import type { UserProfile } from "../../api/types";
import { ContactForm } from "../../components/ContactForm";
import { CopyEmailButton } from "../../components/CopyEmailButton";
import { Reveal, SectionHead, SocialLinks } from "../../site/ui";

export function ContactSection({ profile, isPage = false }: { profile: UserProfile | undefined; isPage?: boolean }) {
  return (
    <section className={`gc-section${isPage ? " gc-section-page" : ""}`} id="contact">
      <div className="gc-container">
        <SectionHead
          level={isPage ? 1 : 2}
          eyebrow="Contact"
          title={
            <>
              Let's <span className="gc-accent-text">work</span> together
            </>
          }
          description="Have a project in mind, an opportunity to discuss, or just want to say hello? Send a message and I'll get back to you."
        />
        <div className="gc-contact-grid">
          <Reveal className="gc-contact-list">
            {profile?.email && (
              <div className="gc-contact-item gc-spot">
                <span className="gc-contact-item-icon" aria-hidden="true">
                  <FaEnvelope />
                </span>
                <div className="gc-contact-item-body">
                  <span className="gc-contact-item-label">Email</span>
                  <a className="gc-contact-item-value" href={`mailto:${profile.email}`}>
                    {profile.email}
                  </a>
                </div>
                <div className="gc-contact-item-actions">
                  <CopyEmailButton email={profile.email} className="gc-btn gc-btn-ghost gc-btn-sm" />
                </div>
              </div>
            )}
            {profile?.contactNumber && (
              <div className="gc-contact-item gc-spot">
                <span className="gc-contact-item-icon" aria-hidden="true">
                  <FaPhone />
                </span>
                <div className="gc-contact-item-body">
                  <span className="gc-contact-item-label">Phone</span>
                  <a className="gc-contact-item-value" href={`tel:+91${profile.contactNumber}`}>
                    +91 {profile.contactNumber}
                  </a>
                </div>
              </div>
            )}
            {profile?.address && (
              <>
                <div className="gc-contact-item gc-spot">
                  <span className="gc-contact-item-icon" aria-hidden="true">
                    <FaLocationDot />
                  </span>
                  <div className="gc-contact-item-body">
                    <span className="gc-contact-item-label">Based in</span>
                    <span className="gc-contact-item-value">{profile.address}</span>
                  </div>
                </div>
                <div className="gc-map">
                  <iframe
                    src={`https://www.google.com/maps?q=${encodeURIComponent(profile.address)}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Location map"
                  />
                </div>
              </>
            )}
            <SocialLinks profile={profile} />
          </Reveal>

          <Reveal className="gc-card gc-form-card" delay={100}>
            <h3 className="gc-h3" style={{ marginBottom: 6 }}>
              Send a message
            </h3>
            <p className="gc-muted" style={{ marginBottom: 24, fontSize: 15 }}>
              All fields are required.
            </p>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
