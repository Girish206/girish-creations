import { useState } from "react";
import { useTools } from "../../api/hooks/useTools";
import { useDeleteTool } from "../../api/hooks/admin/useAdminTools";
import { ListCard } from "../components/ListCard";
import { Button } from "../components/Button";
import { RowActions } from "../components/RowActions";
import { confirmDelete } from "../components/confirmDelete";
import DefaultModal from "../dms/components/DefaultModal";
import { AdminToolsForm } from "./AdminToolsForm";
import "../dms/css/adminDisplays.css";
import "../admin.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

export function AdminToolsList() {
  const { data: items, isLoading } = useTools();
  const deleteTool = useDeleteTool();
  const [modal, setModal] = useState<ModalState>(null);

  async function handleDelete(id: number) {
    if (await confirmDelete("tool")) {
      deleteTool.mutate(id);
    }
  }

  return (
    <ListCard
      title="Tools"
      action={
        <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
          + New
        </Button>
      }
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No tools yet.</div>
      ) : (
        <div className="admin-card-grid admin-card-grid-compact">
          {items.map((item) => (
            <div className="card admin-item-card admin-item-card-compact" key={item.id}>
              <div className="admin-item-card-header">
                <div className="admin-item-card-heading">
                  <div className="admin-item-card-icon">
                    <i className="fa-solid fa-screwdriver-wrench"></i>
                  </div>
                  <h3 className="admin-item-card-title">{item.toolName}</h3>
                </div>
                <div className="admin-item-card-actions">
                  <RowActions
                    onEdit={() => setModal({ mode: "edit", id: item.id })}
                    onDelete={() => handleDelete(item.id)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <DefaultModal
          title={modal.mode === "edit" ? "Edit Tool" : "New Tool"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminToolsForm id={modal.mode === "edit" ? modal.id : undefined} onSaved={() => setModal(null)} />
          }
        />
      )}
    </ListCard>
  );
}
