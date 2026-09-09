import { useState } from "react";
import { useExperience } from "../../api/hooks/useExperience";
import { useDeleteExperience } from "../../api/hooks/admin/useAdminExperience";
import { ListCard } from "../components/ListCard";
import { Button } from "../components/Button";
import { RowActions } from "../components/RowActions";
import { confirmDelete } from "../components/confirmDelete";
import { DetailView } from "../components/DetailView";
import DefaultModal from "../dms/components/DefaultModal";
import { AdminExperienceForm } from "./AdminExperienceForm";
import "../dms/css/adminDisplays.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

export function AdminExperienceList() {
  const { data: items, isLoading } = useExperience();
  const deleteExperience = useDeleteExperience();
  const [modal, setModal] = useState<ModalState>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  const viewItem = viewId !== null ? items?.find((item) => item.id === viewId) : undefined;

  async function handleDelete(id: number) {
    if (await confirmDelete("experience entry")) {
      deleteExperience.mutate(id);
    }
  }

  return (
    <ListCard
      title="Experience"
      action={
        <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
          + New
        </Button>
      }
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No experience entries yet.</div>
      ) : (
        <div className="admin-timeline">
          {items.map((item) => (
            <div className="admin-timeline-item" key={item.id}>
              <div className="admin-timeline-marker" />
              <div className="card admin-timeline-card">
                <div className="admin-timeline-card-header">
                  <div>
                    <h3 className="admin-timeline-title">{item.jobTitle}</h3>
                    <p className="admin-timeline-subtitle">
                      {item.companyName}
                      {item.location ? ` · ${item.location}` : ""}
                    </p>
                  </div>
                  <RowActions
                    onView={() => setViewId(item.id)}
                    onEdit={() => setModal({ mode: "edit", id: item.id })}
                    onDelete={() => handleDelete(item.id)}
                  />
                </div>
                <div className="admin-timeline-meta-row">
                  <span className="admin-timeline-dates">
                    <i className="fa-solid fa-calendar-days"></i>
                    {formatDate(item.startDate)} – {item.endDate ? formatDate(item.endDate) : "Present"}
                  </span>
                </div>
                {item.description && <p className="admin-timeline-desc">{item.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewItem && (
        <DefaultModal
          title="Experience Details"
          onClose={() => setViewId(null)}
          showFooter={false}
          size="md"
          component={
            <DetailView
              fields={[
                { label: "Job Title", value: viewItem.jobTitle },
                { label: "Company", value: viewItem.companyName },
                { label: "Location", value: viewItem.location },
                {
                  label: "Duration",
                  value: `${formatDate(viewItem.startDate)} – ${
                    viewItem.endDate ? formatDate(viewItem.endDate) : "Present"
                  }`,
                },
                { label: "Description", value: viewItem.description },
              ]}
            />
          }
        />
      )}

      {modal && (
        <DefaultModal
          title={modal.mode === "edit" ? "Edit Experience" : "New Experience"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminExperienceForm id={modal.mode === "edit" ? modal.id : undefined} onSaved={() => setModal(null)} />
          }
        />
      )}
    </ListCard>
  );
}
