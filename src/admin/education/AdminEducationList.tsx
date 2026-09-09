import { useState } from "react";
import { useEducation } from "../../api/hooks/useEducation";
import { useDeleteEducation } from "../../api/hooks/admin/useAdminEducation";
import { ListCard } from "../components/ListCard";
import { Button } from "../components/Button";
import { RowActions } from "../components/RowActions";
import { confirmDelete } from "../components/confirmDelete";
import { DetailView } from "../components/DetailView";
import DefaultModal from "../dms/components/DefaultModal";
import { AdminEducationForm } from "./AdminEducationForm";
import "../dms/css/adminDisplays.css";
import "../admin.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

export function AdminEducationList() {
  const { data: items, isLoading } = useEducation();
  const deleteEducation = useDeleteEducation();
  const [modal, setModal] = useState<ModalState>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  const viewItem = viewId !== null ? items?.find((item) => item.id === viewId) : undefined;

  async function handleDelete(id: number) {
    if (await confirmDelete("education entry")) {
      deleteEducation.mutate(id);
    }
  }

  return (
    <ListCard
      title="Education"
      action={
        <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
          + New
        </Button>
      }
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No education entries yet.</div>
      ) : (
        <div className="admin-timeline">
          {items.map((item) => (
            <div className="admin-timeline-item" key={item.id}>
              <div className="admin-timeline-marker" />
              <div className="card admin-timeline-card">
                <div className="admin-timeline-card-header">
                  <div>
                    <h3 className="admin-timeline-title">{item.course}</h3>
                    <p className="admin-timeline-subtitle">
                      {item.institutionName}
                      {item.specialization ? ` · ${item.specialization}` : ""}
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
                  <span className="admin-timeline-badge">
                    <i className="fa-solid fa-award"></i> Grade: {item.grade}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewItem && (
        <DefaultModal
          title="Education Details"
          onClose={() => setViewId(null)}
          showFooter={false}
          size="md"
          component={
            <DetailView
              fields={[
                { label: "Course", value: viewItem.course },
                { label: "Institution", value: viewItem.institutionName },
                { label: "Specialization", value: viewItem.specialization },
                {
                  label: "Duration",
                  value: `${formatDate(viewItem.startDate)} – ${
                    viewItem.endDate ? formatDate(viewItem.endDate) : "Present"
                  }`,
                },
                { label: "Grade", value: viewItem.grade },
              ]}
            />
          }
        />
      )}

      {modal && (
        <DefaultModal
          title={modal.mode === "edit" ? "Edit Education" : "New Education"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminEducationForm id={modal.mode === "edit" ? modal.id : undefined} onSaved={() => setModal(null)} />
          }
        />
      )}
    </ListCard>
  );
}
