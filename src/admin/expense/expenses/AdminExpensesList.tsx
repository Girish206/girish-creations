import { useState } from "react";
import { useExpenses, useDeleteExpense, useUpdateExpense } from "../../../api/hooks/expense/useExpenses";
import type { Expense } from "../../../api/types";
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
import { formatCurrency } from "../currency";
import { avatarColorFor } from "../avatarColor";
import "../../dms/css/adminDisplays.css";
import "../../admin.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Buckets expenses by their trip/event group, in the order each group's
// most recent expense appears (items already come sorted date-desc) — any
// expense without an explicit group automatically falls into "Daily
// Expenses" rather than being shown as a separate, ungrouped case.
function groupExpenses(items: Expense[]) {
  const groups: { key: string; label: string; items: Expense[] }[] = [];
  const indexByKey = new Map<string, number>();
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

export function AdminExpensesList() {
  const { data: items, isLoading } = useExpenses();
  const deleteExpense = useDeleteExpense();
  const updateExpense = useUpdateExpense();

  const [modal, setModal] = useState<ModalState>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const viewItem = viewId !== null ? items?.find((item) => item.id === viewId) : undefined;

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
          <Button variant="outline" onClick={() => setGroupModalOpen(true)}>
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
      ) : !items?.length ? (
        <div className="admin-empty-state">No expenses logged yet.</div>
      ) : (
        groupExpenses(items).map((group) => {
          const total = group.items.reduce((sum, item) => sum + Number(item.amount), 0);
          return (
            <div className="admin-expense-group" key={group.key}>
              <div className="admin-expense-group-header">
                <h4 className="admin-expense-group-title">
                  <i className={group.key === "daily" ? "fa-solid fa-calendar-day" : "fa-solid fa-suitcase-rolling"}></i>
                  {group.label}
                </h4>
                <span className="admin-expense-group-stats">
                  {formatCurrency(total)} · {group.items.length} expense{group.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="admin-txn-list">
                {group.items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <div
                      className={`admin-txn-row ${isSelected ? "selected" : ""}`}
                      key={item.id}
                      onClick={() => setModal({ mode: "edit", id: item.id })}
                    >
                      <input
                        type="checkbox"
                        className="admin-txn-checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="admin-txn-icon" style={{ background: avatarColorFor(item.category.name) }}>
                        {item.category.name.charAt(0).toUpperCase()}
                      </div>

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
                          onEdit={() => setModal({ mode: "edit", id: item.id })}
                          onDelete={() => handleDelete(item.id)}
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

      {groupModalOpen && (
        <DefaultModal
          title="New Expense Group"
          onClose={() => setGroupModalOpen(false)}
          showFooter={false}
          size="md"
          component={<AdminExpenseGroupQuickForm onSaved={() => setGroupModalOpen(false)} />}
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
