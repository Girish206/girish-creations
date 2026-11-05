import { Link } from "react-router-dom";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useDirectBalances, useExpenses } from "../../../api/hooks/expense/useExpenses";
import { useExpenseGroups } from "../../../api/hooks/expense/useExpenseGroups";
import { useSavingsGoals } from "../../../api/hooks/expense/useSavingsGoals";
import { useExpenseCategories } from "../../../api/hooks/expense/useExpenseCategories";
import type { Expense } from "../../../api/types";
import { formatCurrency } from "../currency";
import { formatDay, todayLocal } from "../dates";
import "../../dms/css/adminDisplays.css";
import "../../admin.css";
import "./expenseDashboard.css";

// How many categories get their own bar; the rest fold into "Other".
const TOP_CATEGORIES = 5;

// This person's part of an expense: their split share, or all of it if they
// paid for an unsplit one.
function myShare(expense: Expense, myId: number | null): number {
  if (expense.splitParticipants.length > 0) {
    const mine = expense.splitParticipants.find((p) => p.adminUserId === myId);
    return mine ? Number(mine.shareAmount) : 0;
  }
  return expense.paidByAdminUserId === myId ? Number(expense.amount) : 0;
}

function categoryBreakdown(expenses: Expense[]) {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    totals.set(expense.category.name, (totals.get(expense.category.name) ?? 0) + Number(expense.amount));
  }
  const sorted = Array.from(totals, ([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  if (sorted.length <= TOP_CATEGORIES + 1) return sorted;
  const other = sorted.slice(TOP_CATEGORIES).reduce((sum, row) => sum + row.amount, 0);
  return [...sorted.slice(0, TOP_CATEGORIES), { name: "Other", amount: other }];
}

export function ExpenseDashboardPage() {
  const { admin } = useAdminAuth();
  const hasExpenses = Boolean(admin?.hasExpensesAccess);
  const hasSavings = Boolean(admin?.hasSavingsAccess);
  const myId = admin?.sub ? Number(admin.sub) : null;

  const { data: expenses } = useExpenses(hasExpenses);
  const { data: groups } = useExpenseGroups(hasExpenses);
  const { data: directBalances } = useDirectBalances(hasExpenses);
  const { data: savingsGoals } = useSavingsGoals(hasSavings);
  const { data: categories } = useExpenseCategories(hasExpenses);

  const allExpenses = expenses ?? [];
  const thisMonthKey = todayLocal().slice(0, 7);
  const thisMonth = allExpenses.filter((e) => e.date.slice(0, 7) === thisMonthKey);
  const totalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const monthTotal = thisMonth.reduce((sum, e) => sum + Number(e.amount), 0);
  const monthShare = thisMonth.reduce((sum, e) => sum + myShare(e, myId), 0);
  const breakdown = categoryBreakdown(thisMonth);
  const biggestCategory = breakdown[0]?.amount ?? 0;
  const recent = allExpenses.slice(0, 5);

  // What's still pending for this person across groups that are still open.
  const groupPending = (groups ?? [])
    .filter((group) => !group.closedAt)
    .map((group) => ({
      id: `group-${group.id}`,
      name: group.name,
      cents: group.balances.find((balance) => balance.adminUserId === myId)?.pendingCents ?? 0,
    }))
    .filter((row) => row.cents !== 0);
  // Plus daily splits, each with one other person. A super admin also gets
  // other people's pairs, which aren't theirs to settle.
  const directPending = (directBalances?.transfers ?? [])
    .filter((t) => t.fromAdminUserId === myId || t.toAdminUserId === myId)
    .map((t) => {
      const iPay = t.fromAdminUserId === myId;
      return {
        id: `direct-${iPay ? t.toAdminUserId : t.fromAdminUserId}`,
        name: `${iPay ? t.toName : t.fromName} (daily splits)`,
        cents: iPay ? -t.amountCents : t.amountCents,
      };
    });
  const pending = [...groupPending, ...directPending];
  const owedToMe = pending.reduce((sum, row) => sum + Math.max(0, row.cents), 0) / 100;
  const iOwe = pending.reduce((sum, row) => sum + Math.max(0, -row.cents), 0) / 100;

  // Money still in open goals: closed ones have been used up or withdrawn.
  const savingsBalance = (savingsGoals ?? [])
    .filter((goal) => !goal.closedAt)
    .reduce(
      (sum, goal) =>
        sum + goal.contributions.reduce((s, c) => s + Number(c.amount), 0) - Number(goal.spentAmount),
      0,
    );

  // Each stat is only shown if the account actually has that section's
  // access — otherwise its query above is disabled and would show nothing
  // useful anyway (and would just 403 in the background).
  const stats = [
    hasExpenses && {
      label: "Spent This Month",
      value: expenses ? formatCurrency(monthTotal) : "–",
      icon: "fa-solid fa-calendar-day",
      link: "/admin/expense/expenses",
    },
    hasExpenses && {
      label: "Your Share This Month",
      value: expenses ? formatCurrency(monthShare) : "–",
      icon: "fa-solid fa-user",
      link: "/admin/expense/expenses",
    },
    hasExpenses && {
      label: "Owed To You",
      value: groups ? formatCurrency(owedToMe) : "–",
      icon: "fa-solid fa-hand-holding-dollar",
      link: "/admin/expense/expenses",
    },
    hasExpenses && {
      label: "You Owe",
      value: groups ? formatCurrency(iOwe) : "–",
      icon: "fa-solid fa-scale-balanced",
      link: "/admin/expense/expenses",
    },
    hasExpenses && {
      label: "Total Expenses",
      value: expenses ? formatCurrency(totalExpenses) : "–",
      icon: "fa-solid fa-receipt",
      link: "/admin/expense/expenses",
    },
    hasExpenses && {
      label: "Categories",
      value: categories?.length ?? "–",
      icon: "fa-solid fa-tags",
      link: "/admin/expense/categories",
    },
    hasSavings && {
      label: "Savings Balance",
      value: savingsGoals ? formatCurrency(savingsBalance) : "–",
      icon: "fa-solid fa-piggy-bank",
      link: "/admin/expense/savings",
    },
  ].filter((stat): stat is Exclude<typeof stat, false> => stat !== false);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <div className="admin-dashboard-hero">
        <div>
          <span className="admin-dashboard-hero-badge">Pocket</span>
          <h1>Welcome back{admin?.name ? `, ${admin.name}` : ""}</h1>
          <p>Here's a snapshot of your expenses and savings.</p>
        </div>
        <span className="admin-dashboard-hero-date">
          <i className="fa-solid fa-calendar-days"></i> {today}
        </span>
      </div>

      {stats.length === 0 ? (
        <div className="admin-empty-state">No sections enabled for your account yet.</div>
      ) : (
        <div className="admin-card-grid">
          {stats.map((stat) => (
            <Link to={stat.link} className="card admin-item-card admin-dashboard-stat-card" key={stat.label}>
              <div className="admin-item-card-header">
                <div className="admin-item-card-heading">
                  <div className="admin-item-card-icon">
                    <i className={stat.icon}></i>
                  </div>
                  <div>
                    <div className="admin-dashboard-stat-value">{stat.value}</div>
                    <p className="admin-item-card-subtitle">{stat.label}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {hasExpenses && expenses && (
        <div className="admin-money-panels">
          <section className="card admin-money-panel">
            <h2 className="admin-money-panel-title">This month by category</h2>
            {breakdown.length === 0 ? (
              <p className="admin-money-panel-empty">Nothing spent this month yet.</p>
            ) : (
              <ul className="admin-money-bars">
                {breakdown.map((row) => (
                  <li key={row.name} title={`${row.name}: ${formatCurrency(row.amount)}`}>
                    <span className="admin-money-bar-label">
                      <span className="admin-money-bar-name">{row.name}</span>
                      <strong>{formatCurrency(row.amount)}</strong>
                    </span>
                    <span className="admin-money-bar-track">
                      <span
                        className="admin-money-bar-fill"
                        style={{ width: `${biggestCategory > 0 ? (row.amount / biggestCategory) * 100 : 0}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card admin-money-panel">
            <h2 className="admin-money-panel-title">To settle</h2>
            {pending.length === 0 ? (
              <p className="admin-money-panel-empty">
                <i className="fa-solid fa-check"></i> You're all settled up.
              </p>
            ) : (
              <ul className="admin-money-rows">
                {pending.map((row) => (
                  <li key={row.id}>
                    <Link to="/admin/expense/expenses" className="admin-money-row-name">
                      {row.name}
                    </Link>
                    <span className={row.cents > 0 ? "admin-settle-gets" : "admin-settle-owes"}>
                      {row.cents > 0 ? "You get " : "You owe "}
                      {formatCurrency(Math.abs(row.cents) / 100)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card admin-money-panel">
            <h2 className="admin-money-panel-title">Recent expenses</h2>
            {recent.length === 0 ? (
              <p className="admin-money-panel-empty">No expenses logged yet.</p>
            ) : (
              <ul className="admin-money-rows">
                {recent.map((expense) => (
                  <li key={expense.id}>
                    <span className="admin-money-row-name">
                      {expense.description || expense.category.name}
                      <small>
                        {expense.category.name} · {formatDay(expense.date)}
                      </small>
                    </span>
                    <strong>{formatCurrency(expense.amount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
