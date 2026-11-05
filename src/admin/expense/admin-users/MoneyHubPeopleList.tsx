import { useState } from "react";
import { useDirectBalances } from "../../../api/hooks/expense/useExpenses";
import { useExpenseGroups } from "../../../api/hooks/expense/useExpenseGroups";
import { useAdminUsers } from "../../../api/hooks/expense/useAdminUsers";
import type { AdminUserAccount } from "../../../api/types";
import { PillSelect } from "../../../components/PillSelect";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { Button } from "../../components/Button";
import { ListCard } from "../../components/ListCard";
import CustomButton from "../../dms/components/CustomButton";
import DefaultModal from "../../dms/components/DefaultModal";
import { avatarColorFor } from "../avatarColor";
import { formatCurrency } from "../currency";
import { AdminAccountForm } from "./AdminAccountForm";
import { canManageAccount, canSendWelcome, useAccountActions, welcomeSentOn } from "./useAccountActions";
import "../../dms/css/adminDisplays.css";
import "../../admin.css";
import "./moneyHubPeople.css";

type Filter = "all" | "active" | "inactive" | "login" | "guest";

const FILTERS: { key: Filter; label: string; matches: (item: AdminUserAccount) => boolean }[] = [
  { key: "all", label: "Everyone", matches: () => true },
  { key: "active", label: "Active", matches: (item) => item.isActive },
  { key: "inactive", label: "Deactivated", matches: (item) => !item.isActive },
  { key: "login", label: "Can sign in", matches: (item) => item.hasLogin },
  { key: "guest", label: "Guests", matches: (item) => !item.hasLogin },
];

const STATS: { label: string; icon: string; matches: (item: AdminUserAccount) => boolean }[] = [
  { label: "People", icon: "fa-users", matches: () => true },
  { label: "Active", icon: "fa-circle-check", matches: (item) => item.isActive },
  { label: "Can sign in", icon: "fa-key", matches: (item) => item.hasLogin },
  { label: "Guests", icon: "fa-user-slash", matches: (item) => !item.hasLogin },
];

const nameOf = (item: AdminUserAccount) => item.name || item.email || item.mobile || "Unnamed";
const contactOf = (item: AdminUserAccount) => [item.email, item.mobile].filter(Boolean).join(" · ");

function Avatar({ item, large = false }: { item: AdminUserAccount; large?: boolean }) {
  return (
    <span className={`people-avatar${large ? " is-large" : ""}`} style={{ background: avatarColorFor(nameOf(item)) }}>
      {nameOf(item).charAt(0).toUpperCase()}
      <span
        className={`people-status-dot${item.isActive ? " is-active" : ""}`}
        title={item.isActive ? "Active" : "Deactivated"}
      ></span>
    </span>
  );
}

function AccessChips({ item }: { item: AdminUserAccount }) {
  return (
    <div className="people-chips">
      {item.hasExpensesAccess && (
        <span className="people-chip is-on">
          <i className="fa-solid fa-receipt" aria-hidden="true"></i> Expenses
        </span>
      )}
      {item.hasSavingsAccess && (
        <span className="people-chip is-on">
          <i className="fa-solid fa-piggy-bank" aria-hidden="true"></i> Savings
        </span>
      )}
      {!item.hasLogin && (
        <span className="people-chip" title="Listed for splits, can't sign in">
          <i className="fa-solid fa-user-slash" aria-hidden="true"></i> Guest
        </span>
      )}
      {item.isOwner && (
        <span className="people-chip">
          <i className="fa-solid fa-crown" aria-hidden="true"></i> Owner
        </span>
      )}
      {!item.isActive && (
        <span className="people-chip is-off">
          <i className="fa-solid fa-ban" aria-hidden="true"></i> Deactivated
        </span>
      )}
    </div>
  );
}

function PendingText({ cents }: { cents: number }) {
  if (cents === 0) return <span className="people-muted">Settled</span>;
  return cents > 0 ? (
    <span className="admin-settle-gets">Gets {formatCurrency(cents / 100)}</span>
  ) : (
    <span className="admin-settle-owes">Owes {formatCurrency(-cents / 100)}</span>
  );
}

interface PersonDetailsProps {
  item: AdminUserAccount;
  canEdit: boolean;
  onEdit: () => void;
  onGrantLogin: () => void;
  onDeleted: () => void;
}

// One person's profile: who they are, what they can use, and where they stand
// in the groups and daily splits this account can see.
function PersonDetails({ item, canEdit, onEdit, onGrantLogin, onDeleted }: PersonDetailsProps) {
  const { admin } = useAdminAuth();
  const hasExpenses = Boolean(admin?.hasExpensesAccess);
  const { data: groups } = useExpenseGroups(hasExpenses);
  const { data: direct } = useDirectBalances(hasExpenses);
  const { sendWelcome, toggleActive, deletePermanently } = useAccountActions();

  const theirGroups = (groups ?? []).filter(
    (group) =>
      group.members.some((member) => member.adminUserId === item.id) ||
      group.balances.some((balance) => balance.adminUserId === item.id),
  );
  const theirTransfers = (direct?.transfers ?? []).filter(
    (transfer) => transfer.fromAdminUserId === item.id || transfer.toAdminUserId === item.id,
  );
  const figures = [
    { label: "Expenses paid", value: item.activity.expensesPaid },
    { label: "Splits shared", value: item.activity.splitShares },
    { label: "Groups", value: item.activity.groups },
    { label: "Contributions", value: item.activity.contributions },
  ];

  return (
    <div className="people-details">
      <header className="people-details-head">
        <Avatar item={item} large />
        <div className="people-details-identity">
          <h3>{nameOf(item)}</h3>
          {contactOf(item) && <p>{contactOf(item)}</p>}
          <AccessChips item={item} />
        </div>
      </header>

      <div className="people-figures">
        {figures.map((figure) => (
          <div key={figure.label}>
            <strong>{figure.value}</strong>
            <span>{figure.label}</span>
          </div>
        ))}
      </div>

      {hasExpenses && (
        <>
          <h5 className="admin-settle-heading">Groups</h5>
          {theirGroups.length === 0 ? (
            <p className="people-muted">Not in any group you can see.</p>
          ) : (
            <ul className="people-rows">
              {theirGroups.map((group) => {
                const balance = group.balances.find((row) => row.adminUserId === item.id);
                return (
                  <li key={group.id}>
                    <span className="people-row-main">
                      {group.name}
                      {group.closedAt && <small> · Closed</small>}
                      {balance && (
                        <small className="d-block">
                          Paid {formatCurrency(balance.paidCents / 100)} · Share {formatCurrency(balance.shareCents / 100)}
                        </small>
                      )}
                    </span>
                    <PendingText cents={balance?.pendingCents ?? 0} />
                  </li>
                );
              })}
            </ul>
          )}

          {theirTransfers.length > 0 && (
            <>
              <h5 className="admin-settle-heading">Daily splits</h5>
              <ul className="people-rows">
                {theirTransfers.map((transfer) => {
                  const pays = transfer.fromAdminUserId === item.id;
                  return (
                    <li key={`${transfer.fromAdminUserId}-${transfer.toAdminUserId}`}>
                      <span className="people-row-main">With {pays ? transfer.toName : transfer.fromName}</span>
                      <PendingText cents={pays ? -transfer.amountCents : transfer.amountCents} />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}

      {welcomeSentOn(item) && <p className="people-muted">Welcome email last sent on {welcomeSentOn(item)}.</p>}

      {canEdit && (
        <footer className="people-details-actions">
          <CustomButton className="m-0" onClick={onEdit}>
            <i className="fa-solid fa-pen" aria-hidden="true"></i> Edit
          </CustomButton>
          {canSendWelcome(item) && (
            <CustomButton className="m-0" variant="outline" onClick={() => sendWelcome(item)}>
              <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>{" "}
              {item.welcomeEmailSentAt ? "Resend welcome email" : "Send welcome email"}
            </CustomButton>
          )}
          {!item.isOwner && !item.hasLogin && (
            <CustomButton className="m-0" variant="outline" onClick={onGrantLogin}>
              <i className="fa-solid fa-key" aria-hidden="true"></i> Give login access
            </CustomButton>
          )}
          {!item.isOwner && (
            <CustomButton className="m-0" variant="outline" onClick={() => toggleActive(item)}>
              <i className={`fa-solid ${item.isActive ? "fa-user-slash" : "fa-user-check"}`} aria-hidden="true"></i>{" "}
              {item.isActive ? "Deactivate" : "Reactivate"}
            </CustomButton>
          )}
          {!item.isOwner && item.linkedRecords === 0 && (
            <CustomButton
              className="m-0"
              bg="danger"
              onClick={async () => {
                if (await deletePermanently(item)) onDeleted();
              }}
            >
              <i className="fa-solid fa-trash" aria-hidden="true"></i> Delete
            </CustomButton>
          )}
        </footer>
      )}
    </div>
  );
}

type ModalState = { mode: "new" } | { mode: "edit"; id: number; grantLogin?: boolean } | null;

// The Money Hub's people, leaving out accounts that only use RunMitra or the
// portfolio (the server filters them; Admin Accounts on the portfolio side
// lists the accounts with portfolio access).
export function MoneyHubPeopleList() {
  const { admin } = useAdminAuth();
  const { data: items, isLoading } = useAdminUsers("money-hub");
  const [modal, setModal] = useState<ModalState>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const canEdit = (item: AdminUserAccount) => canManageAccount(item, admin);
  const viewItem = viewId !== null ? items?.find((item) => item.id === viewId) : undefined;

  const needle = query.trim().toLowerCase();
  const searched = (items ?? []).filter(
    (item) => !needle || `${item.name ?? ""} ${item.email ?? ""} ${item.mobile ?? ""}`.toLowerCase().includes(needle),
  );
  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const shown = searched.filter(activeFilter.matches);

  function openEdit(id: number, grantLogin = false) {
    setViewId(null);
    setModal({ mode: "edit", id, grantLogin });
  }

  return (
    <ListCard
      title="People"
      action={
        <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
          <i className="fa-solid fa-user-plus" aria-hidden="true"></i> Add person
        </Button>
      }
      bodyClassName="admin-card-body-compact"
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No people yet. Add the people you share expenses or savings with.</div>
      ) : (
        <>
          <div className="people-stats">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <i className={`fa-solid ${stat.icon}`} aria-hidden="true"></i>
                <strong>{items.filter(stat.matches).length}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="admin-accounts-toolbar">
            <PillSelect
              label="Filter people"
              value={filter}
              options={FILTERS.map((f) => ({
                value: f.key,
                label: `${f.label} (${searched.filter(f.matches).length})`,
              }))}
              onChange={setFilter}
            />
            <label className="admin-accounts-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
              <span className="visually-hidden">Search people</span>
              <input
                type="search"
                className="form-control"
                placeholder="Search name, email or mobile…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>

          {shown.length === 0 ? (
            <div className="admin-empty-state">Nobody matches this filter.</div>
          ) : (
            <div className="people-grid">
              {shown.map((item) => (
                <button
                  type="button"
                  className={`people-card${item.isActive ? "" : " is-inactive"}`}
                  key={item.id}
                  onClick={() => setViewId(item.id)}
                >
                  <span className="people-card-head">
                    <Avatar item={item} />
                    <span className="people-card-identity">
                      <span className="people-card-name">{nameOf(item)}</span>
                      {contactOf(item) && <span className="people-card-contact">{contactOf(item)}</span>}
                    </span>
                    <i className="fa-solid fa-chevron-right people-card-go" aria-hidden="true"></i>
                  </span>
                  <AccessChips item={item} />
                  <span className="people-card-activity">
                    {item.activity.groups} group{item.activity.groups === 1 ? "" : "s"} · {item.activity.expensesPaid} expense
                    {item.activity.expensesPaid === 1 ? "" : "s"} paid
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {viewItem && (
        <DefaultModal
          title="Person"
          onClose={() => setViewId(null)}
          showFooter={false}
          size="md"
          component={
            <PersonDetails
              item={viewItem}
              canEdit={canEdit(viewItem)}
              onEdit={() => openEdit(viewItem.id)}
              onGrantLogin={() => openEdit(viewItem.id, true)}
              onDeleted={() => setViewId(null)}
            />
          }
        />
      )}

      {modal && (
        <DefaultModal
          title={modal.mode === "new" ? "Add Person" : modal.grantLogin ? "Give Login Access" : "Edit Person"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminAccountForm
              id={modal.mode === "edit" ? modal.id : undefined}
              startWithLogin={modal.mode === "edit" && modal.grantLogin}
              scope="money-hub"
              onSaved={() => setModal(null)}
            />
          }
        />
      )}
    </ListCard>
  );
}
