import { useState } from "react";
import { useTools } from "../../api/hooks/useTools";
import { useDeleteTool } from "../../api/hooks/admin/useAdminTools";
import { ListCard } from "../components/ListCard";
import { Button } from "../components/Button";
import { confirmDelete } from "../components/confirmDelete";
import DefaultModal from "../dms/components/DefaultModal";
import { AdminToolsForm } from "./AdminToolsForm";
import "../dms/css/adminDisplays.css";
import "../admin.css";
import "../skills/skillsCredentials.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

export function AdminToolsList() {
  const { data: items, isLoading } = useTools();
  const deleteTool = useDeleteTool();
  const [modal, setModal] = useState<ModalState>(null);

  async function handleDelete(id: number, name: string) {
    if (await confirmDelete("tool", name)) {
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
        <ul className="admin-chips">
          {items.map((item) => (
            <li className="admin-chip" key={item.id}>
              <button
                type="button"
                className="admin-chip-label"
                onClick={() => setModal({ mode: "edit", id: item.id })}
                title="Edit"
              >
                <i className="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i>
                {item.toolName}
              </button>
              <button
                type="button"
                className="admin-chip-remove"
                onClick={() => handleDelete(item.id, item.toolName)}
                aria-label={`Delete ${item.toolName}`}
                title="Delete"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </li>
          ))}
        </ul>
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
