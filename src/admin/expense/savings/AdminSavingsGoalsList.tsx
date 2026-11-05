import { useState } from "react";
import {
  useSavingsGoals,
  useDeleteSavingsGoal,
  useDeleteSavingsContribution,
  useSetSavingsGoalClosed,
} from "../../../api/hooks/expense/useSavingsGoals";
import { ListCard } from "../../components/ListCard";
import { Button } from "../../components/Button";
import { RowActions } from "../../components/RowActions";
import { confirmAction, confirmDelete } from "../../components/confirmDelete";
import { DetailView } from "../../components/DetailView";
import DefaultModal from "../../dms/components/DefaultModal";
import CustomButton from "../../dms/components/CustomButton";
import { AdminSavingsGoalForm } from "./AdminSavingsGoalForm";
import { AdminSavingsContributionForm } from "./AdminSavingsContributionForm";
import { formatCurrency } from "../currency";
import { formatDay as formatDate, todayLocal } from "../dates";
import "../../dms/css/adminDisplays.css";
import type { SavingsGoal } from "../../../api/types";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import "./savingsGoals.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

// Per-person contribution totals, largest first.
function totalsByContributor(goal: SavingsGoal) {
  const totals = new Map<number, { name: string; amount: number }>();
  for (const c of goal.contributions) {
    const entry = totals.get(c.contributedByAdminUserId) ?? {
      name: c.contributedBy.name || c.contributedBy.email || "Unknown",
      amount: 0,
    };
    entry.amount += Number(c.amount);
    totals.set(c.contributedByAdminUserId, entry);
  }
  return Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
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

  return (
    <ListCard
      title="Savings Goals"
      action={
        <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
          + New
        </Button>
      }
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No savings goals yet.</div>
      ) : (
        <div className="admin-card-grid admin-card-grid-wide">
          {items.map((goal) => {
            const saved = goal.contributions.reduce((sum, c) => sum + Number(c.amount), 0);
            const hasTarget = goal.targetAmount !== null;
            const target = hasTarget ? Number(goal.targetAmount) : 0;
            // Floored, so it can't read 100% until the target is actually met.
            const percent = hasTarget && target > 0 ? Math.min(100, Math.floor((saved / target) * 100)) : 0;
            const isClosed = goal.closedAt !== null;
            const manages = managesGoal(goal);
            const reached = hasTarget && saved >= target;
            const spent = Number(goal.spentAmount);
            const balance = saved - spent;
            const overdue =
              !isClosed && hasTarget && !reached && goal.targetDate !== null && goal.targetDate.slice(0, 10) < todayLocal();

            return (
              <div className={`card admin-item-card ${isClosed ? "admin-savings-closed" : ""}`} key={goal.id}>
                <div className="admin-item-card-header">
                  <div className="admin-item-card-heading">
                    <div className="admin-item-card-icon">
                      <i className="fa-solid fa-piggy-bank"></i>
                    </div>
                    <div>
                      <h3 className="admin-item-card-title">
                        {goal.name}
                        {isClosed && (
                          <span className="admin-closed-badge" title={`Closed ${formatDate(goal.closedAt!)}`}>
                            <i className="fa-solid fa-lock"></i> Closed
                          </span>
                        )}
                      </h3>
                      {goal.targetDate && (
                        <p className="admin-item-card-subtitle">
                          Target: {formatDate(goal.targetDate)}
                          {overdue && (
                            <>
                              {" · "}
                              <span className="admin-settle-owes">past target date</span>
                            </>
                          )}
                        </p>
                      )}
                      {(goal.bankName || goal.accountHolder) && (
                        <p className="admin-item-card-subtitle">
                          {[goal.bankName, goal.accountHolder && (goal.accountHolder.name || goal.accountHolder.email)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {goal.members.length > 0 && (
                        <p className="admin-item-card-subtitle">
                          <i className="fa-solid fa-users"></i> Shared with:{" "}
                          {goal.members.map((m) => m.adminUser.name || m.adminUser.email).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {hasTarget ? (
                  <>
                    <div className="admin-proficiency-track">
                      <div className="admin-proficiency-fill" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="admin-savings-progress-label">
                      {formatCurrency(saved)} of {formatCurrency(target)} ({percent}%)
                      {reached && (
                        <span className="admin-settle-gets">
                          {" "}
                          <i className="fa-solid fa-check"></i> Target reached
                        </span>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="admin-savings-progress-label">
                    <i className="fa-solid fa-piggy-bank"></i> {formatCurrency(saved)} saved so far · no target set
                  </p>
                )}

                {spent > 0 && (
                  <p className="admin-savings-progress-label">
                    Spent {formatCurrency(spent)} ·{" "}
                    <span className={balance < 0 ? "admin-settle-owes" : undefined}>
                      {balance < 0 ? `Overspent by ${formatCurrency(-balance)}` : `${formatCurrency(balance)} left`}
                    </span>
                  </p>
                )}

                {goal.contributions.length > 0 && (
                  <ul className="admin-savings-contribution-list">
                    {goal.contributions.map((c) => (
                      <li key={c.id}>
                        <span>
                          {formatCurrency(Number(c.amount))} · {formatDate(c.date)} · {c.contributedBy.name || c.contributedBy.email}
                        </span>
                        {!isClosed && (manages || c.contributedByAdminUserId === myId) && <button
                          type="button"
                          className="admin-savings-contribution-remove"
                          onClick={() => handleDeleteContribution(goal.id, c.id)}
                          aria-label="Remove contribution"
                          title="Remove"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="admin-savings-card-footer">
                  {!isClosed && (
                    <CustomButton
                      size="sm"
                      variant="outline"
                      className="m-0 admin-savings-add-btn"
                      onClick={() => setContributionGoalId(goal.id)}
                    >
                      <i className="fa-solid fa-plus"></i> Add Contribution
                    </CustomButton>
                  )}
                  <div className="admin-savings-card-actions">
                    <RowActions
                      onView={() => setViewId(goal.id)}
                      onEdit={manages ? () => setModal({ mode: "edit", id: goal.id }) : undefined}
                      onDelete={manages ? () => handleDelete(goal.id) : undefined}
                    >
                      {manages && (
                        <CustomButton
                          size="sm"
                          bg={isClosed ? "success" : "secondary"}
                          rounded
                          className="m-0 admin-row-action-btn"
                          onClick={() => handleToggleClosed(goal)}
                          title={isClosed ? "Reopen goal" : "Close goal"}
                          aria-label={isClosed ? "Reopen goal" : "Close goal"}
                        >
                          <i className={`fa-solid ${isClosed ? "fa-lock-open" : "fa-lock"}`} aria-hidden="true"></i>
                        </CustomButton>
                      )}
                    </RowActions>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewItem && (
        <DefaultModal
          title="Savings Goal Details"
          onClose={() => setViewId(null)}
          showFooter={false}
          size="md"
          component={
            <DetailView
              fields={[
                { label: "Name", value: viewItem.name },
                {
                  label: "Target",
                  value: viewItem.targetAmount !== null ? formatCurrency(viewItem.targetAmount) : "Open-ended",
                },
                { label: "Target Date", value: viewItem.targetDate ? formatDate(viewItem.targetDate) : null },
                {
                  label: "Saved So Far",
                  value: formatCurrency(viewItem.contributions.reduce((sum, c) => sum + Number(c.amount), 0)),
                },
                { label: "Spent", value: Number(viewItem.spentAmount) > 0 ? formatCurrency(viewItem.spentAmount) : null },
                {
                  label: "Left",
                  value:
                    Number(viewItem.spentAmount) > 0
                      ? formatCurrency(
                          viewItem.contributions.reduce((sum, c) => sum + Number(c.amount), 0) -
                            Number(viewItem.spentAmount),
                        )
                      : null,
                },
                {
                  label: "By Person",
                  value:
                    viewItem.contributions.length > 0
                      ? totalsByContributor(viewItem)
                          .map((t) => `${t.name}: ${formatCurrency(t.amount)}`)
                          .join("\n")
                      : null,
                },
                { label: "Status", value: viewItem.closedAt ? `Closed on ${formatDate(viewItem.closedAt)}` : "Open" },
                { label: "Bank", value: viewItem.bankName },
                {
                  label: "Account Holder",
                  value: viewItem.accountHolder ? viewItem.accountHolder.name || viewItem.accountHolder.email : null,
                },
                {
                  label: "Shared With",
                  value:
                    viewItem.members.length > 0
                      ? viewItem.members.map((m) => m.adminUser.name || m.adminUser.email).join(", ")
                      : "Only the owner, account holder and contributors",
                },
                {
                  label: "Contributions",
                  value:
                    viewItem.contributions.length > 0
                      ? viewItem.contributions
                          .map(
                            (c) =>
                              `${formatCurrency(c.amount)} · ${formatDate(c.date)} · ${
                                c.contributedBy.name || c.contributedBy.email
                              }`,
                          )
                          .join("\n")
                      : null,
                },
              ]}
            />
          }
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
