import type { SavingsGoal } from "../../../api/types";
import { formatCurrency } from "../currency";
import { formatDay as formatDate, todayLocal } from "../dates";
import { HistorySection } from "../activity/ActivityHistory";
import { FundSplit } from "./FundSplit";
import "./goalDetails.css";

const personName = (p: { name: string | null; email: string | null }) => p.name || p.email || "Unknown";
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

// Per-person contribution totals, largest first.
function totalsByContributor(goal: SavingsGoal) {
  const totals = new Map<number, { id: number; name: string; amount: number; count: number }>();
  for (const c of goal.contributions) {
    const entry = totals.get(c.contributedByAdminUserId) ?? {
      id: c.contributedByAdminUserId,
      name: personName(c.contributedBy),
      amount: 0,
      count: 0,
    };
    entry.amount += Number(c.amount);
    entry.count += 1;
    totals.set(c.contributedByAdminUserId, entry);
  }
  return Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
}

// The "View details" window for a savings goal or shared fund: a summary
// header, the money tiles, who put in what, then the facts and history.
export function GoalDetails({ goal }: { goal: SavingsGoal }) {
  const isFund = goal.kind === "fund";
  const isClosed = goal.closedAt !== null;
  const saved = goal.contributions.reduce((sum, c) => sum + Number(c.amount), 0);
  const spent = Number(goal.spentAmount);
  const left = saved - spent;
  const hasTarget = goal.targetAmount !== null;
  const target = hasTarget ? Number(goal.targetAmount) : 0;
  const percent = hasTarget && target > 0 ? Math.min(100, Math.floor((saved / target) * 100)) : 0;
  const reached = hasTarget && saved >= target;
  const overdue =
    !isClosed && hasTarget && !reached && goal.targetDate !== null && goal.targetDate.slice(0, 10) < todayLocal();
  const people = totalsByContributor(goal);
  const top = people[0]?.amount ?? 0;
  const holderId = goal.accountHolderAdminUserId;

  const facts = [
    { icon: "fa-user-shield", label: isFund ? "Kept by" : "Account holder", value: goal.accountHolder && personName(goal.accountHolder) },
    { icon: "fa-building-columns", label: "Bank", value: goal.bankName },
    { icon: "fa-calendar", label: "Target date", value: goal.targetDate && formatDate(goal.targetDate) },
    { icon: "fa-user-pen", label: "Created by", value: goal.createdBy && personName(goal.createdBy) },
    {
      icon: "fa-users",
      label: "Shared with",
      value:
        goal.members.length > 0
          ? goal.members.map((m) => personName(m.adminUser)).join(", ")
          : "Owner, account holder and contributors",
      wide: true,
    },
  ].filter((f) => f.value);

  return (
    <div className="gdv">
      <div className="gdv-hero">
        <span className="gdv-hero-icon">
          <i className={`fa-solid ${isFund ? "fa-people-group" : "fa-piggy-bank"}`}></i>
        </span>
        <div className="gdv-hero-text">
          <div className="gdv-name">{goal.name}</div>
          <div className="gdv-tags">
            <span className="gdv-tag">{isFund ? "Shared fund" : "Savings"}</span>
            {isClosed ? (
              <span className="gdv-tag is-muted">
                <i className="fa-solid fa-lock"></i> Closed {formatDate(goal.closedAt!)}
              </span>
            ) : (
              <span className="gdv-tag is-pos">Open</span>
            )}
            {reached && (
              <span className="gdv-tag is-pos">
                <i className="fa-solid fa-check"></i> Reached
              </span>
            )}
            {overdue && <span className="gdv-tag is-neg">Past target date</span>}
          </div>
        </div>
        <div className="gdv-balance">
          <span className="gdv-balance-label">{spent > 0 ? "Left" : isFund ? "Collected" : "Saved"}</span>
          <span className={`gdv-balance-value ${left < 0 ? "is-neg" : ""}`}>{formatCurrency(left)}</span>
        </div>
      </div>

      {hasTarget && (
        <div className="gdv-progress">
          <div className="gdv-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className={`gdv-fill ${reached ? "is-done" : ""}`} style={{ width: `${percent}%` }} />
          </div>
          <div className="gdv-progress-line">
            <span>
              {percent}% of {formatCurrency(target)}
            </span>
            <span>{reached ? "Target met" : `${formatCurrency(target - saved)} to go`}</span>
          </div>
        </div>
      )}

      <div className="gdv-tiles">
        <div className="gdv-tile">
          <span>Put in</span>
          <b>{formatCurrency(saved)}</b>
        </div>
        <div className="gdv-tile">
          <span>Spent</span>
          <b>{formatCurrency(spent)}</b>
        </div>
        <div className="gdv-tile">
          <span>Target</span>
          <b>{hasTarget ? formatCurrency(target) : "Open-ended"}</b>
        </div>
      </div>

      {people.length > 0 && (
        <section className="gdv-block">
          <h6 className="gdv-block-title">
            By person <span>{people.length}</span>
          </h6>
          <ul className="gdv-people">
            {people.map((p) => (
              <li key={p.id}>
                <span className="gdv-avatar">{initials(p.name)}</span>
                <div className="gdv-person">
                  <div className="gdv-person-line">
                    <span className="gdv-person-name">
                      {p.name}
                      {p.id === holderId && <i className="fa-solid fa-user-shield" title="Keeps the fund"></i>}
                    </span>
                    <b>{formatCurrency(p.amount)}</b>
                  </div>
                  <div className="gdv-person-bar">
                    <div style={{ width: `${top > 0 ? (p.amount / top) * 100 : 0}%` }} />
                  </div>
                </div>
                <span className="gdv-person-share" title={`${p.count} contribution${p.count === 1 ? "" : "s"}`}>
                  {saved > 0 ? Math.round((p.amount / saved) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {facts.length > 0 && (
        <section className="gdv-block">
          <h6 className="gdv-block-title">Details</h6>
          <dl className="gdv-facts">
            {facts.map((f) => (
              <div key={f.label} className={f.wide ? "is-wide" : ""}>
                <dt>
                  <i className={`fa-solid ${f.icon}`}></i> {f.label}
                </dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <FundSplit goal={goal} />
      <HistorySection filter={{ savingsGoalId: goal.id }} />
    </div>
  );
}
