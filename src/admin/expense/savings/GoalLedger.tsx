import { useExpenseGroupExpenses } from "../../../api/hooks/expense/useExpenseGroups";
import type { AdminUserRef, Expense, SavingsContribution, SavingsGoal } from "../../../api/types";
import { RowActions } from "../../components/RowActions";
import { avatarColorFor } from "../avatarColor";
import { CategoryIcon } from "../categories/CategoryIcon";
import { resolveCategoryIcon } from "../categories/categoryIcons";
import { formatCurrency } from "../currency";
import { formatDay } from "../dates";

const personName = (p: AdminUserRef) => p.name || p.email || "Unknown";

type Entry =
  | { kind: "in"; date: string; at: string; contribution: SavingsContribution }
  | { kind: "out"; date: string; at: string; expense: Expense };

interface GoalLedgerProps {
  goal: SavingsGoal;
  myId: number | null;
  mayRemove: (contribution: SavingsContribution) => boolean;
  onRemove: (contribution: SavingsContribution) => void;
}

// A goal's money as one timeline, newest first: contributions in (+) and, for
// a shared fund, what was paid from it (−), read from the fund's trip group.
export function GoalLedger(props: GoalLedgerProps) {
  return props.goal.expenseGroupId !== null ? (
    <FundLedger {...props} groupId={props.goal.expenseGroupId} />
  ) : (
    <LedgerRows {...props} spends={[]} />
  );
}

function FundLedger({ groupId, ...props }: GoalLedgerProps & { groupId: number }) {
  const { data } = useExpenseGroupExpenses(groupId);
  const spends = (data ?? []).filter((expense) => expense.savingsGoalId === props.goal.id);
  return <LedgerRows {...props} spends={spends} />;
}

function LedgerRows({ goal, myId, mayRemove, onRemove, spends }: GoalLedgerProps & { spends: Expense[] }) {
  const entries: Entry[] = [
    ...goal.contributions.map((c) => ({ kind: "in" as const, date: c.date, at: c.createdAt, contribution: c })),
    ...spends.map((e) => ({ kind: "out" as const, date: e.date, at: e.createdAt, expense: e })),
  ].sort((a, b) => b.date.slice(0, 10).localeCompare(a.date.slice(0, 10)) || b.at.localeCompare(a.at));

  if (entries.length === 0) {
    return <p className="exl-empty">{goal.kind === "fund" ? "No money in or out yet." : "No contributions yet."}</p>;
  }

  return (
    <>
      {entries.map((entry) => {
        if (entry.kind === "out") {
          const e = entry.expense;
          const payer = e.paidByAdminUserId === myId ? "You" : personName(e.paidBy);
          const forWhom =
            e.splitParticipants.length > 0
              ? `for ${e.splitParticipants.map((p) => (p.adminUserId === myId ? "you" : personName(p.adminUser))).join(", ")}`
              : "shared by everyone";
          return (
            <div className="exl-row sgl-row" key={`out-${e.id}`}>
              <CategoryIcon name={e.category.name} {...resolveCategoryIcon(e.category)} className="admin-txn-icon" />
              <div className="exl-row-main">
                <p className="exl-row-title">
                  <span title={e.description || e.category.name}>{e.description || e.category.name}</span>
                </p>
                <p className="exl-row-sub" title={`Handed over by ${payer}, ${forWhom}`}>
                  {formatDay(e.date)} · {forWhom}
                </p>
              </div>
              <span className="exl-row-amount">−{formatCurrency(e.amount)}</span>
            </div>
          );
        }
        const c = entry.contribution;
        const name = personName(c.contributedBy);
        return (
          <div className="exl-row sgl-row" key={`in-${c.id}`}>
            <span className="admin-txn-icon" style={{ background: avatarColorFor(name) }} aria-hidden="true">
              {name.charAt(0).toUpperCase()}
            </span>
            <div className="exl-row-main">
              <p className="exl-row-title">
                <span>{c.contributedByAdminUserId === myId ? "You" : name}</span>
              </p>
              <p className="exl-row-sub">
                {formatDay(c.date)} · {goal.kind === "fund" ? "put in" : "saved"}
              </p>
            </div>
            <span className="exl-row-amount sgl-pos">+{formatCurrency(Number(c.amount))}</span>
            {mayRemove(c) && (
              <div className="exl-row-actions">
                <RowActions onDelete={() => onRemove(c)} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
