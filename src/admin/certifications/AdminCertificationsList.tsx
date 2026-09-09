import { useState } from "react";
import { useCertifications } from "../../api/hooks/useCertifications";
import { useDeleteCertification } from "../../api/hooks/admin/useAdminCertifications";
import { ListCard } from "../components/ListCard";
import { Button } from "../components/Button";
import { RowActions } from "../components/RowActions";
import { confirmDelete } from "../components/confirmDelete";
import { DetailView } from "../components/DetailView";
import DefaultModal from "../dms/components/DefaultModal";
import { AdminCertificationsForm } from "./AdminCertificationsForm";
import "../dms/css/adminDisplays.css";
import "../admin.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

export function AdminCertificationsList() {
  const { data: items, isLoading } = useCertifications();
  const deleteCertification = useDeleteCertification();
  const [modal, setModal] = useState<ModalState>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  const viewItem = viewId !== null ? items?.find((item) => item.id === viewId) : undefined;

  async function handleDelete(id: number) {
    if (await confirmDelete("certification")) {
      deleteCertification.mutate(id);
    }
  }

  return (
    <ListCard
      title="Certifications"
      action={
        <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
          + New
        </Button>
      }
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No certifications yet.</div>
      ) : (
        <div className="admin-card-grid">
          {items.map((item) => (
            <div className="card admin-item-card" key={item.id}>
              <div className="admin-item-card-header">
                <div className="admin-item-card-heading">
                  <div className="admin-item-card-icon">
                    <i className="fa-solid fa-certificate"></i>
                  </div>
                  <div>
                    <h3 className="admin-item-card-title">{item.name}</h3>
                    <p className="admin-item-card-subtitle">{item.issuingOrganization}</p>
                  </div>
                </div>
                <div className="admin-item-card-actions">
                  <RowActions
                    onView={() => setViewId(item.id)}
                    onEdit={() => setModal({ mode: "edit", id: item.id })}
                    onDelete={() => handleDelete(item.id)}
                  />
                </div>
              </div>
              <span className="admin-item-card-meta">
                <i className="fa-solid fa-calendar-days"></i>
                {formatDate(item.issueDate)}
                {item.expirationDate ? ` – ${formatDate(item.expirationDate)}` : " · No expiry"}
              </span>
              {item.credentialUrl && (
                <a
                  href={item.credentialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-item-card-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i> View credential
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {viewItem && (
        <DefaultModal
          title="Certification Details"
          onClose={() => setViewId(null)}
          showFooter={false}
          size="md"
          component={
            <DetailView
              fields={[
                { label: "Name", value: viewItem.name },
                { label: "Issuing Organization", value: viewItem.issuingOrganization },
                { label: "Issue Date", value: formatDate(viewItem.issueDate) },
                {
                  label: "Expiration Date",
                  value: viewItem.expirationDate ? formatDate(viewItem.expirationDate) : "No expiry",
                },
                { label: "Credential ID", value: viewItem.credentialId },
                {
                  label: "Credential URL",
                  value: viewItem.credentialUrl ? (
                    <a href={viewItem.credentialUrl} target="_blank" rel="noreferrer">
                      {viewItem.credentialUrl}
                    </a>
                  ) : null,
                },
              ]}
            />
          }
        />
      )}

      {modal && (
        <DefaultModal
          title={modal.mode === "edit" ? "Edit Certification" : "New Certification"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminCertificationsForm
              id={modal.mode === "edit" ? modal.id : undefined}
              onSaved={() => setModal(null)}
            />
          }
        />
      )}
    </ListCard>
  );
}
