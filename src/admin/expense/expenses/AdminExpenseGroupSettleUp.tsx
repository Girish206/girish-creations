import { useState } from "react";
import {
  useAddExpenseGroupSettlement,
  useDeleteExpenseGroupSettlement,
  useSetExpenseGroupClosed,
} from "../../../api/hooks/expense/useExpenseGroups";
import type { Expense, ExpenseGroup } from "../../../api/types";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { confirmAction, confirmDelete } from "../../components/confirmDelete";
import CustomButton from "../../dms/components/CustomButton";
import { ModalActions } from "../../components/ModalActions";
import { formatCurrency } from "../currency";
import { computeGroupBalances, suggestTransfers, type SuggestedTransfer } from "./groupSettlement";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const fromCents = (cents: number) => cents / 100;

export interface AdminExpenseGroupSettleUpProps {
  group: ExpenseGroup;
  expenses: Expense[];
}

// Settle-up view for one trip/event group: who paid what, each person's
// fair share, what's already been repaid, and what's still pending — plus
// the transfers that would square everyone up, each recordable in one
// click (amount editable for partial repayments). Closing the group freezes
// its expenses and settlements.
export function AdminExpenseGroupSettleUp({ group, expenses }: AdminExpenseGroupSettleUpProps) {
  const { admin } = useAdminAuth();
  const addSettlement = useAddExpenseGroupSettlement();
  const deleteSettlement = useDeleteExpenseGroupSettlement();
  const setGroupClosed = useSetExpenseGroupClosed();
  // Editable amount per suggested transfer, keyed "from-to".
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [recordingKey, setRecordingKey] = useState<string | null>(null);

  const isClosed = group.closedAt !== null;
  const balances = computeGroupBalances(expenses, group.settlements);
  const transfers = suggestTransfers(balances);
  const totalCents = balances.reduce((sum, b) => sum + b.paidCents, 0);
  const pendingCents = balances.reduce((sum, b) => sum + Math.max(0, b.pendingCents), 0);

  const transferKey = (t: SuggestedTransfer) => `${t.fromAdminUserId}-${t.toAdminUserId}`;

  async function handleRecord(t: SuggestedTransfer) {
    const key = transferKey(t);
    const amount = amounts[key] ?? fromCents(t.amountCents).toFixed(2);
    if (!(Number(amount) > 0)) return;
    setRecordingKey(key);
    try {
      await addSettlement.mutateAsync({
        groupId: group.id,
        input: {
          amount,
          date: new Date().toISOString().slice(0, 10),
          fromAdminUserId: t.fromAdminUserId,
          toAdminUserId: t.toAdminUserId,
        },
      });
      setAmounts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } finally {
      setRecordingKey(null);
    }
  }

  async function handleDeleteSettlement(settlementId: number) {
    if (await confirmDelete("settlement")) {
      deleteSettlement.mutate({ groupId: group.id, settlementId });
    }
  }

  async function handleToggleClosed() {
    const confirmed = isClosed
      ? await confirmAction(
          `Reopen "${group.name}"?`,
          "Its expenses and settlements can be changed again.",
          "Reopen",
        )
      : await confirmAction(
          `Close "${group.name}"?`,
          pendingCents > 0
            ? `${formatCurrency(fromCents(pendingCents))} is still pending. Closing freezes the group's expenses and settlements as they are — you can reopen it later.`
            : "Everyone is settled up. Closing freezes the group's expenses and settlements — you can reopen it later.",
          pendingCents > 0 ? "Close anyway" : "Yes, close it",
        );
    if (confirmed) {
      setGroupClosed.mutate({ id: group.id, closed: !isClosed });
    }
  }

  return (
    <div className="admin-settle">
      <div className="admin-settle-stats">
        <div>
          <span className="admin-settle-stat-label">Total spent</span>
          <strong>{formatCurrency(fromCents(totalCents))}</strong>
        </div>
        <div>
          <span className="admin-settle-stat-label">Expenses</span>
          <strong>{expenses.length}</strong>
        </div>
        <div>
          <span className="admin-settle-stat-label">Still pending</span>
          <strong className={pendingCents > 0 ? "admin-settle-owes" : "admin-settle-gets"}>
            {pendingCents > 0 ? formatCurrency(fromCents(pendingCents)) : "All settled"}
          </strong>
        </div>
        <div>
          <span className="admin-settle-stat-label">Status</span>
          <strong>{isClosed ? `Closed ${formatDate(group.closedAt!)}` : "Open"}</strong>
        </div>
      </div>

      {!admin?.isSuperAdmin && (
        <p className="admin-settle-note">
          <i className="fa-solid fa-circle-info"></i> Based on the expenses in this group that you can see.
        </p>
      )}

      <h5 className="admin-settle-heading">Per person</h5>
      {balances.length === 0 ? (
        <p className="admin-settle-note">No expenses in this group yet.</p>
      ) : (
        <div className="admin-settle-table-wrap">
          <table className="admin-settle-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Paid</th>
                <th>Share</th>
                <th>Settled</th>
                <th>Pending</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => {
                const settledCents = b.sentCents - b.receivedCents;
                return (
                  <tr key={b.adminUserId}>
                    <td>{b.name}</td>
                    <td>{formatCurrency(fromCents(b.paidCents))}</td>
                    <td>{formatCurrency(fromCents(b.shareCents))}</td>
                    <td title={`Paid back ${formatCurrency(fromCents(b.sentCents))} · received ${formatCurrency(fromCents(b.receivedCents))}`}>
                      {settledCents === 0
                        ? "—"
                        : settledCents > 0
                          ? `Paid ${formatCurrency(fromCents(settledCents))}`
                          : `Got ${formatCurrency(fromCents(-settledCents))}`}
                    </td>
                    <td>
                      {b.pendingCents > 0 ? (
                        <span className="admin-settle-gets">Gets {formatCurrency(fromCents(b.pendingCents))}</span>
                      ) : b.pendingCents < 0 ? (
                        <span className="admin-settle-owes">Owes {formatCurrency(fromCents(-b.pendingCents))}</span>
                      ) : (
                        <span className="admin-settle-square">
                          <i className="fa-solid fa-check"></i> Settled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {transfers.length > 0 && (
        <>
          <h5 className="admin-settle-heading">To settle up</h5>
          <ul className="admin-settle-list">
            {transfers.map((t) => {
              const key = transferKey(t);
              return (
                <li key={key}>
                  <span>
                    <strong>{t.fromName}</strong> pays <strong>{t.toName}</strong>{" "}
                    {formatCurrency(fromCents(t.amountCents))}
                  </span>
                  {!isClosed && (
                    <span className="admin-settle-record">
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        min="0.01"
                        step="0.01"
                        aria-label="Amount paid"
                        value={amounts[key] ?? fromCents(t.amountCents).toFixed(2)}
                        onChange={(e) => setAmounts((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                      <CustomButton
                        size="sm"
                        className="m-0"
                        loading={recordingKey === key}
                        onClick={() => handleRecord(t)}
                        title="Record this repayment"
                      >
                        Mark paid
                      </CustomButton>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {group.settlements.length > 0 && (
        <>
          <h5 className="admin-settle-heading">Recorded repayments</h5>
          <ul className="admin-settle-list">
            {group.settlements.map((s) => (
              <li key={s.id}>
                <span>
                  {s.fromAdminUser.name || s.fromAdminUser.email} paid {s.toAdminUser.name || s.toAdminUser.email}{" "}
                  <strong>{formatCurrency(s.amount)}</strong> · {formatDate(s.date)}
                </span>
                {!isClosed && (
                  <button
                    type="button"
                    className="admin-savings-contribution-remove"
                    onClick={() => handleDeleteSettlement(s.id)}
                    aria-label="Remove repayment"
                    title="Remove"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <ModalActions>
        <CustomButton
          variant={isClosed ? "normal" : "outline"}
          className="m-0"
          loading={setGroupClosed.isPending}
          onClick={handleToggleClosed}
        >
          <i className={`fa-solid ${isClosed ? "fa-lock-open" : "fa-lock"}`}></i>{" "}
          {isClosed ? "Reopen group" : "Close group"}
        </CustomButton>
      </ModalActions>
    </div>
  );
}
