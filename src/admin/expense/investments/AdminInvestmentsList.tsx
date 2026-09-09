import { useState } from "react";
import { useInvestments, useDeleteInvestment } from "../../../api/hooks/expense/useInvestments";
import { ListCard } from "../../components/ListCard";
import { Button } from "../../components/Button";
import { RowActions } from "../../components/RowActions";
import { confirmDelete } from "../../components/confirmDelete";
import { DetailView } from "../../components/DetailView";
import DefaultModal from "../../dms/components/DefaultModal";
import { AdminInvestmentForm } from "./AdminInvestmentForm";
import { formatCurrency } from "../currency";
import "../../dms/css/adminDisplays.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

export function AdminInvestmentsList() {
  const { data: items, isLoading } = useInvestments();
  const deleteInvestment = useDeleteInvestment();
  const [modal, setModal] = useState<ModalState>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  const viewItem = viewId !== null ? items?.find((item) => item.id === viewId) : undefined;

  async function handleDelete(id: number) {
    if (await confirmDelete("investment")) {
      deleteInvestment.mutate(id);
    }
  }

  return (
    <ListCard
      title="Investments"
      action={
        <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
          + New
        </Button>
      }
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No investments yet.</div>
      ) : (
        <div className="admin-card-grid admin-card-grid-wide">
          {items.map((item) => {
            const gain =
              item.currentValue !== null ? Number(item.currentValue) - Number(item.amountInvested) : null;
            return (
              <div className="card admin-item-card" key={item.id}>
                <div className="admin-item-card-header">
                  <div className="admin-item-card-heading">
                    <div className="admin-item-card-icon">
                      <i className="fa-solid fa-chart-line"></i>
                    </div>
                    <div>
                      <h3 className="admin-item-card-title">{item.title}</h3>
                      <p className="admin-item-card-subtitle">{item.type}</p>
                    </div>
                  </div>
                  <div className="admin-item-card-actions">
                    <RowActions
                      onView={() => setViewId(item.id)}
                      onEdit={() => setModal({ mode: "edit", id: item.id })}
                      onDelete={() => handleDelete(item.id)}
                    />
                  </div>
                </div>
                <span className="admin-item-card-meta">
                  <i className="fa-solid fa-calendar-days"></i>
                  {formatDate(item.date)}
                </span>

                <div className="admin-item-card-stats">
                  <div className="admin-item-card-stat-row">
                    <span>Invested</span>
                    <strong>{formatCurrency(item.amountInvested)}</strong>
                  </div>
                  {item.currentValue !== null && (
                    <div className="admin-item-card-stat-row">
                      <span>Current</span>
                      <strong>
                        {formatCurrency(item.currentValue)}
                        {gain !== null && (
                          <span
                            className="admin-item-card-stat-delta"
                            style={{ color: gain >= 0 ? "var(--secondary-dark-2)" : "#c0392b" }}
                          >
                            {gain >= 0 ? " +" : " "}
                            {formatCurrency(gain)}
                          </span>
                        )}
                      </strong>
                    </div>
                  )}
                </div>

                {item.notes && <p className="admin-item-card-desc">{item.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {viewItem && (
        <DefaultModal
          title="Investment Details"
          onClose={() => setViewId(null)}
          showFooter={false}
          size="md"
          component={
            <DetailView
              fields={[
                { label: "Title", value: viewItem.title },
                { label: "Type", value: viewItem.type },
                { label: "Date", value: formatDate(viewItem.date) },
                { label: "Amount Invested", value: formatCurrency(viewItem.amountInvested) },
                {
                  label: "Current Value",
                  value: viewItem.currentValue !== null ? formatCurrency(viewItem.currentValue) : null,
                },
                { label: "Invested By", value: viewItem.investedBy.name || viewItem.investedBy.email },
                { label: "Notes", value: viewItem.notes },
              ]}
            />
          }
        />
      )}

      {modal && (
        <DefaultModal
          title={modal.mode === "edit" ? "Edit Investment" : "New Investment"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminInvestmentForm
              id={modal.mode === "edit" ? modal.id : undefined}
              onSaved={() => setModal(null)}
            />
          }
        />
      )}
    </ListCard>
  );
}
