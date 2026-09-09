import { useState } from "react";
import { useProjectsList } from "../../api/hooks/useProjects";
import { useDeleteProject } from "../../api/hooks/admin/useAdminProjects";
import { uploadUrl } from "../../api/client";
import { ListCard } from "../components/ListCard";
import { Button } from "../components/Button";
import { RowActions } from "../components/RowActions";
import { confirmDelete } from "../components/confirmDelete";
import { DetailView } from "../components/DetailView";
import DefaultModal from "../dms/components/DefaultModal";
import { AdminProjectsForm } from "./AdminProjectsForm";
import "../dms/css/adminDisplays.css";
import "../admin.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

export function AdminProjectsList() {
  const { data, isLoading } = useProjectsList(1, 100);
  const deleteProject = useDeleteProject();
  const items = data?.items;
  const [modal, setModal] = useState<ModalState>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  const viewItem = viewId !== null ? items?.find((item) => item.id === viewId) : undefined;

  async function handleDelete(id: number) {
    if (await confirmDelete("project")) {
      deleteProject.mutate(id);
    }
  }

  return (
    <ListCard
      title="Projects"
      action={
        <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
          + New
        </Button>
      }
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No projects yet.</div>
      ) : (
        <div className="admin-card-grid">
          {items.map((item) => (
            <div className="card admin-item-card" key={item.id}>
              <div className="admin-project-thumb-wrap">
                {item.image ? (
                  <img src={uploadUrl(item.image)} alt="" />
                ) : (
                  <i className="fa-solid fa-diagram-project"></i>
                )}
              </div>
              <div className="admin-item-card-header">
                <h3 className="admin-item-card-title">{item.title}</h3>
                <div className="admin-item-card-actions">
                  <RowActions
                    onView={() => setViewId(item.id)}
                    onEdit={() => setModal({ mode: "edit", id: item.id })}
                    onDelete={() => handleDelete(item.id)}
                  />
                </div>
              </div>
              <p className="admin-item-card-desc">{item.description}</p>
              <div className="admin-chip-row">
                {item.technologiesUsed
                  .split(",")
                  .map((tech) => tech.trim())
                  .filter(Boolean)
                  .map((tech) => (
                    <span className="admin-chip" key={tech}>
                      {tech}
                    </span>
                  ))}
              </div>
              <span className="admin-item-card-meta">
                <i className="fa-solid fa-calendar-days"></i>
                {formatDate(item.startDate)} – {item.endDate ? formatDate(item.endDate) : "Present"}
              </span>
              {item.projectUrl && (
                <a
                  href={item.projectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-item-card-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i> Visit project
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {viewItem && (
        <DefaultModal
          title="Project Details"
          onClose={() => setViewId(null)}
          showFooter={false}
          size="lg"
          component={
            <DetailView
              fields={[
                {
                  label: "Image",
                  value: viewItem.image ? (
                    <img
                      src={uploadUrl(viewItem.image)}
                      alt=""
                      style={{ maxWidth: "100%", borderRadius: 10 }}
                    />
                  ) : null,
                },
                { label: "Title", value: viewItem.title },
                { label: "Description", value: viewItem.description },
                { label: "Technologies Used", value: viewItem.technologiesUsed },
                {
                  label: "Duration",
                  value: `${formatDate(viewItem.startDate)} – ${
                    viewItem.endDate ? formatDate(viewItem.endDate) : "Present"
                  }`,
                },
                {
                  label: "Project URL",
                  value: viewItem.projectUrl ? (
                    <a href={viewItem.projectUrl} target="_blank" rel="noreferrer">
                      {viewItem.projectUrl}
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
          title={modal.mode === "edit" ? "Edit Project" : "New Project"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminProjectsForm id={modal.mode === "edit" ? modal.id : undefined} onSaved={() => setModal(null)} />
          }
        />
      )}
    </ListCard>
  );
}
