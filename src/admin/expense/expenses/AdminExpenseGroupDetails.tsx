import { useState } from "react";
import { useCreateAdminUser } from "../../../api/hooks/expense/useAdminUsers";
import { useExpenseGroupExpenses, useUpdateExpenseGroup } from "../../../api/hooks/expense/useExpenseGroups";
import { useExpenseMembers } from "../../../api/hooks/expense/useExpenseMembers";
import type { AdminUserRef, Expense, ExpenseGroup } from "../../../api/types";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { confirmAction } from "../../components/confirmDelete";
import SelectInput from "../../dms/components/SelectInput";
import { avatarColorFor } from "../avatarColor";
import { CategoryIcon } from "../categories/CategoryIcon";
import { resolveCategoryIcon } from "../categories/categoryIcons";
import { formatCurrency } from "../currency";
import { formatDay } from "../dates";
import { AdminExpenseGroupSettleUp } from "./AdminExpenseGroupSettleUp";
import { mayManageGroup, mayRunGroup } from "./groupSettlement";
import { HistorySection } from "../activity/ActivityHistory";
import "./groupDetails.css";
import { memberLabel } from "../memberLabel";

const personName = (person: AdminUserRef) => person.name || person.email || "Unknown member";

function GroupPeople({ group }: { group: ExpenseGroup }) {
  const { admin } = useAdminAuth();
  const myId = admin?.sub ? Number(admin.sub) : null;
  const { data: members } = useExpenseMembers();
  const updateGroup = useUpdateExpenseGroup();
  const createPerson = useCreateAdminUser();
  // Numbers are existing people; strings are new names typed into the picker.
  const [toAdd, setToAdd] = useState<(number | string)[]>([]);
  const [adding, setAdding] = useState(false);

  // An older group has no people recorded, so it starts from those with money
  // in it (who can't be left out of it).
  const people: { id: number; name: string }[] = group.members.length
    ? group.members.map((member) => ({ id: member.adminUserId, name: personName(member.adminUser) }))
    : group.balances.map((balance) => ({ id: balance.adminUserId, name: balance.name }));
  const ids = people.map((person) => person.id);
  const hasMoneyInGroup = (id: number) => group.balances.some((balance) => balance.adminUserId === id);
  const isClosed = group.closedAt !== null;
  // Members add people; taking someone out is the creator's call.
  const canAdd = !isClosed && mayManageGroup(admin, group);
  const canRemove = !isClosed && mayRunGroup(admin, group);

  const options = (members ?? [])
    .filter((member) => !ids.includes(member.id))
    .map((member) => ({ value: member.id, label: memberLabel(member) }));

  async function handleAdd() {
    if (toAdd.length === 0) return;
    setAdding(true);
    try {
      const newIds: number[] = [];
      for (const entry of toAdd) {
        if (typeof entry === "number") {
          newIds.push(entry);
        } else {
          // A guest: listed for splits, can be given a login later under People.
          const created = await createPerson.mutateAsync({
            name: entry.trim(),
            hasPortfolioAccess: false,
            hasExpensesAccess: false,
            hasSavingsAccess: false,
          });
          newIds.push(created.id);
        }
      }
      await updateGroup.mutateAsync({ id: group.id, input: { memberAdminUserIds: [...ids, ...newIds] } });
      setToAdd([]);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(person: { id: number; name: string }) {
    if (await confirmAction(`Remove ${person.name} from "${group.name}"?`, "You can add them back at any time.", "Remove")) {
      updateGroup.mutate({ id: group.id, input: { memberAdminUserIds: ids.filter((id) => id !== person.id) } });
    }
  }

  // Anyone with money in the group is already in the Per person table below;
  // only the rest (added but in no expense yet) are listed here.
  const notInTable = people.filter((person) => !hasMoneyInGroup(person.id));

  return (
    <>
      {notInTable.length > 0 && (
        <ul className="admin-group-people" aria-label="People not in any expense yet">
          {notInTable.map((person) => (
            <li key={person.id}>
              <span className="admin-group-person-avatar" style={{ background: avatarColorFor(person.name) }}>
                {person.name.charAt(0).toUpperCase()}
              </span>
              <span>
                {person.name}
                {person.id === myId && " (you)"}
              </span>
              {canRemove && person.id !== group.createdByAdminUserId && (
                <button
                  type="button"
                  className="admin-group-person-remove"
                  onClick={() => handleRemove(person)}
                  aria-label={`Remove ${person.name}`}
                  title="Remove from group"
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <div className="admin-group-people-add">
          <div className="admin-group-people-picker">
            <SelectInput
              isMulti
              creatable
              clearable={false}
              size="sm"
              placeholder="Add people…"
              options={options}
              value={toAdd}
              onChange={setToAdd}
            />
          </div>
          <button
            type="button"
            className="admin-group-people-add-btn"
            disabled={adding || toAdd.length === 0}
            onClick={handleAdd}
            aria-label="Add people"
            title="Add people"
          >
            <i className={`fa-solid ${adding ? "fa-spinner fa-spin" : "fa-user-plus"}`} aria-hidden="true"></i>
          </button>
        </div>
      )}
    </>
  );
}

// Collapsed to its one-line header by default; tap it to see the split.
function GroupExpenseCard({ expense }: { expense: Expense }) {
  const payer = personName(expense.paidBy);
  const fromFund = expense.savingsGoal?.kind === "fund";
  const [open, setOpen] = useState(false);
  return (
    <li className={`admin-group-expense${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="admin-group-expense-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <CategoryIcon name={expense.category.name} {...resolveCategoryIcon(expense.category)} className="admin-txn-icon" />
        <span className="admin-group-expense-main">
          <span className="admin-group-expense-title">{expense.description || expense.category.name}</span>
          <span className="admin-group-expense-meta">
            {expense.description && `${expense.category.name} · `}
            {formatDay(expense.date)} ·{" "}
            {fromFund ? `From ${expense.savingsGoal!.name} · handed over by ${payer}` : `Paid by ${payer}`}
            {expense.savingsGoal && !fromFund && ` · From ${expense.savingsGoal.name}`}
          </span>
        </span>
        <strong className={`admin-group-expense-amount${fromFund ? " is-fund" : ""}`}>
          {fromFund && <i className="fa-solid fa-people-group" title="Paid from the fund" aria-hidden="true"></i>}{" "}
          {formatCurrency(expense.amount)}
        </strong>
        <i className="fa-solid fa-chevron-down admin-group-expense-chevron" aria-hidden="true"></i>
      </button>
      {!open ? null : expense.splitParticipants.length > 0 ? (
        <ul className="admin-group-expense-shares" aria-label="Split between">
          {expense.splitParticipants.map((participant) => (
            <li key={participant.adminUserId}>
              <span>
                {personName(participant.adminUser)}
                {participant.adminUserId === expense.paidByAdminUserId && (
                  <span className="admin-split-payer">Paid</span>
                )}
              </span>
              <span>{formatCurrency(participant.shareAmount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-group-expense-unsplit">
          {fromFund
            ? "Not split: everyone on the fund shares it equally."
            : `Not split: ${payer} covers all of it.`}
        </p>
      )}
    </li>
  );
}

function GroupExpenses({ group, onAddExpense }: { group: ExpenseGroup; onAddExpense?: () => void }) {
  const { data: expenses, isLoading } = useExpenseGroupExpenses(group.id);
  const hidden = group.expenseCount - (expenses?.length ?? 0);
  return (
    <>
      <div className="admin-group-expenses-head">
        <h5 className="admin-settle-heading">Expenses ({group.expenseCount})</h5>
        {onAddExpense && group.closedAt === null && (
          <button type="button" className="admin-group-expenses-add" onClick={onAddExpense}>
            <i className="fa-solid fa-plus" aria-hidden="true"></i> Add expense
          </button>
        )}
      </div>
      {isLoading ? (
        <p className="admin-settle-note">Loading...</p>
      ) : !expenses?.length && hidden <= 0 ? (
        <p className="admin-settle-note">No expenses in this group yet.</p>
      ) : (
        <ul className="admin-group-expenses">
          {(expenses ?? []).map((expense) => (
            <GroupExpenseCard expense={expense} key={expense.id} />
          ))}
        </ul>
      )}
      {!isLoading && hidden > 0 && (
        <p className="admin-settle-note">
          <i className="fa-solid fa-lock"></i> {hidden} more {hidden === 1 ? "is" : "are"} private to the people involved.
        </p>
      )}
    </>
  );
}

// Everything about one trip/event in one place: the people in it, who paid and
// owes what, repayments, and every expense with how it was split.
export function AdminExpenseGroupDetails({
  group,
  onAddExpense,
}: {
  group: ExpenseGroup;
  onAddExpense?: () => void;
}) {
  return (
    <AdminExpenseGroupSettleUp
      group={group}
      afterStats={<GroupPeople group={group} />}
      beforeActions={
        <>
          <GroupExpenses group={group} onAddExpense={onAddExpense} />
          <HistorySection filter={{ expenseGroupId: group.id }} />
        </>
      }
    />
  );
}
