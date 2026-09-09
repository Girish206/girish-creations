import { useState } from "react";
import {
  useSavingsGoals,
  useDeleteSavingsGoal,
  useDeleteSavingsContribution,
} from "../../../api/hooks/expense/useSavingsGoals";
import { ListCard } from "../../components/ListCard";
import { Button } from "../../components/Button";
import { RowActions } from "../../components/RowActions";
import { confirmDelete } from "../../components/confirmDelete";
import { DetailView } from "../../components/DetailView";
import DefaultModal from "../../dms/components/DefaultModal";
import CustomButton from "../../dms/components/CustomButton";
import { AdminSavingsGoalForm } from "./AdminSavingsGoalForm";
import { AdminSavingsContributionForm } from "./AdminSavingsContributionForm";
import { formatCurrency } from "../currency";
import "../../dms/css/adminDisplays.css";
import "./savingsGoals.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AdminSavingsGoalsList() {
  const { data: items, isLoading } = useSavingsGoals();
  const deleteGoal = useDeleteSavingsGoal();
  const deleteContribution = useDeleteSavingsContribution();
  const [modal, setModal] = useState<ModalState>(null);
  const [contributionGoalId, setContributionGoalId] = useState<number | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  const viewItem = viewId !== null ? items?.find((goal) => goal.id === viewId) : undefined;

  async function handleDelete(id: number) {
    if (await confirmDelete("savings goal")) {
      deleteGoal.mutate(id);
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
            const percent = hasTarget && target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

            return (
              <div className="card admin-item-card" key={goal.id}>
                <div className="admin-item-card-header">
                  <div className="admin-item-card-heading">
                    <div className="admin-item-card-icon">
                      <i className="fa-solid fa-piggy-bank"></i>
                    </div>
                    <div>
                      <h3 className="admin-item-card-title">{goal.name}</h3>
                      {goal.targetDate && (
                        <p className="admin-item-card-subtitle">Target: {formatDate(goal.targetDate)}</p>
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
                          <i className="fa-solid fa-lock"></i> Restricted to:{" "}
                          {goal.members.map((m) => m.adminUser.name || m.adminUser.email).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="admin-item-card-actions">
                    <RowActions
                      onView={() => setViewId(goal.id)}
                      onEdit={() => setModal({ mode: "edit", id: goal.id })}
                      onDelete={() => handleDelete(goal.id)}
                    />
                  </div>
                </div>

                {hasTarget ? (
                  <>
                    <div className="admin-proficiency-track">
                      <div className="admin-proficiency-fill" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="admin-savings-progress-label">
                      {formatCurrency(saved)} of {formatCurrency(target)} ({percent}%)
                    </p>
                  </>
                ) : (
                  <p className="admin-savings-progress-label">
                    <i className="fa-solid fa-infinity"></i> {formatCurrency(saved)} saved so far (open-ended)
                  </p>
                )}

                {goal.contributions.length > 0 && (
                  <ul className="admin-savings-contribution-list">
                    {goal.contributions.map((c) => (
                      <li key={c.id}>
                        <span>
                          {formatCurrency(Number(c.amount))} · {formatDate(c.date)} · {c.contributedBy.name || c.contributedBy.email}
                        </span>
                        <button
                          type="button"
                          className="admin-savings-contribution-remove"
                          onClick={() => handleDeleteContribution(goal.id, c.id)}
                          aria-label="Remove contribution"
                          title="Remove"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <CustomButton
                  size="sm"
                  variant="outline"
                  className="m-0"
                  onClick={() => setContributionGoalId(goal.id)}
                >
                  <i className="fa-solid fa-plus"></i> Add Contribution
                </CustomButton>
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
                { label: "Bank", value: viewItem.bankName },
                {
                  label: "Account Holder",
                  value: viewItem.accountHolder ? viewItem.accountHolder.name || viewItem.accountHolder.email : null,
                },
                {
                  label: "Restricted To",
                  value:
                    viewItem.members.length > 0
                      ? viewItem.members.map((m) => m.adminUser.name || m.adminUser.email).join(", ")
                      : "Everyone with Savings access",
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
            <AdminSavingsContributionForm goalId={contributionGoalId} onSaved={() => setContributionGoalId(null)} />
          }
        />
      )}
    </ListCard>
  );
}
