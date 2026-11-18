import { useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useDirectBalances, useExpenses } from "../../../api/hooks/expense/useExpenses";
import { useExpenseGroups } from "../../../api/hooks/expense/useExpenseGroups";
import { useSavingsGoals } from "../../../api/hooks/expense/useSavingsGoals";
import { useExpenseCategories } from "../../../api/hooks/expense/useExpenseCategories";
import type { Expense, ExpenseCategory } from "../../../api/types";
import { formatCurrency } from "../currency";
import { formatDay, todayLocal } from "../dates";
import { avatarColorFor } from "../avatarColor";
import { CategoryIcon } from "../categories/CategoryIcon";
import { initialsOf, resolveCategoryIcon } from "../categories/categoryIcons";
import { suggestTransfers } from "../expenses/groupSettlement";
import { RefreshButton } from "../../components/RefreshButton";
import "../../admin.css";
import "./expenseDashboard.css";

const EXPENSES_PATH = "/admin/expense/expenses";
// How many categories get their own row; the rest fold into "Other".
const TOP_CATEGORIES = 5;
// Pending payment rows shown before "Show more".
const PENDING_ROWS = 4;
// Months shown in the spending trend, ending with this one.
const TREND_MONTHS = 6;

// This person's part of an expense: their split share, or all of it if they
// paid for an unsplit one.
function myShare(expense: Expense, myId: number | null): number {
  if (expense.splitParticipants.length > 0) {
    const mine = expense.splitParticipants.find((p) => p.adminUserId === myId);
    return mine ? Number(mine.shareAmount) : 0;
  }
  return expense.paidByAdminUserId === myId ? Number(expense.amount) : 0;
}

// One person this person pays (cents < 0) or gets paid by (cents > 0).
interface PendingPerson {
  id: number;
  name: string;
  cents: number;
}

// A group or a daily-split pair, with the people behind its total.
interface PendingRow {
  id: string;
  name: string;
  isGroup: boolean;
  cents: number;
  people: PendingPerson[];
}

function payText(cents: number): string {
  return `${cents > 0 ? "You receive" : "You pay"} ${formatCurrency(Math.abs(cents) / 100)}`;
}

interface CategoryRow {
  key: string;
  name: string;
  amount: number;
  category: ExpenseCategory | null; // null = the folded "Other" row
}

// Where this person's own money went: their share of each expense.
function categoryBreakdown(expenses: Expense[], myId: number | null): CategoryRow[] {
  const totals = new Map<number, CategoryRow>();
  for (const expense of expenses) {
    const share = myShare(expense, myId);
    if (share <= 0) continue;
    const row = totals.get(expense.categoryId) ?? {
      key: String(expense.categoryId),
      name: expense.category.name,
      amount: 0,
      category: expense.category,
    };
    row.amount += share;
    totals.set(expense.categoryId, row);
  }
  const sorted = Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
  if (sorted.length <= TOP_CATEGORIES + 1) return sorted;
  const other = sorted.slice(TOP_CATEGORIES).reduce((sum, row) => sum + row.amount, 0);
  return [...sorted.slice(0, TOP_CATEGORIES), { key: "other", name: "Other", amount: other, category: null }];
}

// "YYYY-MM" keys for the last `count` months, oldest first, ending at `endKey`.
function monthKeys(endKey: string, count: number): string[] {
  const [year, month] = endKey.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month - 1 - (count - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function monthName(key: string, style: "short" | "long" = "short"): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: style });
}

// The amount above a month's bar: the full rupee figure, rounded, and only
// a lakh or more is shortened ("₹1.2L") so it still fits on a phone.
const lakhFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});
function barAmount(value: number): string {
  return value >= 100000 ? lakhFormat.format(value) : formatCurrency(Math.round(value));
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Avatar({ name, icon }: { name: string; icon?: string }) {
  return (
    <span className="exd-avatar" style={{ background: avatarColorFor(name) }} aria-hidden="true">
      {icon ? <i className={`fa-solid ${icon}`}></i> : initialsOf(name)}
    </span>
  );
}

function CardHeader({ title, link, linkLabel = "See all" }: { title: string; link?: string; linkLabel?: string }) {
  return (
    <div className="exd-card-head">
      <h2>{title}</h2>
      {link && (
        <Link to={link} className="exd-card-link">
          {linkLabel} <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </Link>
      )}
    </div>
  );
}

function Placeholder({ rows = 3 }: { rows?: number }) {
  return (
    <div className="exd-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
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

  const thisMonthKey = todayLocal().slice(0, 7);
  const trendKeys = monthKeys(thisMonthKey, TREND_MONTHS);
  const [showAllPending, setShowAllPending] = useState(false);

  // "Spending" everywhere on this page is this person's own share, not the
  // whole bill: paying ₹1,457 for four people is ₹364 spent, and the other
  // ₹1,093 is money they're owed (shown in "You receive" until settled).
  const allExpenses = expenses ?? [];
  const totalsByMonth = new Map<string, number>();
  for (const expense of allExpenses) {
    const key = expense.date.slice(0, 7);
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + myShare(expense, myId));
  }
  const trend = trendKeys.map((key) => ({ key, amount: totalsByMonth.get(key) ?? 0 }));
  const trendMax = Math.max(...trend.map((t) => t.amount), 0);
  const trendAvg = trend.reduce((sum, t) => sum + t.amount, 0) / trend.length;

  const thisMonth = allExpenses.filter((e) => e.date.slice(0, 7) === thisMonthKey);
  const monthTotal = totalsByMonth.get(thisMonthKey) ?? 0;
  const lastMonthKey = trendKeys[trendKeys.length - 2];
  const lastMonthTotal = totalsByMonth.get(lastMonthKey) ?? 0;
  // What they actually handed over this month, for the bills they paid.
  const monthPaid = thisMonth
    .filter((e) => e.paidByAdminUserId === myId)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const dayOfMonth = Number(todayLocal().slice(8, 10));
  const perDay = monthTotal / dayOfMonth;
  const change = lastMonthTotal > 0 ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null;
  const totalExpenses = allExpenses.reduce((sum, e) => sum + myShare(e, myId), 0);

  const breakdown = categoryBreakdown(thisMonth, myId);
  const biggestCategory = breakdown[0]?.amount ?? 0;
  const recent = allExpenses.slice(0, 5);

  // What's still pending for this person across groups that are still open,
  // with who exactly they pay or get paid by: the same pairs the group's
  // Settle Up shows (suggestTransfers).
  const groupPending: PendingRow[] = (groups ?? [])
    .filter((group) => !group.closedAt)
    .map((group) => {
      const cents = group.balances.find((balance) => balance.adminUserId === myId)?.pendingCents ?? 0;
      const people = suggestTransfers(group.balances, group.fundHolderId ?? null)
        .filter((t) => t.fromAdminUserId === myId || t.toAdminUserId === myId)
        .map((t) => {
          const iPay = t.fromAdminUserId === myId;
          return {
            id: iPay ? t.toAdminUserId : t.fromAdminUserId,
            name: iPay ? t.toName : t.fromName,
            cents: iPay ? -t.amountCents : t.amountCents,
          };
        });
      return { id: `group-${group.id}`, name: group.name, isGroup: true, cents, people };
    })
    .filter((row) => row.cents !== 0);
  // Plus daily splits, each with one other person. A super admin also gets
  // other people's pairs, which aren't theirs to settle.
  const directPending: PendingRow[] = (directBalances?.transfers ?? [])
    .filter((t) => t.fromAdminUserId === myId || t.toAdminUserId === myId)
    .map((t) => {
      const iPay = t.fromAdminUserId === myId;
      const person = {
        id: iPay ? t.toAdminUserId : t.fromAdminUserId,
        name: iPay ? t.toName : t.fromName,
        cents: iPay ? -t.amountCents : t.amountCents,
      };
      return { id: `direct-${person.id}`, name: person.name, isGroup: false, cents: person.cents, people: [person] };
    });
  const pending = [...groupPending, ...directPending].sort((a, b) => Math.abs(b.cents) - Math.abs(a.cents));
  const visiblePending = showAllPending ? pending : pending.slice(0, PENDING_ROWS);
  const owedToMe = pending.reduce((sum, row) => sum + Math.max(0, row.cents), 0) / 100;
  const iOwe = pending.reduce((sum, row) => sum + Math.max(0, -row.cents), 0) / 100;
  // Counted in people, not groups: one trip can have three people to pay.
  const pendingPeople = pending.flatMap((row) => row.people);
  const owedToMeCount = new Set(pendingPeople.filter((p) => p.cents > 0).map((p) => p.id)).size;
  const iOweCount = new Set(pendingPeople.filter((p) => p.cents < 0).map((p) => p.id)).size;
  const balancesReady = Boolean(groups && directBalances);

  // Money still in open goals: closed ones have been used up or withdrawn.
  const openGoals = (savingsGoals ?? [])
    .filter((goal) => !goal.closedAt)
    .map((goal) => {
      const saved = goal.contributions.reduce((s, c) => s + Number(c.amount), 0) - Number(goal.spentAmount);
      const target = goal.targetAmount ? Number(goal.targetAmount) : null;
      return { id: goal.id, name: goal.name, saved, target, targetDate: goal.targetDate };
    })
    .sort((a, b) => b.saved - a.saved);
  const savingsBalance = openGoals.reduce((sum, goal) => sum + goal.saved, 0);

  const firstName = admin?.name?.trim().split(/\s+/)[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  if (!hasExpenses && !hasSavings) {
    return <div className="admin-empty-state">No sections enabled for your account yet.</div>;
  }

  const actions = [
    hasExpenses && { label: "Add expense", icon: "fa-plus", link: `${EXPENSES_PATH}?new=1`, primary: true },
    hasExpenses && { label: "Expenses", icon: "fa-receipt", link: EXPENSES_PATH },
    hasExpenses && { label: "Categories", icon: "fa-tags", link: "/admin/expense/categories" },
    hasSavings && { label: "Savings", icon: "fa-piggy-bank", link: "/admin/expense/savings" },
  ].filter((a): a is Exclude<typeof a, false> => a !== false);

  const tiles = [
    hasExpenses && {
      key: "get",
      tone: "good",
      label: "You receive",
      icon: "fa-arrow-down",
      value: balancesReady ? formatCurrency(owedToMe) : null,
      sub: owedToMeCount ? `${owedToMeCount} pending` : "Nothing to receive",
      link: EXPENSES_PATH,
    },
    hasExpenses && {
      key: "owe",
      tone: "bad",
      label: "You pay",
      icon: "fa-arrow-up",
      value: balancesReady ? formatCurrency(iOwe) : null,
      sub: iOweCount ? `${iOweCount} pending` : "Nothing to pay",
      link: EXPENSES_PATH,
    },
    hasSavings && {
      key: "savings",
      tone: "brand",
      label: "Savings",
      icon: "fa-piggy-bank",
      value: savingsGoals ? formatCurrency(savingsBalance) : null,
      sub: `${openGoals.length} open ${openGoals.length === 1 ? "goal" : "goals"}`,
      link: "/admin/expense/savings",
    },
    hasExpenses && {
      key: "all",
      tone: "neutral",
      label: "All-time spent",
      icon: "fa-receipt",
      value: expenses ? formatCurrency(Math.round(totalExpenses)) : null,
      sub: `${allExpenses.length} expenses · ${categories?.length ?? 0} categories`,
      link: EXPENSES_PATH,
    },
  ].filter((t): t is Exclude<typeof t, false> => t !== false);

  return (
    <div className="exd">
      {/* ---------- Hero: this month at a glance + quick actions ---------- */}
      <section className="exd-hero">
        <div className="exd-hero-top">
          <p className="exd-hello">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
            <span className="exd-date">{today}</span>
          </p>
          <span className="exd-hero-tools">
            <span className="exd-badge">Pocket</span>
            <RefreshButton tone="on-dark" />
          </span>
        </div>

        {hasExpenses ? (
          <div className="exd-hero-main">
            <span className="exd-hero-label">You spent in {monthName(thisMonthKey, "long")}</span>
            <div className="exd-hero-amount">{expenses ? formatCurrency(Math.round(monthTotal)) : "–"}</div>
            {expenses && (
              <div className="exd-hero-meta">
                {change !== null && (
                  <span className={`exd-chip ${change > 0 ? "is-up" : "is-down"}`}>
                    <i className={`fa-solid ${change > 0 ? "fa-arrow-trend-up" : "fa-arrow-trend-down"}`}></i>
                    {Math.abs(Math.round(change))}% vs {monthName(lastMonthKey)}
                  </span>
                )}
                {monthPaid > 0 && Math.round(monthPaid) !== Math.round(monthTotal) && (
                <span className="exd-chip">
                  <i className="fa-solid fa-wallet"></i> You paid {formatCurrency(Math.round(monthPaid))}
                </span>
                )}
                <span className="exd-chip">
                  <i className="fa-solid fa-calendar-day"></i> {formatCurrency(Math.round(perDay))}/day
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="exd-hero-main">
            <span className="exd-hero-label">Saved across open goals</span>
            <div className="exd-hero-amount">{savingsGoals ? formatCurrency(savingsBalance) : "–"}</div>
          </div>
        )}

        <nav className="exd-actions" aria-label="Quick actions">
          {actions.map((action) => (
            <Link key={action.label} to={action.link} className={`exd-action ${action.primary ? "is-primary" : ""}`}>
              <span className="exd-action-icon">
                <i className={`fa-solid ${action.icon}`} aria-hidden="true"></i>
              </span>
              <span className="exd-action-label">{action.label}</span>
            </Link>
          ))}
        </nav>
      </section>

      {/* ---------- Balance tiles ---------- */}
      <div className="exd-tiles">
        {tiles.map((tile) => (
          <Link key={tile.key} to={tile.link} className={`exd-tile is-${tile.tone}`}>
            <span className="exd-tile-head">
              <span className="exd-tile-icon">
                <i className={`fa-solid ${tile.icon}`} aria-hidden="true"></i>
              </span>
              <span className="exd-tile-label">{tile.label}</span>
            </span>
            <span className="exd-tile-value">{tile.value ?? <span className="exd-skeleton-inline" />}</span>
            <span className="exd-tile-sub">{tile.sub}</span>
          </Link>
        ))}
      </div>

      <div className="exd-layout">
        <div className="exd-col">
          {hasExpenses && (
            <section className="exd-card exd-order-trend">
              <div className="exd-card-head">
                <h2>
                  Monthly spending <small>last {TREND_MONTHS} months</small>
                </h2>
                {expenses && trendAvg > 0 && (
                  <span className="exd-trend-avg-note">Avg {formatCurrency(Math.round(trendAvg))}/month</span>
                )}
              </div>
              {!expenses ? (
                <Placeholder rows={2} />
              ) : (
                <ul className="exd-trend" aria-label="Total spent each month">
                  {trend.map((t) => {
                    const isCurrent = t.key === thisMonthKey;
                    const ratio = trendMax > 0 ? t.amount / trendMax : 0;
                    return (
                      <li
                        key={t.key}
                        className={`exd-trend-col ${isCurrent ? "is-current" : ""}`}
                        aria-current={isCurrent ? "date" : undefined}
                        title={`${monthName(t.key, "long")}: ${formatCurrency(Math.round(t.amount))}`}
                      >
                        <span className="exd-trend-track">
                          <span className="exd-trend-value">{t.amount > 0 ? barAmount(t.amount) : "–"}</span>
                          <span className="exd-trend-bar" style={{ height: `calc((100% - 18px) * ${ratio})` }} />
                        </span>
                        <span className="exd-trend-month">{monthName(t.key)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {hasExpenses && (
            <section className="exd-card exd-order-cats">
              <CardHeader title={`${monthName(thisMonthKey, "long")} by category`} />
              {!expenses ? (
                <Placeholder />
              ) : breakdown.length === 0 ? (
                <p className="exd-empty">
                  <i className="fa-solid fa-seedling"></i> Nothing spent this month yet.
                </p>
              ) : (
                <ul className="exd-cats">
                  {breakdown.map((row) => {
                    const share = monthTotal > 0 ? (row.amount / monthTotal) * 100 : 0;
                    const icon = row.category ? resolveCategoryIcon(row.category) : null;
                    const body = (
                      <>
                        {row.category && icon ? (
                          <CategoryIcon name={row.name} type={icon.type} value={icon.value} />
                        ) : (
                          <span className="exd-avatar is-muted" aria-hidden="true">
                            <i className="fa-solid fa-ellipsis"></i>
                          </span>
                        )}
                        <span className="exd-cat-body">
                          <span className="exd-cat-top">
                            <span className="exd-cat-name">{row.name}</span>
                            <strong>{formatCurrency(row.amount)}</strong>
                          </span>
                          <span className="exd-cat-bottom">
                            <span className="exd-cat-track">
                              <span
                                className="exd-cat-fill"
                                style={{ width: `${biggestCategory > 0 ? (row.amount / biggestCategory) * 100 : 0}%` }}
                              />
                            </span>
                            <span className="exd-cat-pct">{Math.round(share)}%</span>
                          </span>
                        </span>
                      </>
                    );
                    return (
                      <li key={row.key}>
                        {row.category ? (
                          <Link
                            className="exd-cat-row"
                            to={`${EXPENSES_PATH}?month=${thisMonthKey}&category=${row.category.id}`}
                          >
                            {body}
                          </Link>
                        ) : (
                          <div className="exd-cat-row">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {hasExpenses && (
            <section className="exd-card exd-order-recent">
              <CardHeader title="Recent expenses" link={EXPENSES_PATH} />
              {!expenses ? (
                <Placeholder />
              ) : recent.length === 0 ? (
                <p className="exd-empty">
                  <i className="fa-solid fa-receipt"></i> No expenses logged yet.{" "}
                  <Link to={`${EXPENSES_PATH}?new=1`}>Add your first one</Link>
                </p>
              ) : (
                <ul className="exd-list">
                  {recent.map((expense) => {
                    const icon = resolveCategoryIcon(expense.category);
                    const paidByOther = expense.paidByAdminUserId !== myId ? expense.paidBy?.name : null;
                    return (
                      <li key={expense.id} className="exd-row">
                        <CategoryIcon name={expense.category.name} type={icon.type} value={icon.value} />
                        <span className="exd-row-body">
                          <span className="exd-row-title">{expense.description || expense.category.name}</span>
                          <span className="exd-row-sub">
                            {formatDay(expense.date)}
                            {expense.expenseGroup ? ` · ${expense.expenseGroup.name}` : ` · ${expense.category.name}`}
                            {paidByOther ? ` · paid by ${paidByOther}` : ""}
                          </span>
                        </span>
                        <span className="exd-row-amount">
                          {expense.splitParticipants.length > 0 ? (
                            <>
                              {formatCurrency(myShare(expense, myId))}
                              <small>of {formatCurrency(expense.amount)}</small>
                            </>
                          ) : (
                            formatCurrency(expense.amount)
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>

        <div className="exd-col">
          {hasExpenses && (
            <section className="exd-card exd-order-settle">
              <CardHeader title="Pending payments" link={pending.length ? EXPENSES_PATH : undefined} linkLabel="Settle up" />
              {!balancesReady ? (
                <Placeholder rows={2} />
              ) : pending.length === 0 ? (
                <p className="exd-empty is-good">
                  <i className="fa-solid fa-circle-check"></i> No pending payments. You don't owe anyone, and nobody owes you.
                </p>
              ) : (
                <>
                  <ul className="exd-list">
                    {visiblePending.map((row) => {
                      const single = row.people.length === 1 ? row.people[0] : null;
                      const sub = !row.isGroup
                        ? "Daily splits"
                        : single
                          ? `Group · ${single.cents > 0 ? "from" : "to"} ${single.name}`
                          : row.people.length > 1
                            ? `Group · ${row.people.length} people`
                            : "Group";
                      return (
                        <li key={row.id}>
                          <Link to={EXPENSES_PATH} className="exd-row is-link">
                            <Avatar name={row.name} icon={row.isGroup ? "fa-users" : undefined} />
                            <span className="exd-row-body">
                              <span className="exd-row-title">{row.name}</span>
                              <span className="exd-row-sub">{sub}</span>
                            </span>
                            <span className={`exd-pill ${row.cents > 0 ? "is-good" : "is-bad"}`}>{payText(row.cents)}</span>
                          </Link>
                          {row.isGroup && row.people.length > 1 && (
                            <ul className="exd-people">
                              {row.people.map((person) => (
                                <li key={person.id}>
                                  <Avatar name={person.name} />
                                  <span className="exd-people-name">
                                    {person.cents > 0 ? `${person.name} pays you` : `You pay ${person.name}`}
                                  </span>
                                  <strong className={person.cents > 0 ? "is-good" : "is-bad"}>
                                    {formatCurrency(Math.abs(person.cents) / 100)}
                                  </strong>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {pending.length > PENDING_ROWS && (
                    <button type="button" className="exd-more" onClick={() => setShowAllPending((v) => !v)}>
                      {showAllPending ? "Show less" : `Show ${pending.length - PENDING_ROWS} more`}
                      <i className={`fa-solid fa-chevron-${showAllPending ? "up" : "down"}`} aria-hidden="true"></i>
                    </button>
                  )}
                </>
              )}
            </section>
          )}

          {hasSavings && (
            <section className="exd-card exd-order-savings">
              <CardHeader title="Savings goals" link="/admin/expense/savings" />
              {!savingsGoals ? (
                <Placeholder rows={2} />
              ) : openGoals.length === 0 ? (
                <p className="exd-empty">
                  <i className="fa-solid fa-piggy-bank"></i> No open goals.{" "}
                  <Link to="/admin/expense/savings">Start one</Link>
                </p>
              ) : (
                <ul className="exd-goals">
                  {openGoals.slice(0, 3).map((goal) => {
                    const pct = goal.target ? Math.min(100, Math.max(0, (goal.saved / goal.target) * 100)) : null;
                    return (
                      <li key={goal.id}>
                        <Link to="/admin/expense/savings" className="exd-goal">
                          <span className="exd-goal-top">
                            <span className="exd-goal-name">{goal.name}</span>
                            {pct !== null && <span className="exd-goal-pct">{Math.round(pct)}%</span>}
                          </span>
                          {pct !== null && (
                            <span className="exd-goal-track">
                              <span className="exd-goal-fill" style={{ width: `${pct}%` }} />
                            </span>
                          )}
                          <span className="exd-goal-sub">
                            <strong>{formatCurrency(goal.saved)}</strong>
                            {goal.target ? ` of ${formatCurrency(goal.target)}` : " saved"}
                            {goal.targetDate ? ` · by ${formatDay(goal.targetDate)}` : ""}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
