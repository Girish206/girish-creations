import { useState } from "react";
import { useExpenseGroups, useCreateExpenseGroup } from "../../../api/hooks/expense/useExpenseGroups";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import SelectInput from "../../dms/components/SelectInput";

export interface AdminExpenseBulkMoveFormProps {
  count: number;
  onMove: (expenseGroupId: number) => Promise<void>;
  onDone: () => void;
}

// Picker used by the Expenses page's "N selected" bulk bar — separate modal
// instead of an inline dropdown in the bar itself, since a full react-select
// menu inside that compact bar didn't leave enough room on mobile.
export function AdminExpenseBulkMoveForm({ count, onMove, onDone }: AdminExpenseBulkMoveFormProps) {
  const { data: groups } = useExpenseGroups();
  const createExpenseGroup = useCreateExpenseGroup();
  const [target, setTarget] = useState<number | string>("");
  const [submitting, setSubmitting] = useState(false);

  const groupOptions = (groups ?? []).filter((g) => !g.closedAt).map((g) => ({ value: g.id, label: g.name }));

  async function handleSubmit() {
    if (target === "") return;
    setSubmitting(true);
    try {
      const expenseGroupId = typeof target === "number" ? target : (await createExpenseGroup.mutateAsync(target)).id;
      await onMove(expenseGroupId);
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalForm
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <p className="text-muted mb-3">
        Moving {count} selected expense{count === 1 ? "" : "s"}.
      </p>
      <SelectInput
        label="Expense Group"
        placeholder="Select or create a group"
        creatable
        options={groupOptions}
        value={target}
        onChange={setTarget}
      />
      <SubmitButton loading={submitting} disabled={target === ""}>
        Move
      </SubmitButton>
    </ModalForm>
  );
}
