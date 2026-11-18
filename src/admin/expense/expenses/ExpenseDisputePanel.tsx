import { useState } from "react";
import { toast } from "sonner";
import { useSetExpenseDispute } from "../../../api/hooks/expense/useExpenses";
import type { Expense } from "../../../api/types";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import CustomButton from "../../dms/components/CustomButton";
import TextareaInput from "../../dms/components/TextareaInput";
import { formatCurrency } from "../currency";
import "./disputes.css";

export const isDisputed = (expense: Expense) => expense.splitParticipants.some((p) => p.disputedAt !== null);

// Shows who says their share isn't right, and lets someone sharing the expense
// say so (or take it back). It changes no amounts: whoever paid or logged it
// gets an email and can fix the split, which clears it.
export function ExpenseDisputePanel({ expense }: { expense: Expense }) {
  const { admin } = useAdminAuth();
  const myId = admin?.sub ? Number(admin.sub) : null;
  const setDispute = useSetExpenseDispute();
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");

  const disputes = expense.splitParticipants.filter((p) => p.disputedAt !== null);
  const myShare =
    expense.paidByAdminUserId !== myId ? expense.splitParticipants.find((p) => p.adminUserId === myId) : undefined;
  if (disputes.length === 0 && !myShare) return null;

  function send(disputed: boolean) {
    setDispute.mutate(
      { id: expense.id, disputed, note: disputed ? note.trim() || null : null },
      {
        onSuccess: () => {
          setWriting(false);
          setNote("");
          toast.success(disputed ? "Sent. They'll get an email to check it." : "Taken back.");
        },
      },
    );
  }

  return (
    <div className="admin-dispute-panel">
      {disputes.length > 0 && (
        <ul className="admin-dispute-list">
          {disputes.map((p) => (
            <li className="admin-dispute-item" key={p.id}>
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
              <span>
                {p.adminUserId === myId ? "You say your" : `${p.adminUser.name || p.adminUser.email} says their`} share of{" "}
                {formatCurrency(p.shareAmount)} isn't right{p.disputeNote ? `: "${p.disputeNote}"` : "."}
              </span>
            </li>
          ))}
        </ul>
      )}

      {myShare && !myShare.disputedAt && !writing && (
        <div className="admin-dispute-actions">
          <CustomButton variant="outline" className="m-0" onClick={() => setWriting(true)}>
            <i className="fa-solid fa-flag" aria-hidden="true"></i> This isn't right
          </CustomButton>
          <p className="admin-dispute-hint">Your share is {formatCurrency(myShare.shareAmount)}.</p>
        </div>
      )}

      {myShare && !myShare.disputedAt && writing && (
        <>
          <TextareaInput
            label="What's wrong? (optional)"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            placeholder="e.g. I wasn't there for dinner"
          />
          <div className="admin-dispute-actions">
            <CustomButton className="m-0" loading={setDispute.isPending} onClick={() => send(true)}>
              Send
            </CustomButton>
            <CustomButton variant="outline" className="m-0" onClick={() => setWriting(false)}>
              Cancel
            </CustomButton>
          </div>
          <p className="admin-dispute-hint">
            Whoever paid or logged it gets an email. Nothing changes until they edit the split.
          </p>
        </>
      )}

      {myShare?.disputedAt && (
        <div className="admin-dispute-actions">
          <CustomButton variant="outline" className="m-0" loading={setDispute.isPending} onClick={() => send(false)}>
            Take it back
          </CustomButton>
        </div>
      )}
    </div>
  );
}
