import { FaArrowUpRightFromSquare } from "react-icons/fa6";
import type { CertificationDetails } from "../../api/types";
import { formatFullDate } from "../../utils/format";
import { Reveal, SectionHead } from "../../site/ui";

export function CertificationsSection({ certifications }: { certifications: CertificationDetails[] | undefined }) {
  if (!certifications?.length) return null;
  return (
    <section className="gc-section" id="certifications">
      <div className="gc-container">
        <SectionHead eyebrow="Certifications" title="Courses & credentials" />
        <div className="gc-timeline">
          {certifications.map((cert) => (
            <Reveal className="gc-timeline-item" key={cert.id}>
              <span className="gc-timeline-when">{formatFullDate(cert.issueDate)}</span>
              <div className="gc-timeline-main">
                <h3 className="gc-timeline-title">{cert.name}</h3>
                <span className="gc-timeline-sub">
                  {cert.issuingOrganization}
                  {cert.credentialId ? ` · ID ${cert.credentialId}` : ""}
                </span>
              </div>
              {cert.credentialUrl ? (
                <a className="gc-link gc-timeline-badge" href={cert.credentialUrl} target="_blank" rel="noreferrer">
                  View credential <FaArrowUpRightFromSquare size={12} />
                </a>
              ) : (
                <span />
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
