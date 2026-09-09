import { useState } from "react";
import { useSkills } from "../../api/hooks/useSkills";
import { useDeleteSkill } from "../../api/hooks/admin/useAdminSkills";
import { ListCard } from "../components/ListCard";
import { Button } from "../components/Button";
import { RowActions } from "../components/RowActions";
import { confirmDelete } from "../components/confirmDelete";
import DefaultModal from "../dms/components/DefaultModal";
import { AdminSkillsForm } from "./AdminSkillsForm";
import "../dms/css/adminDisplays.css";
import "../admin.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

const PROFICIENCY_PERCENT: Record<string, number> = {
  Beginner: 25,
  Intermediate: 50,
  Advanced: 75,
  Expert: 100,
};

export function AdminSkillsList() {
  const { data: items, isLoading } = useSkills();
  const deleteSkill = useDeleteSkill();
  const [modal, setModal] = useState<ModalState>(null);

  async function handleDelete(id: number) {
    if (await confirmDelete("skill")) {
      deleteSkill.mutate(id);
    }
  }

  return (
    <ListCard
      title="Skills"
      action={
        <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
          + New
        </Button>
      }
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No skills yet.</div>
      ) : (
        <div className="admin-card-grid">
          {items.map((item) => (
            <div className="card admin-item-card" key={item.id}>
              <div className="admin-item-card-header">
                <div className="admin-item-card-heading">
                  <div className="admin-item-card-icon">
                    <i className="fa-solid fa-star"></i>
                  </div>
                  <div>
                    <h3 className="admin-item-card-title">{item.skillName}</h3>
                    <p className="admin-item-card-subtitle">{item.proficiencyLevel}</p>
                  </div>
                </div>
                <div className="admin-item-card-actions">
                  <RowActions
                    onEdit={() => setModal({ mode: "edit", id: item.id })}
                    onDelete={() => handleDelete(item.id)}
                  />
                </div>
              </div>
              <div className="admin-proficiency-track">
                <div
                  className="admin-proficiency-fill"
                  style={{ width: `${PROFICIENCY_PERCENT[item.proficiencyLevel] ?? 50}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <DefaultModal
          title={modal.mode === "edit" ? "Edit Skill" : "New Skill"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminSkillsForm id={modal.mode === "edit" ? modal.id : undefined} onSaved={() => setModal(null)} />
          }
        />
      )}
    </ListCard>
  );
}
