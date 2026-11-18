import { useState } from "react";
import { toast } from "sonner";
import { useMergeExpenseCategory } from "../../../api/hooks/expense/useExpenseCategories";
import type { ExpenseCategory } from "../../../api/types";
import { confirmAction } from "../../components/confirmDelete";
import { ModalActions } from "../../components/ModalActions";
import CustomButton from "../../dms/components/CustomButton";
import SelectInput from "../../dms/components/SelectInput";

// Folds a duplicate ("food" beside "Food") into the category to keep: its
// expenses move across and it's removed. Super admins only.
export function MergeCategoryForm({
  category,
  categories,
  onDone,
}: {
  category: ExpenseCategory;
  categories: ExpenseCategory[];
  onDone: () => void;
}) {
  const merge = useMergeExpenseCategory();
  const [intoId, setIntoId] = useState<number | null>(null);
  const options = categories
    .filter((other) => other.id !== category.id)
    .map((other) => ({ value: other.id, label: other.name }));
  const into = categories.find((other) => other.id === intoId);

  async function handleMerge() {
    if (!into) return;
    const confirmed = await confirmAction(
      `Merge "${category.name}" into "${into.name}"?`,
      `Every expense in "${category.name}" moves to "${into.name}", and "${category.name}" is removed. This can't be undone.`,
      "Merge",
    );
    if (!confirmed) return;
    merge.mutate(
      { id: category.id, intoCategoryId: into.id },
      {
        onSuccess: ({ moved }) => {
          toast.success(`Merged. ${moved} expense${moved === 1 ? "" : "s"} moved to "${into.name}".`);
          onDone();
        },
      },
    );
  }

  return (
    <div>
      <p className="text-muted small">
        Use this for duplicates. Everyone's expenses in "{category.name}" move to the category you pick.
      </p>
      <SelectInput
        label="Merge into"
        options={options}
        value={intoId ?? ""}
        onChange={(value) => setIntoId(value === "" || value === null ? null : Number(value))}
        placeholder="Choose a category…"
      />
      <ModalActions>
        <CustomButton className="m-0" disabled={!into} loading={merge.isPending} onClick={handleMerge}>
          <i className="fa-solid fa-code-merge" aria-hidden="true"></i> Merge
        </CustomButton>
      </ModalActions>
    </div>
  );
}
