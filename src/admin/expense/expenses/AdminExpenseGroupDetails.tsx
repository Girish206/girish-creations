import { useState } from "react";
import { useCreateAdminUser } from "../../../api/hooks/expense/useAdminUsers";
import { useExpenseGroupExpenses, useUpdateExpenseGroup } from "../../../api/hooks/expense/useExpenseGroups";
import { useExpenseMembers } from "../../../api/hooks/expense/useExpenseMembers";
import type { AdminUserRef, Expense, ExpenseGroup } from "../../../api/types";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { confirmAction } from "../../components/confirmDelete";
import CustomButton from "../../dms/components/CustomButton";
import SelectInput from "../../dms/components/SelectInput";
import { avatarColorFor } from "../avatarColor";
import { CategoryIcon } from "../categories/CategoryIcon";
import { resolveCategoryIcon } from "../categories/categoryIcons";
import { formatCurrency } from "../currency";
import { formatDay } from "../dates";
import { AdminExpenseGroupSettleUp } from "./AdminExpenseGroupSettleUp";
import "./groupDetails.css";

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

  const options = (members ?? [])
    .filter((member) => !ids.includes(member.id))
    .map((member) => ({ value: member.id, label: personName(member) }));

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

  return (
    <>
      <h5 className="admin-settle-heading">People ({people.length})</h5>
      {people.length === 0 ? (
        <p className="admin-settle-note">Nobody is in this group yet.</p>
      ) : (
        <ul className="admin-group-people">
          {people.map((person) => (
            <li key={person.id}>
              <span className="admin-group-person-avatar" style={{ background: avatarColorFor(person.name) }}>
                {person.name.charAt(0).toUpperCase()}
              </span>
              <span>
                {person.name}
                {person.id === myId && " (you)"}
              </span>
              {!isClosed && !hasMoneyInGroup(person.id) && (
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
      {!isClosed && (
        <div className="admin-group-people-add">
          <div className="admin-group-people-picker">
            <SelectInput
              label="Add people"
              isMulti
              creatable
              clearable={false}
              placeholder="Choose or type…"
              options={options}
              value={toAdd}
              onChange={setToAdd}
            />
          </div>
          <CustomButton className="m-0" loading={adding} disabled={toAdd.length === 0} onClick={handleAdd}>
            <i className="fa-solid fa-user-plus" aria-hidden="true"></i> Add
          </CustomButton>
        </div>
      )}
    </>
  );
}

function GroupExpenseCard({ expense }: { expense: Expense }) {
  const payer = personName(expense.paidBy);
  return (
    <li className="admin-group-expense">
      <div className="admin-group-expense-head">
        <CategoryIcon name={expense.category.name} {...resolveCategoryIcon(expense.category)} className="admin-txn-icon" />
        <div className="admin-group-expense-main">
          <p className="admin-group-expense-title">{expense.description || expense.category.name}</p>
          <p className="admin-group-expense-meta">
            {expense.category.name} · {formatDay(expense.date)} · Paid by {payer}
            {expense.savingsGoal && ` · From ${expense.savingsGoal.name}`}
          </p>
        </div>
        <strong className="admin-group-expense-amount">{formatCurrency(expense.amount)}</strong>
      </div>
      {expense.splitParticipants.length > 0 ? (
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
        <p className="admin-group-expense-unsplit">Not split: {payer} covers all of it.</p>
      )}
    </li>
  );
}

function GroupExpenses({ group }: { group: ExpenseGroup }) {
  const { data: expenses, isLoading } = useExpenseGroupExpenses(group.id);
  const hidden = group.expenseCount - (expenses?.length ?? 0);
  return (
    <>
      <h5 className="admin-settle-heading">Expenses ({group.expenseCount})</h5>
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
export function AdminExpenseGroupDetails({ group }: { group: ExpenseGroup }) {
  return (
    <AdminExpenseGroupSettleUp
      group={group}
      afterStats={<GroupPeople group={group} />}
      beforeActions={<GroupExpenses group={group} />}
    />
  );
}
