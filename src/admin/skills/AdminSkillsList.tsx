import { useState } from "react";
import { useSkills } from "../../api/hooks/useSkills";
import { useDeleteSkill } from "../../api/hooks/admin/useAdminSkills";
import { ListCard } from "../components/ListCard";
import { Button } from "../components/Button";
import { confirmDelete } from "../components/confirmDelete";
import DefaultModal from "../dms/components/DefaultModal";
import { AdminSkillsForm } from "./AdminSkillsForm";
import "../dms/css/adminDisplays.css";
import "../admin.css";
import "./skillsCredentials.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

// Strongest first; each skill shows as a chip under its level.
const LEVELS = ["Expert", "Advanced", "Intermediate", "Beginner"] as const;

export function AdminSkillsList() {
  const { data: items, isLoading } = useSkills();
  const deleteSkill = useDeleteSkill();
  const [modal, setModal] = useState<ModalState>(null);

  async function handleDelete(id: number, name: string) {
    if (await confirmDelete("skill", name)) {
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
        <div className="admin-chip-groups">
          {LEVELS.map((level) => {
            const group = items.filter((item) => item.proficiencyLevel === level);
            if (group.length === 0) return null;
            return (
              <section className="admin-chip-group" key={level}>
                <header className="admin-chip-group-head">
                  <span className="admin-level-dots" aria-hidden="true">
                    {LEVELS.map((_, i) => (
                      <i key={i} className={i < LEVELS.length - LEVELS.indexOf(level) ? "is-on" : ""} />
                    ))}
                  </span>
                  <h3>{level}</h3>
                  <span className="admin-chip-group-count">{group.length}</span>
                </header>
                <ul className="admin-chips">
                  {group.map((item) => (
                    <li className="admin-chip" key={item.id}>
                      <button
                        type="button"
                        className="admin-chip-label"
                        onClick={() => setModal({ mode: "edit", id: item.id })}
                        title="Edit"
                      >
                        {item.skillName}
                      </button>
                      <button
                        type="button"
                        className="admin-chip-remove"
                        onClick={() => handleDelete(item.id, item.skillName)}
                        aria-label={`Delete ${item.skillName}`}
                        title="Delete"
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
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
