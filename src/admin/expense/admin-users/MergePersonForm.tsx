import { useState } from "react";
import { toast } from "sonner";
import { useMergeAdminUser } from "../../../api/hooks/expense/useAdminUsers";
import { messageFor } from "../../../api/mutationErrors";
import type { AdminUserAccount } from "../../../api/types";
import CustomButton from "../../dms/components/CustomButton";
import SelectInput from "../../dms/components/SelectInput";

const nameOf = (item: AdminUserAccount) => item.name || item.email || item.mobile || "Unnamed";
const sameName = (a: AdminUserAccount, b: AdminUserAccount) =>
  nameOf(a).trim().toLowerCase() === nameOf(b).trim().toLowerCase();

interface MergePersonFormProps {
  item: AdminUserAccount;
  people: AdminUserAccount[];
  onCancel: () => void;
  onMerged: () => void;
}

// Owner only: folds a duplicate guest into the person they really are. People
// with the same name come first, since that's the usual duplicate.
export function MergePersonForm({ item, people, onCancel, onMerged }: MergePersonFormProps) {
  const merge = useMergeAdminUser();
  const [intoId, setIntoId] = useState<number | null>(null);

  const candidates = people
    .filter((person) => person.id !== item.id && person.isActive)
    .sort((a, b) => Number(sameName(b, item)) - Number(sameName(a, item)));
  const options = candidates.map((person) => {
    const contact = person.email || person.mobile || (person.hasLogin ? "" : "guest");
    return { value: person.id, label: `${nameOf(person)}${contact ? ` · ${contact}` : ""} · #${person.id}` };
  });

  async function handleMerge() {
    if (intoId === null) return;
    try {
      await merge.mutateAsync({ id: item.id, intoId });
      const into = candidates.find((person) => person.id === intoId);
      toast.success(`Merged ${nameOf(item)} into ${into ? nameOf(into) : "them"}`);
      onMerged();
    } catch (error) {
      toast.error(messageFor(error));
    }
  }

  return (
    <div className="people-merge">
      <p className="people-muted">
        Everything for <strong>{nameOf(item)}</strong> (#{item.id}) moves to the person you pick: expenses, split
        shares, groups, savings and repayments. Shares on the same expense are added together. Then this entry is
        deleted. This can't be undone.
      </p>
      <SelectInput
        size="sm"
        placeholder="Merge into…"
        options={options}
        value={intoId}
        onChange={(value) => setIntoId(typeof value === "number" ? value : null)}
      />
      <footer className="people-merge-actions">
        <CustomButton size="sm" className="m-0" variant="outline" onClick={onCancel}>
          Cancel
        </CustomButton>
        <CustomButton
          size="sm"
          className="m-0"
          bg="danger"
          disabled={intoId === null || merge.isPending}
          onClick={handleMerge}
        >
          <i className="fa-solid fa-code-merge" aria-hidden="true"></i>
          <span>{merge.isPending ? "Merging…" : "Merge"}</span>
        </CustomButton>
      </footer>
    </div>
  );
}
