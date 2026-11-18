import { useEffect, useState } from "react";
import {
  useSavingsGoals,
  useDeleteSavingsGoal,
  useDeleteSavingsContribution,
  useSetSavingsGoalClosed,
} from "../../../api/hooks/expense/useSavingsGoals";
import { ListCard } from "../../components/ListCard";
import { confirmAction, confirmDelete } from "../../components/confirmDelete";
import DefaultModal from "../../dms/components/DefaultModal";
import { PillSelect } from "../../../components/PillSelect";
import { AdminSavingsGoalForm } from "./AdminSavingsGoalForm";
import { AdminSavingsContributionForm } from "./AdminSavingsContributionForm";
import { formatCompactCurrency, formatCurrency } from "../currency";
import { formatDay as formatDate, todayLocal } from "../dates";
import type { SavingsGoal } from "../../../api/types";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { HistoryButton } from "../activity/ActivityHistory";
import { GoalDetails } from "./GoalDetails";
import { GoalLedger } from "./GoalLedger";
import "../../dms/css/adminDisplays.css";
import "../../admin.css";
import "../expenses/expensesList.css";
import "./savingsGoals.css";
import { SearchBox } from "../../components/SearchBox";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;
type StatusFilter = "open" | "closed" | "all";
type KindFilter = "all" | "savings" | "fund";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All goals" },
];
const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "savings", label: "Savings" },
  { value: "fund", label: "Shared funds" },
];

const personName = (p: { name: string | null; email: string | null }) => p.name || p.email || "Unknown";

const savedOf = (goal: SavingsGoal) => goal.contributions.reduce((sum, c) => sum + Number(c.amount), 0);

// What the search box looks through.
function searchableText(goal: SavingsGoal) {
  return [
    goal.name,
    goal.bankName,
    goal.accountHolder && personName(goal.accountHolder),
    ...goal.members.map((m) => personName(m.adminUser)),
    ...goal.contributions.map((c) => personName(c.contributedBy)),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function AdminSavingsGoalsList() {
  const { admin } = useAdminAuth();
  const myId = admin?.sub ? Number(admin.sub) : null;
  // The same rules the server enforces: whoever created the goal or holds its
  // account manages it (an older goal with neither stays open to those who see it).
  const managesGoal = (goal: SavingsGoal) =>
    Boolean(admin?.isSuperAdmin) ||
    (!goal.createdBy && goal.accountHolderAdminUserId === null) ||
    goal.createdBy?.id === myId ||
    goal.accountHolderAdminUserId === myId;
  const { data: items, isLoading } = useSavingsGoals();
  const deleteGoal = useDeleteSavingsGoal();
  const deleteContribution = useDeleteSavingsContribution();
  const setGoalClosed = useSetSavingsGoalClosed();
  const [modal, setModal] = useState<ModalState>(null);
  const [contributionGoalId, setContributionGoalId] = useState<number | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [kind, setKind] = useState<KindFilter>("all");
  // Goals start folded and open one at a time: opening one folds the other.
  const [openId, setOpenId] = useState<number | null>(null);
  function toggleSection(id: number) {
    setOpenId((current) => (current === id ? null : id));
  }

  // The ⋯ menu on a goal's header. Fixed-positioned from the button, so the
  // section's clipping can't cut it off; any scroll or outside click closes it.
  const [menu, setMenu] = useState<{ goalId: number; top: number; right: number } | null>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e.type === "mousedown" && (e.target as Element).closest?.(".sgl-menu")) return;
      setMenu(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);
  const menuGoal = menu ? items?.find((goal) => goal.id === menu.goalId) : undefined;

  const viewItem = viewId !== null ? items?.find((goal) => goal.id === viewId) : undefined;

  async function handleDelete(id: number) {
    if (await confirmDelete("savings goal")) {
      deleteGoal.mutate(id);
    }
  }

  async function handleToggleClosed(goal: SavingsGoal) {
    const closing = goal.closedAt === null;
    const confirmed = closing
      ? await confirmAction(
          `Close "${goal.name}"?`,
          "No more contributions can be added and it won't show up as a \"Spent From\" option. You can reopen it later.",
          "Yes, close it",
        )
      : await confirmAction(`Reopen "${goal.name}"?`, "It will accept contributions again.", "Reopen");
    if (confirmed) {
      setGoalClosed.mutate({ id: goal.id, closed: closing });
    }
  }

  async function handleDeleteContribution(goalId: number, contributionId: number) {
    if (await confirmDelete("contribution")) {
      deleteContribution.mutate({ goalId, contributionId });
    }
  }

  const all = items ?? [];
  const openGoals = all.filter((goal) => goal.closedAt === null);
  // Money actually sitting in open goals (put in minus spent from them).
  const heldTotal = openGoals.reduce((sum, goal) => sum + savedOf(goal) - Number(goal.spentAmount), 0);
  const toGoTotal = openGoals.reduce((sum, goal) => {
    if (goal.targetAmount === null) return sum;
    return sum + Math.max(0, Number(goal.targetAmount) - savedOf(goal));
  }, 0);
  const withTargetOpen = openGoals.filter((goal) => goal.targetAmount !== null);
  const reachedCount = withTargetOpen.filter((goal) => savedOf(goal) >= Number(goal.targetAmount)).length;
  const thisMonth = todayLocal().slice(0, 7);
  const monthContributions = all.flatMap((goal) => goal.contributions).filter((c) => c.date.slice(0, 7) === thisMonth);
  const monthIn = monthContributions.reduce((sum, c) => sum + Number(c.amount), 0);

  const query = search.trim().toLowerCase();
  const filtersActive = query !== "" || status !== "open" || kind !== "all";
  const visibleGoals = all.filter(
    (goal) =>
      (status === "all" || (status === "open") === (goal.closedAt === null)) &&
      (kind === "all" || (kind === "fund") === (goal.kind === "fund")) &&
      (!query || searchableText(goal).includes(query)),
  );
  const visibleSaved = visibleGoals.reduce((sum, goal) => sum + savedOf(goal), 0);

  function clearFilters() {
    setSearch("");
    setStatus("open");
    setKind("all");
  }

  return (
    <ListCard
      title="Savings Goals"
      action={
        <div className="exl-head-actions">
          <HistoryButton filter={{ area: "savings" }} title="Savings history" iconClassName="exl-icon-btn" />
          <button
            type="button"
            className="exl-add-btn"
            onClick={() => setModal({ mode: "new" })}
            aria-label="New savings goal"
            title="New savings goal"
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>
      }
      className="admin-card-scrollable exl sgl"
      bodyClassName="admin-card-body-compact admin-card-body-scroll"
    >
      {all.length > 0 && (
        <div className="exl-strip" aria-label="Summary">
          <div className="exl-tile exl-tile-hero">
            <span className="exl-tile-label">
              <i className="fa-solid fa-piggy-bank"></i> Saved now
            </span>
            <span className="exl-tile-value" title={formatCurrency(heldTotal)}>{formatCompactCurrency(heldTotal)}</span>
            <span className="exl-tile-meta">
              {openGoals.length} open goal{openGoals.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="exl-tile">
            <span className="exl-tile-label">
              <i className="fa-solid fa-calendar"></i> This month
            </span>
            <span className="exl-tile-value sgl-pos" title={formatCurrency(monthIn)}>+{formatCompactCurrency(monthIn)}</span>
            <span className="exl-tile-meta">
              {monthContributions.length} contribution{monthContributions.length === 1 ? "" : "s"}
            </span>
          </div>
          {withTargetOpen.length > 0 && (
            <div className="exl-tile">
              <span className="exl-tile-label">
                <i className="fa-solid fa-bullseye"></i> Still to go
              </span>
              <span className="exl-tile-value" title={formatCurrency(toGoTotal)}>{formatCompactCurrency(toGoTotal)}</span>
              <span className="exl-tile-meta">
                {reachedCount} of {withTargetOpen.length} reached
              </span>
            </div>
          )}
        </div>
      )}

      {all.length > 0 && (
        <div className="exl-toolbar" role="search" aria-label="Filter savings goals">
          <SearchBox
            className="exl-search"
            placeholder="Search goals, banks, people…"
            label="Search savings goals"
            value={search}
            onChange={setSearch}
          />
          <PillSelect label="Filter by status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
          <PillSelect label="Filter by type" value={kind} options={KIND_OPTIONS} onChange={setKind} />
          <span className="exl-summary" title={`${visibleGoals.length} goals shown`}>
            <span>
              <strong>{visibleGoals.length}</strong> · <strong>{formatCurrency(visibleSaved)}</strong>
            </span>
            {filtersActive && (
              <button type="button" className="exl-link" onClick={clearFilters}>
                Clear
              </button>
            )}
          </span>
        </div>
      )}

      <div className="admin-txn-scroll-area">
        {isLoading ? (
          <p className="exl-empty">Loading...</p>
        ) : all.length === 0 ? (
          <div className="admin-empty-state">No savings goals yet.</div>
        ) : visibleGoals.length === 0 ? (
          <div className="admin-empty-state">No savings goals match these filters.</div>
        ) : (
          visibleGoals.map((goal) => {
            const saved = savedOf(goal);
            const hasTarget = goal.targetAmount !== null;
            const target = hasTarget ? Number(goal.targetAmount) : 0;
            // Floored, so it can't read 100% until the target is actually met.
            const percent = hasTarget && target > 0 ? Math.min(100, Math.floor((saved / target) * 100)) : 0;
            const isClosed = goal.closedAt !== null;
            const isFund = goal.kind === "fund";
            const manages = managesGoal(goal);
            const reached = hasTarget && saved >= target;
            const spent = Number(goal.spentAmount);
            const balance = saved - spent;
            const overdue =
              !isClosed && hasTarget && !reached && goal.targetDate !== null && goal.targetDate.slice(0, 10) < todayLocal();
            const isCollapsed = openId !== goal.id && !query;
            const count = goal.contributions.length;
            const meta = [
              `${count} contribution${count === 1 ? "" : "s"}`,
              goal.targetDate && `by ${formatDate(goal.targetDate)}`,
              goal.bankName,
              goal.accountHolder && personName(goal.accountHolder),
            ].filter(Boolean);

            return (
              <section
                className={`exl-section ${isClosed ? "exl-section-closed" : ""} ${isCollapsed ? "is-collapsed" : ""}`}
                key={goal.id}
              >
                <header className="exl-section-head" onClick={() => toggleSection(goal.id)}>
                  <span className="exl-section-icon">
                    <i className={`fa-solid ${isFund ? "fa-people-group" : "fa-piggy-bank"}`}></i>
                  </span>
                  <div className="exl-section-title">
                    <button
                      type="button"
                      className="exl-section-name"
                      aria-expanded={!isCollapsed}
                      title={isCollapsed ? "Expand" : "Collapse"}
                    >
                      <span className="exl-section-label">{goal.name}</span>
                      {isClosed && (
                        <i className="fa-solid fa-lock exl-lock" title={`Closed ${formatDate(goal.closedAt!)}`}></i>
                      )}
                    </button>
                  </div>
                  <div className="exl-section-tools" onClick={(e) => e.stopPropagation()}>
                    {!isClosed && (
                      <button
                        type="button"
                        className="exl-chip-btn"
                        onClick={() => setContributionGoalId(goal.id)}
                        title={isFund ? "Add money in" : "Add contribution"}
                        aria-label={isFund ? "Add money in" : "Add contribution"}
                      >
                        <i className="fa-solid fa-plus"></i>
                        <span className="exl-chip-label">Add</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className={`exl-chip-btn sgl-more ${menu?.goalId === goal.id ? "is-open" : ""}`}
                      onClick={(e) => {
                        if (menu?.goalId === goal.id) return setMenu(null);
                        const r = e.currentTarget.getBoundingClientRect();
                        setMenu({ goalId: goal.id, top: r.bottom + 6, right: window.innerWidth - r.right });
                      }}
                      title="More actions"
                      aria-label={`More actions for ${goal.name}`}
                      aria-haspopup="menu"
                      aria-expanded={menu?.goalId === goal.id}
                    >
                      <i className="fa-solid fa-ellipsis"></i>
                    </button>
                  </div>
                  <i className="fa-solid fa-chevron-down exl-chevron" aria-hidden="true"></i>
                  <div className="exl-section-meta" title={meta.join(" · ")}>
                    <b className="exl-section-total" title={formatCurrency(balance)}>{formatCompactCurrency(balance)}</b>
                    {" · "}
                    {meta.join(" · ")}
                  </div>
                </header>

                {!isCollapsed && (
                  <>
                    <div className="sgl-progress">
                      {hasTarget && (
                        <div className="sgl-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                          <div className={`sgl-fill ${reached ? "is-done" : ""}`} style={{ width: `${percent}%` }} />
                        </div>
                      )}
                      <div className="sgl-progress-line">
                        <span>
                          {hasTarget ? (
                            <>
                              <b>{formatCompactCurrency(saved)}</b> of {formatCompactCurrency(target)} · {percent}%
                            </>
                          ) : (
                            <>
                              <b>{formatCompactCurrency(saved)}</b> {isFund ? "collected" : "saved · no target"}
                            </>
                          )}
                          {spent > 0 && <> · spent {formatCompactCurrency(spent)}</>}
                        </span>
                        {reached ? (
                          <span className="sgl-pos">
                            <i className="fa-solid fa-check"></i> Reached
                          </span>
                        ) : overdue ? (
                          <span className="sgl-neg">Past target date</span>
                        ) : balance < 0 ? (
                          <span className="sgl-neg">Over by {formatCompactCurrency(-balance)}</span>
                        ) : hasTarget ? (
                          <span>{formatCompactCurrency(target - saved)} to go</span>
                        ) : null}
                      </div>
                      {goal.members.length > 0 && (
                        <div className="sgl-members" title="Shared with">
                          <i className="fa-solid fa-users"></i>{" "}
                          {goal.members.map((m) => personName(m.adminUser)).join(", ")}
                        </div>
                      )}
                    </div>

                    <GoalLedger
                      goal={goal}
                      myId={myId}
                      mayRemove={(c) => !isClosed && (manages || c.contributedByAdminUserId === myId)}
                      onRemove={(c) => handleDeleteContribution(goal.id, c.id)}
                    />
                  </>
                )}
              </section>
            );
          })
        )}
      </div>

      {menu && menuGoal && (() => {
        const goal = menuGoal;
        const isClosed = goal.closedAt !== null;
        const manages = managesGoal(goal);
        const pick = (action: () => void) => () => {
          setMenu(null);
          action();
        };
        return (
          <div className="exl-add-menu sgl-menu" role="menu" style={{ top: menu.top, right: menu.right }}>
            <button type="button" role="menuitem" onClick={pick(() => setViewId(goal.id))}>
              <i className="fa-solid fa-eye"></i> View details
            </button>
            {manages && (
              <>
                <button type="button" role="menuitem" onClick={pick(() => setModal({ mode: "edit", id: goal.id }))}>
                  <i className="fa-solid fa-pen"></i> Edit
                </button>
                <button type="button" role="menuitem" onClick={pick(() => handleToggleClosed(goal))}>
                  <i className={`fa-solid ${isClosed ? "fa-lock-open" : "fa-lock"}`}></i> {isClosed ? "Reopen" : "Close"}
                </button>
                <button type="button" role="menuitem" className="sgl-menu-danger" onClick={pick(() => handleDelete(goal.id))}>
                  <i className="fa-solid fa-trash"></i> Delete
                </button>
              </>
            )}
          </div>
        );
      })()}

      {viewItem && (
        <DefaultModal
          title={viewItem.kind === "fund" ? "Shared Fund" : "Savings Goal"}
          onClose={() => setViewId(null)}
          showFooter={false}
          size="md"
          component={<GoalDetails goal={viewItem} />}
        />
      )}

      {modal && (
        <DefaultModal
          title={modal.mode === "edit" ? "Edit Savings Goal" : "New Savings Goal"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminSavingsGoalForm id={modal.mode === "edit" ? modal.id : undefined} onSaved={() => setModal(null)} />
          }
        />
      )}

      {contributionGoalId !== null && (
        <DefaultModal
          title="Add Contribution"
          onClose={() => setContributionGoalId(null)}
          showFooter={false}
          size="md"
          component={
            <AdminSavingsContributionForm
              goalId={contributionGoalId}
              canChooseContributor={items?.some((goal) => goal.id === contributionGoalId && managesGoal(goal)) ?? false}
              onSaved={() => setContributionGoalId(null)}
            />
          }
        />
      )}
    </ListCard>
  );
}
