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
import "../skills/skillsCredentials.css";

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

  async function handleDelete(id: number, name: string) {
    if (await confirmDelete("certification", name)) {
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
        <ul className="admin-cert-list">
          {items.map((item) => (
            <li className="admin-cert-row" key={item.id}>
              <span className="admin-cert-icon" aria-hidden="true">
                <i className="fa-solid fa-certificate"></i>
              </span>
              <div className="admin-cert-body">
                <button type="button" className="admin-cert-name" onClick={() => setViewId(item.id)}>
                  {item.name}
                </button>
                <span className="admin-cert-meta">
                  {item.issuingOrganization} · {formatDate(item.issueDate)}
                  {item.expirationDate ? ` – ${formatDate(item.expirationDate)}` : ""}
                  {item.credentialUrl && (
                    <>
                      {" · "}
                      <a href={item.credentialUrl} target="_blank" rel="noreferrer">
                        Credential <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                      </a>
                    </>
                  )}
                </span>
              </div>
              <RowActions
                onEdit={() => setModal({ mode: "edit", id: item.id })}
                onDelete={() => handleDelete(item.id, item.name)}
              />
            </li>
          ))}
        </ul>
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
