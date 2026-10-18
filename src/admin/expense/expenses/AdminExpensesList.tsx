import { useState } from "react";
import { useExpenses, useDeleteExpense, useUpdateExpense } from "../../../api/hooks/expense/useExpenses";
import { useDeleteExpenseGroup, useExpenseGroups } from "../../../api/hooks/expense/useExpenseGroups";
import type { Expense, ExpenseGroup } from "../../../api/types";
import { ListCard } from "../../components/ListCard";
import { Button } from "../../components/Button";
import { RowActions } from "../../components/RowActions";
import { confirmDelete } from "../../components/confirmDelete";
import { DetailView } from "../../components/DetailView";
import DefaultModal from "../../dms/components/DefaultModal";
import CustomButton from "../../dms/components/CustomButton";
import { AdminExpenseForm } from "./AdminExpenseForm";
import { AdminExpenseGroupQuickForm } from "./AdminExpenseGroupQuickForm";
import { AdminExpenseBulkMoveForm } from "./AdminExpenseBulkMoveForm";
import { AdminExpenseGroupSettleUp } from "./AdminExpenseGroupSettleUp";
import { formatCurrency } from "../currency";
import { CategoryIcon } from "../categories/CategoryIcon";
import { resolveCategoryIcon } from "../categories/categoryIcons";
import "../../dms/css/adminDisplays.css";
import "../../admin.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

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

// KPI figures for one group's tile: total spent, everyone involved (payers
// + split participants), and expense count — from the expenses this
// account can see.
function groupStats(expenses: Expense[]) {
  const people = new Set<number>();
  let total = 0;
  for (const expense of expenses) {
    total += Number(expense.amount);
    people.add(expense.paidByAdminUserId);
    for (const participant of expense.splitParticipants) people.add(participant.adminUserId);
  }
  return { total, people: people.size, count: expenses.length };
}

export function AdminExpensesList() {
  const { data: items, isLoading } = useExpenses();
  const deleteExpense = useDeleteExpense();
  const updateExpense = useUpdateExpense();
  const { data: expenseGroups } = useExpenseGroups();
  const deleteExpenseGroup = useDeleteExpenseGroup();

  const [modal, setModal] = useState<ModalState>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  // "new" = create a group; a group = rename that one.
  const [groupModal, setGroupModal] = useState<"new" | ExpenseGroup | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [settleGroupId, setSettleGroupId] = useState<number | null>(null);

  const groupById = new Map((expenseGroups ?? []).map((g) => [g.id, g]));
  const settleGroup = settleGroupId !== null ? groupById.get(settleGroupId) : undefined;
  // Expenses in a closed (settled) group are frozen — view only.
  const isLocked = (item: Expense) =>
    item.expenseGroupId !== null && Boolean(groupById.get(item.expenseGroupId)?.closedAt);

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

  async function handleBulkMove(expenseGroupId: number) {
    await Promise.all(
      Array.from(selectedIds).map((id) => updateExpense.mutateAsync({ id, input: { expenseGroupId } })),
    );
    clearSelection();
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!(await confirmDelete(`${selectedIds.size} selected expense${selectedIds.size === 1 ? "" : "s"}`))) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteExpense.mutateAsync(id)));
      clearSelection();
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <ListCard
      title="Expenses"
      action={
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setGroupModal("new")}>
            <i className="fa-solid fa-suitcase-rolling"></i> New Expense Group
          </Button>
          <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
            + New
          </Button>
        </div>
      }
      className="admin-card-scrollable"
      bodyClassName="admin-card-body-compact admin-card-body-scroll"
    >
      {!!expenseGroups?.length && (
        <div className="admin-group-tiles" aria-label="Expense groups">
          {expenseGroups.map((g) => {
            const stats = groupStats((items ?? []).filter((item) => item.expenseGroupId === g.id));
            const dateRange = formatWindow(g);
            return (
              <button
                type="button"
                key={g.id}
                className={`admin-group-tile ${g.closedAt ? "admin-group-tile-closed" : ""}`}
                onClick={() =>
                  document.getElementById(`expense-group-${g.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                title={`Jump to ${g.name}`}
              >
                <span className="admin-group-tile-head">
                  <span className="admin-group-tile-name">{g.name}</span>
                  {g.closedAt && <i className="fa-solid fa-lock" title="Closed"></i>}
                </span>
                {dateRange && (
                  <span className="admin-group-tile-dates">
                    <i className="fa-solid fa-calendar-days"></i> {dateRange}
                  </span>
                )}
                <span className="admin-group-tile-total">{formatCurrency(stats.total)}</span>
                <span className="admin-group-tile-meta">
                  <span>
                    <i className="fa-solid fa-users"></i> {stats.people} {stats.people === 1 ? "person" : "people"}
                  </span>
                  <span>
                    <i className="fa-solid fa-receipt"></i> {stats.count} expense{stats.count === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="admin-txn-bulk-bar">
          <span className="admin-txn-bulk-bar-count">{selectedIds.size} selected</span>
          <div className="admin-txn-bulk-bar-actions">
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
            <Button variant="link" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="admin-txn-scroll-area">
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length && !expenseGroups?.length ? (
        <div className="admin-empty-state">No expenses logged yet.</div>
      ) : (
        groupExpenses(items ?? [], expenseGroups ?? []).map((group) => {
          const total = group.items.reduce((sum, item) => sum + Number(item.amount), 0);
          const groupRecord = group.key === "daily" ? undefined : groupById.get(Number(group.key));
          const groupClosed = Boolean(groupRecord?.closedAt);
          return (
            <div
              className={`admin-expense-group ${groupClosed ? "admin-expense-group-closed" : ""}`}
              key={group.key}
              id={`expense-group-${group.key}`}
            >
              <div className="admin-expense-group-header">
                <h4 className="admin-expense-group-title">
                  <i className={group.key === "daily" ? "fa-solid fa-calendar-day" : "fa-solid fa-suitcase-rolling"}></i>
                  {group.label}
                  {groupRecord && formatWindow(groupRecord) && (
                    <span className="admin-expense-group-dates">{formatWindow(groupRecord)}</span>
                  )}
                  {groupClosed && (
                    <span className="admin-closed-badge">
                      <i className="fa-solid fa-lock"></i> Closed
                    </span>
                  )}
                </h4>
                <span className="admin-expense-group-stats">
                  {formatCurrency(total)} · {group.items.length} expense{group.items.length === 1 ? "" : "s"}
                  {groupRecord && (
                    <button
                      type="button"
                      className="admin-expense-group-settle-btn"
                      onClick={() => setSettleGroupId(groupRecord.id)}
                    >
                      <i className="fa-solid fa-scale-balanced"></i> {groupClosed ? "Summary" : "Settle up"}
                    </button>
                  )}
                  {groupRecord && (
                    <span className="d-inline-flex align-items-center gap-1">
                      <RowActions
                        onEdit={() => setGroupModal(groupRecord)}
                        onDelete={group.items.length === 0 ? () => handleDeleteGroup(groupRecord) : undefined}
                      />
                      {/* Only an empty group can be deleted (the server enforces this too). */}
                      {group.items.length > 0 && (
                        <span title="Move or delete this group's expenses before deleting it">
                          <CustomButton
                            size="sm"
                            bg="danger"
                            rounded
                            disabled
                            className="m-0 admin-row-action-btn"
                            aria-label="Delete group (disabled — group still has expenses)"
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true"></i>
                          </CustomButton>
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </div>
              {group.items.length === 0 && (
                <p className="admin-expense-group-empty">No expenses in this group yet.</p>
              )}
              <div className="admin-txn-list">
                {group.items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const locked = isLocked(item);
                  return (
                    <div
                      className={`admin-txn-row ${isSelected ? "selected" : ""}`}
                      key={item.id}
                      onClick={() => (locked ? setViewId(item.id) : setModal({ mode: "edit", id: item.id }))}
                    >
                      <input
                        type="checkbox"
                        className="admin-txn-checkbox"
                        disabled={locked}
                        title={locked ? "This group is closed" : undefined}
                        checked={isSelected}
                        onChange={() => toggleSelected(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <CategoryIcon
                        name={item.category.name}
                        {...resolveCategoryIcon(item.category)}
                        className="admin-txn-icon"
                      />

                      <div className="admin-txn-main">
                        <p className="admin-txn-title">{item.category.name}</p>
                        <div className="admin-txn-tags">
                          {item.savingsGoal && (
                            <span
                              className="admin-txn-tag admin-txn-tag-savings"
                              title={`From savings: ${item.savingsGoal.name}`}
                            >
                              <i className="fa-solid fa-piggy-bank"></i>
                              <span className="admin-txn-tag-label">{item.savingsGoal.name}</span>
                            </span>
                          )}
                          {item.splitParticipants.length > 0 && (
                            <span
                              className="admin-txn-tag admin-txn-tag-split"
                              title={`Split ${item.splitParticipants.length} ways`}
                            >
                              <i className="fa-solid fa-users"></i>
                              <span className="admin-txn-tag-label">Split {item.splitParticipants.length} ways</span>
                            </span>
                          )}
                        </div>
                        {item.description && <p className="admin-txn-desc">{item.description}</p>}
                      </div>

                      <div className="admin-txn-right">
                        <span className="admin-txn-amount">− {formatCurrency(item.amount)}</span>
                        <span className="admin-txn-date">{formatDate(item.date)}</span>
                      </div>

                      <div className="admin-txn-actions-col">
                        <RowActions
                          onView={() => setViewId(item.id)}
                          onEdit={locked ? undefined : () => setModal({ mode: "edit", id: item.id })}
                          onDelete={locked ? undefined : () => handleDelete(item.id)}
                        />
                        <span className="admin-txn-creator" title={`Logged by ${item.paidBy.name || item.paidBy.email}`}>
                          <i className="fa-solid fa-user"></i>
                          <span className="admin-txn-creator-name">{item.paidBy.name || item.paidBy.email}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
            <AdminExpenseForm id={modal.mode === "edit" ? modal.id : undefined} onSaved={() => setModal(null)} />
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
            <DetailView
              fields={[
                { label: "Amount", value: formatCurrency(viewItem.amount) },
                { label: "Date", value: formatDate(viewItem.date) },
                { label: "Category", value: viewItem.category.name },
                { label: "Group", value: viewItem.expenseGroup?.name ?? "Daily Expenses (ungrouped)" },
                { label: "Paid By", value: viewItem.paidBy.name || viewItem.paidBy.email },
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
          }
        />
      )}

      {settleGroup && (
        <DefaultModal
          title={`${settleGroup.name} — Settle Up`}
          onClose={() => setSettleGroupId(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminExpenseGroupSettleUp
              group={settleGroup}
              expenses={(items ?? []).filter((item) => item.expenseGroupId === settleGroup.id)}
            />
          }
        />
      )}

      {groupModal && (
        <DefaultModal
          title={groupModal === "new" ? "New Expense Group" : "Rename Expense Group"}
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
