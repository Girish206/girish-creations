import { useState } from "react";
import { useExpenseCategories, useDeleteExpenseCategory } from "../../../api/hooks/expense/useExpenseCategories";
import { ListCard } from "../../components/ListCard";
import { Button } from "../../components/Button";
import { RowActions } from "../../components/RowActions";
import { confirmDelete } from "../../components/confirmDelete";
import DefaultModal from "../../dms/components/DefaultModal";
import { AdminExpenseCategoryForm } from "./AdminExpenseCategoryForm";
import { CategoryIcon } from "./CategoryIcon";
import { resolveCategoryIcon } from "./categoryIcons";
import "../../dms/css/adminDisplays.css";
import "../../admin.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

export function AdminExpenseCategoriesList() {
  const { data: items, isLoading } = useExpenseCategories();
  const deleteCategory = useDeleteExpenseCategory();
  const [modal, setModal] = useState<ModalState>(null);

  async function handleDelete(id: number) {
    if (await confirmDelete("category")) {
      deleteCategory.mutate(id);
    }
  }

  return (
    <ListCard
      title="Expense Categories"
      action={
        <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
          + New
        </Button>
      }
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No categories yet.</div>
      ) : (
        <div className="admin-card-grid admin-card-grid-compact">
          {items.map((item) => (
            <div className="card admin-item-card admin-item-card-compact" key={item.id}>
              <div className="admin-item-card-header">
                <div className="admin-item-card-heading">
                  <CategoryIcon name={item.name} {...resolveCategoryIcon(item)} />
                  <h3 className="admin-item-card-title">{item.name}</h3>
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
          title={modal.mode === "edit" ? "Edit Category" : "New Category"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminExpenseCategoryForm
              id={modal.mode === "edit" ? modal.id : undefined}
              onSaved={() => setModal(null)}
            />
          }
        />
      )}
    </ListCard>
  );
}
