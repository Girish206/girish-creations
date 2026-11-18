import { useState } from "react";
import { useAdminUsers } from "../../../api/hooks/expense/useAdminUsers";
import type { AdminUserAccount } from "../../../api/types";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { Button } from "../../components/Button";
import { ListCard } from "../../components/ListCard";
import CustomButton from "../../dms/components/CustomButton";
import DefaultModal from "../../dms/components/DefaultModal";
import { avatarColorFor } from "../avatarColor";
import { AdminAccountForm } from "./AdminAccountForm";
import { canManageAccount, canSendWelcome, useAccountActions, welcomeSentOn } from "./useAccountActions";
import "../../dms/css/adminDisplays.css";
import "../../admin.css";
import "./moneyHubPeople.css";
import { SearchBox } from "../../components/SearchBox";

type Filter = "all" | "active" | "inactive" | "login" | "guest";

// Count tiles that double as the filter: tap one to show only those people.
const FILTERS: { key: Filter; label: string; matches: (item: AdminUserAccount) => boolean }[] = [
  { key: "all", label: "All", matches: () => true },
  { key: "active", label: "Active", matches: (item) => item.isActive },
  { key: "inactive", label: "Inactive", matches: (item) => !item.isActive },
  { key: "login", label: "Sign in", matches: (item) => item.hasLogin },
  { key: "guest", label: "Guests", matches: (item) => !item.hasLogin },
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

// iconOnly: the list rows show just the icons (with a tooltip) to stay one line.
function AccessChips({ item, iconOnly = false }: { item: AdminUserAccount; iconOnly?: boolean }) {
  return (
    <span className={`people-chips${iconOnly ? " is-icon-only" : ""}`}>
      {item.hasExpensesAccess && (
        <span className="people-chip is-on" title="Expenses">
          <i className="fa-solid fa-receipt" aria-hidden="true"></i>
          <span>Expenses</span>
        </span>
      )}
      {item.hasSavingsAccess && (
        <span className="people-chip is-on" title="Savings">
          <i className="fa-solid fa-piggy-bank" aria-hidden="true"></i>
          <span>Savings</span>
        </span>
      )}
      {!item.hasLogin && (
        <span className="people-chip" title="Listed for splits, can't sign in">
          <i className="fa-solid fa-user-slash" aria-hidden="true"></i>
          <span>Guest</span>
        </span>
      )}
      {item.isOwner && (
        <span className="people-chip" title="Owner">
          <i className="fa-solid fa-crown" aria-hidden="true"></i>
          <span>Owner</span>
        </span>
      )}
      {!item.isActive && (
        <span className="people-chip is-off" title="Deactivated">
          <i className="fa-solid fa-ban" aria-hidden="true"></i>
          <span>Deactivated</span>
        </span>
      )}
    </span>
  );
}

interface PersonDetailsProps {
  item: AdminUserAccount;
  canEdit: boolean;
  onEdit: () => void;
  onGrantLogin: () => void;
  onDeleted: () => void;
}

// One person's profile: who they are and what they can use.
function PersonDetails({ item, canEdit, onEdit, onGrantLogin, onDeleted }: PersonDetailsProps) {
  const { sendWelcome, toggleActive, deletePermanently } = useAccountActions();

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

      {welcomeSentOn(item) && <p className="people-muted">Welcome email last sent on {welcomeSentOn(item)}.</p>}

      {canEdit && (
        <footer className="people-details-actions">
          <CustomButton size="sm" className="m-0" onClick={onEdit}>
            <i className="fa-solid fa-pen" aria-hidden="true"></i>
            <span>Edit</span>
          </CustomButton>
          {canSendWelcome(item) && (
            <CustomButton
              size="sm"
              className="m-0"
              variant="outline"
              onClick={() => sendWelcome(item)}
              title={item.welcomeEmailSentAt ? "Resend welcome email" : "Send welcome email"}
            >
              <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
              <span>{item.welcomeEmailSentAt ? "Resend email" : "Send email"}</span>
            </CustomButton>
          )}
          {!item.isOwner && !item.hasLogin && (
            <CustomButton size="sm" className="m-0" variant="outline" onClick={onGrantLogin} title="Give login access">
              <i className="fa-solid fa-key" aria-hidden="true"></i>
              <span>Give login</span>
            </CustomButton>
          )}
          {!item.isOwner && (
            <CustomButton size="sm" className="m-0" variant="outline" onClick={() => toggleActive(item)}>
              <i className={`fa-solid ${item.isActive ? "fa-user-slash" : "fa-user-check"}`} aria-hidden="true"></i>
              <span>{item.isActive ? "Deactivate" : "Reactivate"}</span>
            </CustomButton>
          )}
          {!item.isOwner && item.linkedRecords === 0 && (
            <CustomButton
              size="sm"
              className="m-0"
              bg="danger"
              onClick={async () => {
                if (await deletePermanently(item)) onDeleted();
              }}
            >
              <i className="fa-solid fa-trash" aria-hidden="true"></i>
              <span>Delete</span>
            </CustomButton>
          )}
        </footer>
      )}
    </div>
  );
}

type ModalState = { mode: "new" } | { mode: "edit"; id: number; grantLogin?: boolean } | null;

// The Money Hub's people, leaving out accounts that only use the portfolio or
// have no access at all (the server filters them; Admin Accounts on the
// portfolio side lists the accounts with portfolio access).
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
          <div className="people-filter" role="group" aria-label="Filter people">
            {FILTERS.map((f) => (
              <button
                type="button"
                key={f.key}
                className={filter === f.key ? "is-active" : ""}
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                <strong>{searched.filter(f.matches).length}</strong>
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          <SearchBox
            className="people-search"
            placeholder="Search name, email or mobile…"
            label="Search people"
            value={query}
            onChange={setQuery}
          />

          {shown.length === 0 ? (
            <div className="admin-empty-state">Nobody matches this filter.</div>
          ) : (
            <div className="people-list">
              {shown.map((item) => (
                <button
                  type="button"
                  className={`people-item${item.isActive ? "" : " is-inactive"}`}
                  key={item.id}
                  onClick={() => setViewId(item.id)}
                >
                  <Avatar item={item} />
                  <span className="people-item-identity">
                    <span className="people-item-name">
                      <span>{nameOf(item)}</span>
                      <AccessChips item={item} iconOnly />
                    </span>
                    {contactOf(item) && <span className="people-item-contact">{contactOf(item)}</span>}
                  </span>
                  <i className="fa-solid fa-chevron-right people-item-go" aria-hidden="true"></i>
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
