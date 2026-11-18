import { useEffect, useState, type KeyboardEvent } from "react";
import { useExpenseCategories, useDeleteExpenseCategory } from "../../../api/hooks/expense/useExpenseCategories";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ListCard } from "../../components/ListCard";
import { RefreshButton } from "../../components/RefreshButton";
import { RowActions } from "../../components/RowActions";
import { confirmDelete } from "../../components/confirmDelete";
import DefaultModal from "../../dms/components/DefaultModal";
import { BottomSheet } from "../../components/BottomSheet";
import { AdminExpenseCategoryForm } from "./AdminExpenseCategoryForm";
import { MergeCategoryForm } from "./MergeCategoryForm";
import CustomButton from "../../dms/components/CustomButton";
import { CategoryIcon } from "./CategoryIcon";
import { resolveCategoryIcon } from "./categoryIcons";
import { CategoryActionSheet } from "./CategoryActionSheet";
import "../../dms/css/adminDisplays.css";
import "../../admin.css";
import { SearchBox } from "../../components/SearchBox";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | { mode: "merge"; id: number } | null;

// Matches the 560px phone breakpoint in adminDisplays.css, where the cards
// turn into icon tiles and their actions move into a bottom sheet.
const PHONE_QUERY = "(max-width: 560px)";

function useIsPhone() {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsPhone(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return isPhone;
}

export function AdminExpenseCategoriesList() {
  const { admin } = useAdminAuth();
  const { data: items, isLoading } = useExpenseCategories();
  const deleteCategory = useDeleteExpenseCategory();
  const [modal, setModal] = useState<ModalState>(null);
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const isPhone = useIsPhone();
  const canManage = !!admin?.isSuperAdmin;

  const needle = query.trim().toLowerCase();
  const shown = (items ?? []).filter((item) => item.name.toLowerCase().includes(needle));
  const sheetItem = isPhone && canManage ? items?.find((item) => item.id === sheetId) : undefined;

  async function handleDelete(id: number) {
    if (await confirmDelete("category")) {
      deleteCategory.mutate(id);
    }
  }

  return (
    <ListCard
      title="Expense Categories"
      bodyClassName="admin-cat-page"
      refresh={false}
      action={
        <div className="admin-cat-header-actions">
          <button type="button" className="admin-cat-new" onClick={() => setModal({ mode: "new" })}>
            <i className="fa-solid fa-plus" aria-hidden="true"></i>
            <span>New</span>
          </button>
          <span className="admin-cat-header-divider" aria-hidden="true"></span>
          <RefreshButton />
        </div>
      }
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No categories yet.</div>
      ) : (
        <>
          <div className="admin-cat-toolbar">
            <span className="admin-cat-count">
              <i className="fa-solid fa-layer-group" aria-hidden="true"></i>
              {items.length} {items.length === 1 ? "category" : "categories"}
            </span>
            <SearchBox
              className="admin-accounts-search admin-cat-search"
              placeholder="Search categories…"
              value={query}
              onChange={setQuery}
              trailing={needle ? `${shown.length}/${items.length}` : undefined}
            />
          </div>

          {shown.length === 0 ? (
            <div className="admin-empty-state">No categories match “{query.trim()}”.</div>
          ) : (
            <div className="admin-card-grid admin-card-grid-compact admin-cat-grid">
              {shown.map((item) => {
                const tappable = isPhone && canManage;
                return (
                  <div
                    className={`card admin-item-card admin-item-card-compact admin-cat-card${tappable ? " is-tappable" : ""}`}
                    key={item.id}
                    {...(tappable && {
                      role: "button",
                      tabIndex: 0,
                      "aria-label": `${item.name} actions`,
                      onClick: () => setSheetId(item.id),
                      onKeyDown: (e: KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSheetId(item.id);
                        }
                      },
                    })}
                  >
                    <div className="admin-item-card-header">
                      <div className="admin-item-card-heading">
                        <CategoryIcon name={item.name} {...resolveCategoryIcon(item)} />
                        <h3 className="admin-item-card-title">{item.name}</h3>
                      </div>
                      {/* Shared by everyone, so only a super admin changes them.
                          On a phone the actions live in the bottom sheet. */}
                      {canManage && !isPhone && (
                        <div className="admin-item-card-actions">
                          <RowActions
                            onEdit={() => setModal({ mode: "edit", id: item.id })}
                            onDelete={() => handleDelete(item.id)}
                          >
                            {items.length > 1 && (
                              <CustomButton
                                size="sm"
                                bg="secondary"
                                rounded
                                className="m-0 admin-row-action-btn"
                                onClick={() => setModal({ mode: "merge", id: item.id })}
                                title="Merge into another category"
                                aria-label={`Merge ${item.name} into another category`}
                              >
                                <i className="fa-solid fa-code-merge" aria-hidden="true"></i>
                              </CustomButton>
                            )}
                          </RowActions>
                        </div>
                      )}
                    </div>
                    {tappable && <i className="fa-solid fa-ellipsis admin-cat-card-more" aria-hidden="true"></i>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {sheetItem && (
        <CategoryActionSheet
          name={sheetItem.name}
          icon={resolveCategoryIcon(sheetItem)}
          onClose={() => setSheetId(null)}
          onEdit={() => setModal({ mode: "edit", id: sheetItem.id })}
          onMerge={(items?.length ?? 0) > 1 ? () => setModal({ mode: "merge", id: sheetItem.id }) : undefined}
          onDelete={() => handleDelete(sheetItem.id)}
        />
      )}

      {modal?.mode === "merge" && items && (() => {
        const category = items.find((item) => item.id === modal.id);
        return category ? (
          <DefaultModal
            title={`Merge ${category.name}`}
            onClose={() => setModal(null)}
            showFooter={false}
            size="md"
            component={<MergeCategoryForm category={category} categories={items} onDone={() => setModal(null)} />}
          />
        ) : null;
      })()}

      {modal && modal.mode !== "merge" && (
        <BottomSheet
          title={modal.mode === "edit" ? "Edit Category" : "New Category"}
          subtitle={modal.mode === "edit" ? "Rename it or change its icon" : "Name it and pick how it looks"}
          icon={<i className={`fa-solid ${modal.mode === "edit" ? "fa-pen" : "fa-tag"}`} aria-hidden="true"></i>}
          onClose={() => setModal(null)}
        >
          <AdminExpenseCategoryForm
            id={modal.mode === "edit" ? modal.id : undefined}
            onSaved={() => setModal(null)}
          />
        </BottomSheet>
      )}
    </ListCard>
  );
}
