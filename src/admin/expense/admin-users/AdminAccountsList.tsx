import { useState } from "react";
import Swal from "sweetalert2";
import {
  useAdminUsers,
  useDeactivateAdminUser,
  useDeleteAdminUserPermanently,
  useUpdateAdminUser,
} from "../../../api/hooks/expense/useAdminUsers";
import type { AdminUserAccount } from "../../../api/types";
import { ListCard } from "../../components/ListCard";
import { Button } from "../../components/Button";
import { RowActions } from "../../components/RowActions";
import CustomButton from "../../dms/components/CustomButton";
import DefaultModal from "../../dms/components/DefaultModal";
import { AdminAccountForm } from "./AdminAccountForm";
import { avatarColorFor } from "../avatarColor";
import "../../dms/css/adminDisplays.css";
import "../../admin.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number; grantLogin?: boolean } | null;

type Filter = "all" | "active" | "inactive" | "login" | "guest";

const FILTERS: { key: Filter; label: string; matches: (item: AdminUserAccount) => boolean }[] = [
  { key: "all", label: "All", matches: () => true },
  { key: "active", label: "Active", matches: (item) => item.isActive },
  { key: "inactive", label: "Deactivated", matches: (item) => !item.isActive },
  { key: "login", label: "Can sign in", matches: (item) => item.hasLogin },
  { key: "guest", label: "Guests", matches: (item) => !item.hasLogin },
];

const STATS: { label: string; icon: string; tone: string; matches: (item: AdminUserAccount) => boolean }[] = [
  { label: "Total", icon: "fa-users", tone: "total", matches: () => true },
  { label: "Active", icon: "fa-circle-check", tone: "active", matches: (item) => item.isActive },
  { label: "Can sign in", icon: "fa-key", tone: "login", matches: (item) => item.hasLogin },
  { label: "Guests", icon: "fa-user-slash", tone: "guest", matches: (item) => !item.hasLogin },
];

function themedDialog() {
  return document.documentElement.getAttribute("data-bs-theme") === "dark" ? "dark" : "light";
}

export function AdminAccountsList() {
  const { data: items, isLoading } = useAdminUsers();
  const deactivateAccount = useDeactivateAdminUser();
  const deleteAccount = useDeleteAdminUserPermanently();
  const updateAccount = useUpdateAdminUser();
  const [modal, setModal] = useState<ModalState>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  async function handleToggleActive(item: AdminUserAccount) {
    if (item.isActive) {
      const result = await Swal.fire({
        title: `Deactivate ${item.name || item.email || "this account"}?`,
        text: "They won't be able to sign in or be picked for new splits. Their records stay, and you can reactivate them any time.",
        icon: "question",
        theme: themedDialog(),
        showCancelButton: true,
        confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
        confirmButtonText: "Deactivate",
      });
      if (result.isConfirmed) deactivateAccount.mutate(item.id);
      return;
    }
    updateAccount.mutate({ id: item.id, input: { isActive: true } });
  }

  async function handleDeletePermanently(item: AdminUserAccount) {
    const result = await Swal.fire({
      title: `Delete ${item.name || item.email || "this account"} permanently?`,
      text: "They have no expenses or savings records, so the account can be removed completely. This can't be undone.",
      icon: "warning",
      theme: themedDialog(),
      showCancelButton: true,
      confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
      confirmButtonText: "Delete permanently",
    });
    if (result.isConfirmed) deleteAccount.mutate(item.id);
  }

  const needle = query.trim().toLowerCase();
  const searched = (items ?? []).filter(
    (item) => !needle || `${item.name ?? ""} ${item.email ?? ""}`.toLowerCase().includes(needle),
  );
  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const shown = searched.filter(activeFilter.matches);

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
        <>
          <div className="admin-user-stats">
            {STATS.map((stat) => (
              <div className={`admin-user-stat admin-user-stat-${stat.tone}`} key={stat.label}>
                <span className="admin-user-stat-icon">
                  <i className={`fa-solid ${stat.icon}`} aria-hidden="true"></i>
                </span>
                <span>
                  <strong>{items.filter(stat.matches).length}</strong>
                  <small>{stat.label}</small>
                </span>
              </div>
            ))}
          </div>

          <div className="admin-accounts-toolbar">
            <div className="admin-filter-chips" role="group" aria-label="Filter accounts">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={filter === f.key ? "active" : ""}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  <span className="admin-filter-count">{searched.filter(f.matches).length}</span>
                </button>
              ))}
            </div>
            <label className="admin-accounts-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
              <span className="visually-hidden">Search accounts</span>
              <input
                type="search"
                className="form-control"
                placeholder="Search name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>

          {shown.length === 0 ? (
            <div className="admin-empty-state">No accounts match this filter.</div>
          ) : (
            <div className="admin-user-grid">
              {shown.map((item) => {
                const displayName = item.name || item.email || "Unnamed";
                const access = [
                  { on: item.hasPortfolioAccess, icon: "fa-briefcase", label: "Portfolio", tone: "portfolio" },
                  { on: item.hasExpensesAccess, icon: "fa-receipt", label: "Expenses", tone: "expenses" },
                  { on: item.hasSavingsAccess, icon: "fa-piggy-bank", label: "Savings", tone: "savings" },
                ];
                return (
                  <article
                    className={`admin-user-card${item.isActive ? "" : " admin-user-card-inactive"}`}
                    key={item.id}
                  >
                    <header className="admin-user-card-head">
                      <div className="admin-user-avatar" style={{ background: avatarColorFor(displayName) }}>
                        {displayName.charAt(0).toUpperCase()}
                        <span
                          className={`admin-user-status-dot${item.isActive ? " is-active" : ""}`}
                          title={item.isActive ? "Active" : "Deactivated"}
                        ></span>
                      </div>
                      <div className="admin-user-identity">
                        <p className="admin-user-name">
                          <span>{displayName}</span>
                          {item.isOwner && (
                            <span className="admin-user-owner" title="Owner">
                              <i className="fa-solid fa-crown" aria-hidden="true"></i> Owner
                            </span>
                          )}
                        </p>
                        {item.name && item.email && (
                          <p className="admin-user-email" title={item.email}>
                            {item.email}
                          </p>
                        )}
                      </div>
                    </header>

                    <div className="admin-user-meta">
                      <span className={`admin-user-badge ${item.isActive ? "is-success" : "is-danger"}`}>
                        <i className={`fa-solid ${item.isActive ? "fa-circle-check" : "fa-ban"}`} aria-hidden="true"></i>
                        {item.isActive ? "Active" : "Deactivated"}
                      </span>
                      <span className="admin-user-badge">
                        <i className={`fa-solid ${item.hasLogin ? "fa-key" : "fa-user-slash"}`} aria-hidden="true"></i>
                        {item.hasLogin ? "Can sign in" : "Guest"}
                      </span>
                    </div>

                    <div className="admin-user-access" aria-label="Module access">
                      {access.map((a) => (
                        <span
                          key={a.label}
                          className={`admin-user-access-pill admin-user-access-${a.tone}${a.on ? " is-on" : ""}`}
                          title={`${a.label}: ${a.on ? "has access" : "no access"}`}
                        >
                          <i className={`fa-solid ${a.icon}`} aria-hidden="true"></i>
                          {a.label}
                        </span>
                      ))}
                    </div>

                    <footer className="admin-user-card-foot">
                      <RowActions
                        onEdit={() => setModal({ mode: "edit", id: item.id })}
                        onDelete={
                          !item.isOwner && item.linkedRecords === 0 ? () => handleDeletePermanently(item) : undefined
                        }
                        deleteLabel="Delete permanently"
                      >
                        {!item.isOwner && !item.hasLogin && (
                          <CustomButton
                            size="sm"
                            bg="warning"
                            rounded
                            className="m-0 admin-row-action-btn"
                            onClick={() => setModal({ mode: "edit", id: item.id, grantLogin: true })}
                            title="Grant login access"
                            aria-label="Grant login access"
                          >
                            <i className="fa-solid fa-key" aria-hidden="true"></i>
                          </CustomButton>
                        )}
                        {!item.isOwner && (
                          <CustomButton
                            size="sm"
                            bg={item.isActive ? "secondary" : "primary"}
                            rounded
                            className="m-0 admin-row-action-btn"
                            onClick={() => handleToggleActive(item)}
                            title={item.isActive ? "Deactivate" : "Activate"}
                            aria-label={item.isActive ? "Deactivate" : "Activate"}
                          >
                            <i
                              className={`fa-solid ${item.isActive ? "fa-user-slash" : "fa-user-check"}`}
                              aria-hidden="true"
                            ></i>
                          </CustomButton>
                        )}
                      </RowActions>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {modal && (
        <DefaultModal
          title={
            modal.mode === "new"
              ? "New Admin Account"
              : modal.grantLogin
                ? "Grant Login Access"
                : "Edit Admin Account"
          }
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminAccountForm
              id={modal.mode === "edit" ? modal.id : undefined}
              startWithLogin={modal.mode === "edit" && modal.grantLogin}
              onSaved={() => setModal(null)}
            />
          }
        />
      )}
    </ListCard>
  );
}
