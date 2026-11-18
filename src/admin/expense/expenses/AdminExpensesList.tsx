import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDirectBalances, useExpenses, useDeleteExpense, useUpdateExpense } from "../../../api/hooks/expense/useExpenses";
import { useDeleteExpenseGroup, useExpenseGroups } from "../../../api/hooks/expense/useExpenseGroups";
import type { Expense, ExpenseGroup } from "../../../api/types";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ListCard } from "../../components/ListCard";
import { RowActions } from "../../components/RowActions";
import { confirmDelete } from "../../components/confirmDelete";
import { DetailView } from "../../components/DetailView";
import DefaultModal from "../../dms/components/DefaultModal";
import CustomButton from "../../dms/components/CustomButton";
import { AdminExpenseForm } from "./AdminExpenseForm";
import { AdminExpenseGroupQuickForm } from "./AdminExpenseGroupQuickForm";
import { AdminExpenseBulkMoveForm } from "./AdminExpenseBulkMoveForm";
import { AdminExpenseGroupDetails } from "./AdminExpenseGroupDetails";
import { AdminDirectSettleUp } from "./AdminDirectSettleUp";
import { PillSelect } from "../../../components/PillSelect";
import { formatCompactCurrency, formatCurrency } from "../currency";
import { formatDay as formatDate, todayLocal } from "../dates";
import { CategoryIcon } from "../categories/CategoryIcon";
import { mayRunGroup } from "./groupSettlement";
import { ExpenseDisputePanel, isDisputed } from "./ExpenseDisputePanel";
import { HistoryButton, HistorySection } from "../activity/ActivityHistory";
import { resolveCategoryIcon } from "../categories/categoryIcons";
import "../../dms/css/adminDisplays.css";
import "../../admin.css";
import "./expenseFilters.css";
import "./expensesList.css";
import { SearchBox } from "../../components/SearchBox";

type ModalState = { mode: "new"; groupId?: number } | { mode: "edit"; id: number } | null;

// Buckets expenses by their trip/event group, in the order each group's
// most recent expense appears (items already come sorted date-desc) — any
// expense without an explicit group automatically falls into "Daily
// Expenses" rather than being shown as a separate, ungrouped case. Groups
// with no expenses yet come first (newest first) so they can still be
// renamed or deleted.
function groupExpenses(items: Expense[], expenseGroups: ExpenseGroup[]) {
  const groups: { key: string; label: string; items: Expense[] }[] = [];
  const indexByKey = new Map<string, number>();
  const usedGroupIds = new Set(items.map((item) => item.expenseGroupId));
  for (const group of expenseGroups) {
    if (!usedGroupIds.has(group.id)) {
      indexByKey.set(String(group.id), groups.length);
      groups.push({ key: String(group.id), label: group.name, items: [] });
    }
  }
  for (const item of items) {
    const key = item.expenseGroupId ? String(item.expenseGroupId) : "daily";
    const label = item.expenseGroup?.name ?? "Daily Expenses";
    let index = indexByKey.get(key);
    if (index === undefined) {
      index = groups.length;
      indexByKey.set(key, index);
      groups.push({ key, label, items: [] });
    }
    groups[index].items.push(item);
  }
  return groups;
}

function formatDay(iso: string) {
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function formatWindow(group: ExpenseGroup): string | null {
  if (group.startDate && group.endDate) return `${formatDay(group.startDate)} – ${formatDay(group.endDate)}`;
  if (group.startDate) return `From ${formatDay(group.startDate)}`;
  if (group.endDate) return `Until ${formatDay(group.endDate)}`;
  return null;
}

// One person sharing it means the payer covered it for them.
function splitLabel(item: Expense) {
  const sharers = item.splitParticipants;
  if (sharers.length !== 1) return `Split ${sharers.length} ways`;
  return `Paid for ${sharers[0].adminUser.name || sharers[0].adminUser.email}`;
}

// What the search box looks through.
function searchableText(item: Expense) {
  return [
    item.description,
    item.category.name,
    item.paidBy.name,
    item.paidBy.email,
    item.savingsGoal?.name,
    item.expenseGroup?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// Consecutive same-day runs (items arrive date-desc), each with its total.
function bucketByDay(items: Expense[]) {
  const days: { key: string; total: number; items: Expense[] }[] = [];
  for (const item of items) {
    const key = item.date.slice(0, 10);
    const last = days[days.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
      last.total += Number(item.amount);
    } else {
      days.push({ key, total: Number(item.amount), items: [item] });
    }
  }
  return days;
}

// "Today", "Yesterday", or "Mon, 12 Nov" (with the year when it isn't this one).
function dayLabel(day: string) {
  const today = todayLocal();
  const yesterday = new Date(today + "T00:00:00");
  yesterday.setDate(yesterday.getDate() - 1);
  const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (day === today) return "Today";
  if (day === y) return "Yesterday";
  return new Date(day + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(day.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" } : {}),
  });
}

export function AdminExpensesList() {
  const { admin } = useAdminAuth();
  const myId = admin?.sub ? Number(admin.sub) : null;
  const { data: items, isLoading } = useExpenses();
  const deleteExpense = useDeleteExpense();
  const updateExpense = useUpdateExpense();
  const { data: expenseGroups } = useExpenseGroups();
  const deleteExpenseGroup = useDeleteExpenseGroup();
  const { data: directBalances } = useDirectBalances();

  // Links from the dashboard: ?new=1 opens the add form, ?month=YYYY-MM and
  // ?category=<id> start with that filter on.
  const [searchParams, setSearchParams] = useSearchParams();
  const [modal, setModal] = useState<ModalState>(() => (searchParams.get("new") ? { mode: "new" } : null));
  const [viewId, setViewId] = useState<number | null>(null);
  // "new" = create a group; a group = rename that one.
  const [groupModal, setGroupModal] = useState<"new" | ExpenseGroup | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [settleGroupId, setSettleGroupId] = useState<number | null>(null);
  const [directSettleOpen, setDirectSettleOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Sections start folded and open one at a time (by group key): opening one
  // folds whichever was open.
  const [openKey, setOpenKey] = useState<string | null>(null);
  function toggleSection(key: string) {
    setOpenKey((current) => (current === key ? null : key));
  }
  // The "+" menu: create an expense or an expense group.
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!addMenuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !addMenuRef.current?.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [addMenuOpen]);
  const [month, setMonth] = useState(() => {
    const value = searchParams.get("month") ?? "";
    return /^\d{4}-\d{2}$/.test(value) ? value : "";
  });
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get("category") ?? "all");

  // Read once, then dropped, so a refresh or Back doesn't reopen the form.
  useEffect(() => {
    if (searchParams.size > 0) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtersActive = search.trim() !== "" || month !== "" || categoryFilter !== "all";
  const query = search.trim().toLowerCase();
  const visibleItems = (items ?? []).filter(
    (item) =>
      (!month || item.date.slice(0, 7) === month) &&
      (categoryFilter === "all" || String(item.categoryId) === categoryFilter) &&
      (!query || searchableText(item).includes(query)),
  );
  const visibleTotal = visibleItems.reduce((sum, item) => sum + Number(item.amount), 0);
  // Categories in use, not the whole list, so a filter can't come up empty.
  const categoryOptions = [
    { value: "all", label: "All categories" },
    ...Array.from(new Map((items ?? []).map((item) => [item.categoryId, item.category.name])))
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ value: String(id), label: name })),
  ];
  // Months that have expenses (newest first), plus the chosen one if a link
  // picked a month with none.
  const monthOptions = [
    { value: "", label: "All months" },
    ...Array.from(new Set([...(items ?? []).map((item) => item.date.slice(0, 7)), ...(month ? [month] : [])]))
      .sort((a, b) => b.localeCompare(a))
      .map((value) => ({
        value,
        label: new Date(value + "-01T00:00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      })),
  ];

  const directTransfers = directBalances?.transfers ?? [];
  const directPendingCents = directTransfers.reduce((sum, transfer) => sum + transfer.amountCents, 0);
  // Worth showing once there's anything to settle, or a repayment to review.
  const hasDirectActivity = directTransfers.length > 0 || Boolean(directBalances?.settlements.length);

  const groupById = new Map((expenseGroups ?? []).map((g) => [g.id, g]));
  const settleGroup = settleGroupId !== null ? groupById.get(settleGroupId) : undefined;
  // Expenses in a closed (settled) group are frozen — view only.
  const isInClosedGroup = (item: Expense) =>
    item.expenseGroupId !== null && Boolean(groupById.get(item.expenseGroupId)?.closedAt);
  // Whoever paid or logged an expense can change it; sharing it only shows it
  // (the server enforces this too).
  const mayChange = (item: Expense) =>
    Boolean(admin?.isSuperAdmin) || item.paidByAdminUserId === myId || item.createdByAdminUserId === myId;

  const viewItem = viewId !== null ? items?.find((item) => item.id === viewId) : undefined;

  async function handleDeleteGroup(group: ExpenseGroup) {
    if (await confirmDelete(`expense group "${group.name}"`)) {
      deleteExpenseGroup.mutate(group.id);
    }
  }

  async function handleDelete(id: number) {
    if (await confirmDelete("expense")) {
      deleteExpense.mutate(id);
    }
  }

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Changing a filter drops the selection, so a bulk action can never touch
  // rows that have just been filtered out of view.
  function changeFilter(apply: () => void) {
    apply();
    clearSelection();
  }

  function clearFilters() {
    changeFilter(() => {
      setSearch("");
      setMonth("");
      setCategoryFilter("all");
    });
  }

  // Whatever failed stays selected to retry (each failure shows its own
  // error); what succeeded drops out, rather than all-or-nothing.
  async function runOnSelected(action: (id: number) => Promise<unknown>) {
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(ids.map(action));
    setSelectedIds(new Set(ids.filter((_, index) => results[index].status === "rejected")));
  }

  async function handleBulkMove(expenseGroupId: number) {
    await runOnSelected((id) => updateExpense.mutateAsync({ id, input: { expenseGroupId } }));
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!(await confirmDelete(`${selectedIds.size} selected expense${selectedIds.size === 1 ? "" : "s"}`))) return;
    setBulkDeleting(true);
    try {
      await runOnSelected((id) => deleteExpense.mutateAsync(id));
    } finally {
      setBulkDeleting(false);
    }
  }

  const thisMonth = todayLocal().slice(0, 7);
  const monthItems = (items ?? []).filter((item) => item.date.slice(0, 7) === thisMonth);
  const monthTotal = monthItems.reduce((sum, item) => sum + Number(item.amount), 0);
  const payerName = (item: Expense) =>
    item.paidByAdminUserId === myId ? "You" : item.paidBy.name || item.paidBy.email;

  return (
    <ListCard
      title="Expenses"
      action={
        <div className="exl-head-actions">
          <HistoryButton filter={{ area: "expenses" }} title="Expenses history" iconClassName="exl-icon-btn" />
          <div className="exl-add" ref={addMenuRef}>
            <button
              type="button"
              className={`exl-add-btn ${addMenuOpen ? "is-open" : ""}`}
              onClick={() => setAddMenuOpen((open) => !open)}
              aria-label="Create"
              aria-haspopup="menu"
              aria-expanded={addMenuOpen}
              title="Create"
            >
              <i className="fa-solid fa-plus"></i>
            </button>
            {addMenuOpen && (
              <div className="exl-add-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setModal({ mode: "new" });
                  }}
                >
                  <i className="fa-solid fa-receipt"></i> Create expense
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setGroupModal("new");
                  }}
                >
                  <i className="fa-solid fa-suitcase-rolling"></i> Create expense group
                </button>
              </div>
            )}
          </div>
        </div>
      }
      className="admin-card-scrollable exl"
      bodyClassName="admin-card-body-compact admin-card-body-scroll"
    >
      {!!(items?.length || expenseGroups?.length) && (
        <div className="exl-strip" aria-label="Summary">
          <button
            type="button"
            className="exl-tile exl-tile-hero"
            onClick={() => changeFilter(() => setMonth(month === thisMonth ? "" : thisMonth))}
            title={month === thisMonth ? "Show all months" : "Show only this month"}
          >
            <span className="exl-tile-label">
              <i className="fa-solid fa-calendar"></i> This month
            </span>
            <span className="exl-tile-value" title={formatCurrency(monthTotal)}>{formatCompactCurrency(monthTotal)}</span>
            <span className="exl-tile-meta">
              {monthItems.length} expense{monthItems.length === 1 ? "" : "s"}
            </span>
          </button>
          {hasDirectActivity && (
            <button
              type="button"
              className="exl-tile"
              onClick={() => setDirectSettleOpen(true)}
              title="Settle splits on Daily Expenses"
            >
              <span className="exl-tile-label">
                <i className="fa-solid fa-scale-balanced"></i> Daily splits
              </span>
              <span className="exl-tile-value">
                {directPendingCents > 0 ? formatCompactCurrency(directPendingCents / 100) : "Settled"}
              </span>
              <span className="exl-tile-meta">
                {directTransfers.length > 0 ? `${directTransfers.length} to settle` : "Nothing pending"}
              </span>
            </button>
          )}
          {(expenseGroups ?? []).map((g) => {
            const people = g.members.length || g.balances.length;
            return (
              <button
                type="button"
                key={g.id}
                className={`exl-tile ${g.closedAt ? "exl-tile-closed" : ""}`}
                onClick={() => setSettleGroupId(g.id)}
                title={`Open ${g.name}`}
              >
                <span className="exl-tile-label">
                  <i className={g.closedAt ? "fa-solid fa-lock" : "fa-solid fa-suitcase-rolling"}></i> {g.name}
                </span>
                <span className="exl-tile-value" title={formatCurrency(g.totalCents / 100)}>{formatCompactCurrency(g.totalCents / 100)}</span>
                <span className="exl-tile-meta">
                  {people} {people === 1 ? "person" : "people"} · {g.expenseCount} expense
                  {g.expenseCount === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!!items?.length && (
        <div className="exl-toolbar" role="search" aria-label="Filter expenses">
          <SearchBox
            className="exl-search"
            placeholder="Search expenses…"
            value={search}
            onChange={(value) => changeFilter(() => setSearch(value))}
          />
          <PillSelect
            label="Filter by month"
            value={month}
            options={monthOptions}
            onChange={(value) => changeFilter(() => setMonth(value))}
          />
          <PillSelect
            label="Filter by category"
            value={categoryFilter}
            options={categoryOptions}
            onChange={(value) => changeFilter(() => setCategoryFilter(value))}
          />
          <span className="exl-summary" title={`${visibleItems.length} expenses shown`}>
            <span>
              <strong>{visibleItems.length}</strong> · <strong>{formatCurrency(visibleTotal)}</strong>
            </span>
            {filtersActive && (
              <button type="button" className="exl-link" onClick={clearFilters}>
                Clear
              </button>
            )}
          </span>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="exl-bulk">
          <span>{selectedIds.size} selected</span>
          <div className="exl-bulk-actions">
            <CustomButton
              size="sm"
              bg="primary"
              rounded
              className="m-0 admin-row-action-btn"
              onClick={() => setMoveModalOpen(true)}
              title="Move to group"
              aria-label="Move to group"
            >
              <i className="fa-solid fa-suitcase-rolling" aria-hidden="true"></i>
            </CustomButton>
            <CustomButton
              size="sm"
              bg="danger"
              rounded
              className="m-0 admin-row-action-btn"
              onClick={handleBulkDelete}
              loading={bulkDeleting}
              title="Delete selected"
              aria-label="Delete selected"
            >
              <i className="fa-solid fa-trash" aria-hidden="true"></i>
            </CustomButton>
            <button type="button" className="exl-link" onClick={clearSelection}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className={`admin-txn-scroll-area ${selectedIds.size > 0 ? "exl-selecting" : ""}`}>
      {isLoading ? (
        <p className="exl-empty">Loading...</p>
      ) : !items?.length && !expenseGroups?.length ? (
        <div className="admin-empty-state">No expenses logged yet.</div>
      ) : filtersActive && visibleItems.length === 0 ? (
        <div className="admin-empty-state">No expenses match these filters.</div>
      ) : (
        groupExpenses(visibleItems, filtersActive ? [] : (expenseGroups ?? [])).map((group) => {
          const shownTotal = group.items.reduce((sum, item) => sum + Number(item.amount), 0);
          const groupRecord = group.key === "daily" ? undefined : groupById.get(Number(group.key));
          const groupClosed = Boolean(groupRecord?.closedAt);
          // Filtered: what's on screen. Otherwise a group's real total, which
          // can include expenses private to other people in it.
          const useGroupTotals = groupRecord !== undefined && !filtersActive;
          const total = useGroupTotals ? groupRecord.totalCents / 100 : shownTotal;
          const count = useGroupTotals ? groupRecord.expenseCount : group.items.length;
          const hiddenCount = count - group.items.length;
          const dateWindow = groupRecord ? formatWindow(groupRecord) : null;
          // A search shows every match, folded or not.
          const isCollapsed = openKey !== group.key && !query;
          return (
            <section
              className={`exl-section ${groupClosed ? "exl-section-closed" : ""} ${isCollapsed ? "is-collapsed" : ""}`}
              key={group.key}
              id={`expense-group-${group.key}`}
            >
              <header className="exl-section-head" onClick={() => toggleSection(group.key)}>
                <span className="exl-section-icon">
                  <i className={group.key === "daily" ? "fa-solid fa-calendar-day" : "fa-solid fa-suitcase-rolling"}></i>
                </span>
                <div className="exl-section-title">
                  <button
                    type="button"
                    className="exl-section-name"
                    aria-expanded={!isCollapsed}
                    title={isCollapsed ? "Expand" : "Collapse"}
                  >
                    <span className="exl-section-label">{group.label}</span>
                    {groupClosed && <i className="fa-solid fa-lock exl-lock" title="Closed"></i>}
                  </button>
                </div>
                <div className="exl-section-tools" onClick={(e) => e.stopPropagation()}>
                  {group.key === "daily" && hasDirectActivity && (
                    <button
                      type="button"
                      className="exl-chip-btn"
                      onClick={() => setDirectSettleOpen(true)}
                      title="Settle up"
                    >
                      <i className="fa-solid fa-scale-balanced"></i>
                      <span className="exl-chip-label">Settle</span>
                    </button>
                  )}
                  {groupRecord && !groupClosed && (
                    <button
                      type="button"
                      className="exl-chip-btn"
                      onClick={() => setModal({ mode: "new", groupId: groupRecord.id })}
                      title={`Add an expense to ${groupRecord.name}`}
                      aria-label={`Add an expense to ${groupRecord.name}`}
                    >
                      <i className="fa-solid fa-plus"></i>
                    </button>
                  )}
                  {groupRecord && (
                    <button
                      type="button"
                      className="exl-chip-btn"
                      onClick={() => setSettleGroupId(groupRecord.id)}
                      title={groupClosed ? "Summary" : "Settle up"}
                    >
                      <i className="fa-solid fa-scale-balanced"></i>
                      <span className="exl-chip-label">{groupClosed ? "Summary" : "Settle"}</span>
                    </button>
                  )}
                  {groupRecord && mayRunGroup(admin, groupRecord) && (
                    <RowActions
                      onEdit={() => setGroupModal(groupRecord)}
                      // Only an empty group can be deleted (the server enforces this too).
                      onDelete={groupRecord.expenseCount === 0 ? () => handleDeleteGroup(groupRecord) : undefined}
                    />
                  )}
                </div>
                <i className="fa-solid fa-chevron-down exl-chevron" aria-hidden="true"></i>
                <div className="exl-section-meta">
                  <b className="exl-section-total" title={formatCurrency(total)}>{formatCompactCurrency(total)}</b>
                  {" · "}
                  {count} expense{count === 1 ? "" : "s"}
                  {hiddenCount > 0 && ` (${group.items.length} shown)`}
                  {dateWindow && ` · ${dateWindow}`}
                  {groupClosed && " · Closed"}
                </div>
              </header>
              {!isCollapsed && (
              <>
              {group.items.length === 0 && (
                <p className="exl-empty">
                  {hiddenCount > 0
                    ? "Its expenses are private to the people involved in them."
                    : "No expenses in this group yet."}
                </p>
              )}
              {bucketByDay(group.items).map((day) => (
                <div key={day.key}>
                  <div className="exl-day">
                    <span>{dayLabel(day.key)}</span>
                    <span>{formatCurrency(day.total)}</span>
                  </div>
                  {day.items.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const closed = isInClosedGroup(item);
                    const locked = closed || !mayChange(item);
                    return (
                      <div
                        className={`exl-row ${isSelected ? "selected" : ""}`}
                        key={item.id}
                        onClick={() => (locked ? setViewId(item.id) : setModal({ mode: "edit", id: item.id }))}
                      >
                        <input
                          type="checkbox"
                          className="exl-check"
                          disabled={locked}
                          aria-label={`Select ${item.category.name} expense`}
                          title={
                            closed
                              ? "This group is closed"
                              : locked
                                ? "Only the person who paid or logged this can change it"
                                : undefined
                          }
                          checked={isSelected}
                          onChange={() => toggleSelected(item.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <CategoryIcon
                          name={item.category.name}
                          {...resolveCategoryIcon(item.category)}
                          className="admin-txn-icon"
                        />
                        <div className="exl-row-main">
                          <p className="exl-row-title">
                            <span title={item.description || item.category.name}>
                              {item.description || item.category.name}
                            </span>
                            {item.savingsGoal && (
                              <span className="admin-txn-tag admin-txn-tag-savings" title={`From savings: ${item.savingsGoal.name}`}>
                                <i className="fa-solid fa-piggy-bank"></i>
                                <span className="admin-txn-tag-label">{item.savingsGoal.name}</span>
                              </span>
                            )}
                            {item.splitParticipants.length > 0 && (
                              <span className="admin-txn-tag admin-txn-tag-split" title={splitLabel(item)}>
                                <i className="fa-solid fa-users"></i>
                                <span className="admin-txn-tag-label">{splitLabel(item)}</span>
                              </span>
                            )}
                            {isDisputed(item) && (
                              <span
                                className="admin-txn-tag admin-txn-tag-disputed"
                                title="Someone says their share isn't right"
                              >
                                <i className="fa-solid fa-flag"></i>
                                <span className="admin-txn-tag-label">Disputed</span>
                              </span>
                            )}
                          </p>
                          <p className="exl-row-sub">
                            {item.description ? `${item.category.name} · ` : ""}
                            <b>{payerName(item)}</b> paid
                          </p>
                        </div>
                        <span className="exl-row-amount">−{formatCurrency(item.amount)}</span>
                        <div className="exl-row-actions">
                          <RowActions
                            onView={() => setViewId(item.id)}
                            onEdit={locked ? undefined : () => setModal({ mode: "edit", id: item.id })}
                            onDelete={locked ? undefined : () => handleDelete(item.id)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              </>
              )}
            </section>
          );
        })
      )}
      </div>

      {modal && (
        <DefaultModal
          title={modal.mode === "edit" ? "Edit Expense" : "New Expense"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminExpenseForm
              id={modal.mode === "edit" ? modal.id : undefined}
              groupId={modal.mode === "new" ? modal.groupId : undefined}
              onSaved={() => setModal(null)}
            />
          }
        />
      )}

      {viewItem && (
        <DefaultModal
          title="Expense Details"
          onClose={() => setViewId(null)}
          showFooter={false}
          size="md"
          component={
            <>
            <DetailView
              fields={[
                { label: "Amount", value: formatCurrency(viewItem.amount) },
                { label: "Date", value: formatDate(viewItem.date) },
                { label: "Category", value: viewItem.category.name },
                { label: "Group", value: viewItem.expenseGroup?.name ?? "Daily Expenses (ungrouped)" },
                { label: "Paid By", value: viewItem.paidBy.name || viewItem.paidBy.email },
                {
                  label: "Logged By",
                  value:
                    viewItem.createdBy && viewItem.createdBy.id !== viewItem.paidByAdminUserId
                      ? viewItem.createdBy.name || viewItem.createdBy.email
                      : null,
                },
                { label: "Spent From Savings", value: viewItem.savingsGoal?.name ?? null },
                {
                  label: "Split Between",
                  value:
                    viewItem.splitParticipants.length > 0
                      ? viewItem.splitParticipants
                          .map((p) => `${p.adminUser.name || p.adminUser.email}: ${formatCurrency(p.shareAmount)}`)
                          .join("\n")
                      : null,
                },
                { label: "Description", value: viewItem.description },
              ]}
            />
            <ExpenseDisputePanel expense={viewItem} />
            <HistorySection filter={{ expenseId: viewItem.id }} />
            </>
          }
        />
      )}

      {settleGroup && (
        <DefaultModal
          title={settleGroup.name}
          onClose={() => setSettleGroupId(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminExpenseGroupDetails
              group={settleGroup}
              onAddExpense={() => {
                setSettleGroupId(null);
                setModal({ mode: "new", groupId: settleGroup.id });
              }}
            />
          }
        />
      )}

      {directSettleOpen && (
        <DefaultModal
          title="Daily Splits — Settle Up"
          onClose={() => setDirectSettleOpen(false)}
          showFooter={false}
          size="lg"
          component={<AdminDirectSettleUp />}
        />
      )}

      {groupModal && (
        <DefaultModal
          title={groupModal === "new" ? "New Expense Group" : "Edit Expense Group"}
          onClose={() => setGroupModal(null)}
          showFooter={false}
          size="md"
          component={
            <AdminExpenseGroupQuickForm
              group={groupModal === "new" ? undefined : groupModal}
              onSaved={() => setGroupModal(null)}
            />
          }
        />
      )}

      {moveModalOpen && (
        <DefaultModal
          title="Move to Expense Group"
          onClose={() => setMoveModalOpen(false)}
          showFooter={false}
          size="md"
          component={
            <AdminExpenseBulkMoveForm
              count={selectedIds.size}
              onMove={handleBulkMove}
              onDone={() => setMoveModalOpen(false)}
            />
          }
        />
      )}
    </ListCard>
  );
}
