import { useState } from "react";
import { useAdminUsers, useDeactivateAdminUser } from "../../../api/hooks/expense/useAdminUsers";
import { ListCard } from "../../components/ListCard";
import { Button } from "../../components/Button";
import { RowActions } from "../../components/RowActions";
import { confirmDelete } from "../../components/confirmDelete";
import DefaultModal from "../../dms/components/DefaultModal";
import { AdminAccountForm } from "./AdminAccountForm";
import { avatarColorFor } from "../avatarColor";
import "../../dms/css/adminDisplays.css";
import "../../admin.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

export function AdminAccountsList() {
  const { data: items, isLoading } = useAdminUsers();
  const deactivateAccount = useDeactivateAdminUser();
  const [modal, setModal] = useState<ModalState>(null);

  async function handleDeactivate(id: number) {
    if (await confirmDelete("admin account (this deactivates it, sign-in will be blocked)")) {
      deactivateAccount.mutate(id);
    }
  }

  return (
    <ListCard
      title="Admin Accounts"
      action={
        <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
          + New
        </Button>
      }
      bodyClassName="admin-card-body-compact"
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No admin accounts yet.</div>
      ) : (
        <div className="admin-txn-list">
          {items.map((item) => {
            const displayName = item.name || item.email || "Unnamed";
            return (
              <div className="admin-txn-row" key={item.id}>
                <div className="admin-txn-icon" style={{ background: avatarColorFor(displayName) }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>

                <div className="admin-txn-main">
                  <p className="admin-txn-title">{displayName}</p>
                  <div className="admin-txn-tags">
                    {item.isOwner && (
                      <span className="admin-txn-tag admin-txn-tag-owner" title="Owner">
                        <i className="fa-solid fa-crown"></i>
                        <span className="admin-txn-tag-label">Owner</span>
                      </span>
                    )}
                    {!item.hasLogin && (
                      <span className="admin-txn-tag" title="Guest — no login access">
                        <i className="fa-solid fa-user-slash"></i>
                        <span className="admin-txn-tag-label">Guest</span>
                      </span>
                    )}
                    {item.hasPortfolioAccess && (
                      <span className="admin-txn-tag admin-txn-tag-portfolio" title="Portfolio access">
                        <i className="fa-solid fa-briefcase"></i>
                        <span className="admin-txn-tag-label">Portfolio</span>
                      </span>
                    )}
                    {item.hasExpensesAccess && (
                      <span className="admin-txn-tag admin-txn-tag-expenses" title="Expenses access">
                        <i className="fa-solid fa-receipt"></i>
                        <span className="admin-txn-tag-label">Expenses</span>
                      </span>
                    )}
                    {item.hasInvestmentsAccess && (
                      <span className="admin-txn-tag admin-txn-tag-investments" title="Investments access">
                        <i className="fa-solid fa-chart-line"></i>
                        <span className="admin-txn-tag-label">Investments</span>
                      </span>
                    )}
                    {item.hasSavingsAccess && (
                      <span className="admin-txn-tag admin-txn-tag-savings" title="Savings access">
                        <i className="fa-solid fa-piggy-bank"></i>
                        <span className="admin-txn-tag-label">Savings</span>
                      </span>
                    )}
                    {!item.isActive && (
                      <span className="admin-txn-tag admin-txn-tag-danger" title="Deactivated">
                        <i className="fa-solid fa-ban"></i>
                        <span className="admin-txn-tag-label">Deactivated</span>
                      </span>
                    )}
                  </div>
                  {item.name && item.email && <p className="admin-txn-desc">{item.email}</p>}
                </div>

                <div className="admin-txn-actions-col">
                  <RowActions
                    onEdit={() => setModal({ mode: "edit", id: item.id })}
                    onDelete={item.isOwner ? undefined : () => handleDeactivate(item.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <DefaultModal
          title={modal.mode === "edit" ? "Edit Admin Account" : "New Admin Account"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminAccountForm id={modal.mode === "edit" ? modal.id : undefined} onSaved={() => setModal(null)} />
          }
        />
      )}
    </ListCard>
  );
}
