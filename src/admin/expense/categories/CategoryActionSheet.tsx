import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { CategoryIconType } from "../../../api/types";
import { CategoryIcon } from "./CategoryIcon";

export interface CategoryActionSheetProps {
  name: string;
  icon: { type: CategoryIconType; value: string };
  onEdit: () => void;
  onMerge?: () => void;
  onDelete: () => void;
  onClose: () => void;
}

// Phone-only bottom sheet with a category's actions. On a phone the tile
// grid has no room for three icon buttons per tile, so tapping a tile opens
// this instead.
export function CategoryActionSheet({ name, icon, onEdit, onMerge, onDelete, onClose }: CategoryActionSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return createPortal(
    <div className="admin-cat-sheet-backdrop" onClick={onClose}>
      <div
        className="admin-cat-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${name} actions`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="admin-cat-sheet-grabber" aria-hidden="true"></span>
        <div className="admin-cat-sheet-head">
          <CategoryIcon name={name} {...icon} />
          <strong>{name}</strong>
        </div>
        <div className="admin-cat-sheet-actions">
          <button type="button" onClick={run(onEdit)}>
            <i className="fa-solid fa-pen" aria-hidden="true"></i>
            Edit category
          </button>
          {onMerge && (
            <button type="button" onClick={run(onMerge)}>
              <i className="fa-solid fa-code-merge" aria-hidden="true"></i>
              Merge into another
            </button>
          )}
          <button type="button" className="is-danger" onClick={run(onDelete)}>
            <i className="fa-solid fa-trash" aria-hidden="true"></i>
            Delete
          </button>
        </div>
        <button type="button" className="admin-cat-sheet-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
}
