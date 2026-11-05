import {
  useAddDirectSettlement,
  useDeleteDirectSettlement,
  useDirectBalances,
} from "../../../api/hooks/expense/useExpenses";
import { confirmDelete } from "../../components/confirmDelete";
import { formatCurrency } from "../currency";
import { formatDay, todayLocal } from "../dates";
import { SettleTransferRow } from "./SettleTransferRow";
// The repayment rows reuse the remove button styled there.
import "../savings/savingsGoals.css";

// Settle-up for splits on Daily Expenses. Unlike a trip group these are netted
// between each pair of people, so nobody is told to pay someone they never
// split anything with.
export function AdminDirectSettleUp() {
  const { data } = useDirectBalances();
  const addSettlement = useAddDirectSettlement();
  const deleteSettlement = useDeleteDirectSettlement();

  const transfers = data?.transfers ?? [];
  const settlements = data?.settlements ?? [];

  async function handleDelete(id: number) {
    if (await confirmDelete("settlement")) {
      deleteSettlement.mutate(id);
    }
  }

  if (!data) return <p>Loading...</p>;

  return (
    <div className="admin-settle">
      <p className="admin-settle-note">
        <i className="fa-solid fa-circle-info"></i> From splits on expenses that aren't in a group, worked out between
        each pair of people.
      </p>

      <h5 className="admin-settle-heading">To settle up</h5>
      {transfers.length === 0 ? (
        <p className="admin-settle-note">
          <i className="fa-solid fa-check"></i> Everyone is settled up.
        </p>
      ) : (
        <ul className="admin-settle-list">
          {transfers.map((t) => (
            <SettleTransferRow
              key={`${t.fromAdminUserId}-${t.toAdminUserId}`}
              transfer={t}
              onRecord={(amount) =>
                addSettlement.mutateAsync({
                  amount,
                  date: todayLocal(),
                  fromAdminUserId: t.fromAdminUserId,
                  toAdminUserId: t.toAdminUserId,
                })
              }
            />
          ))}
        </ul>
      )}

      {settlements.length > 0 && (
        <>
          <h5 className="admin-settle-heading">Recorded repayments</h5>
          <ul className="admin-settle-list">
            {settlements.map((s) => (
              <li key={s.id}>
                <span>
                  {s.fromAdminUser.name || s.fromAdminUser.email} paid {s.toAdminUser.name || s.toAdminUser.email}{" "}
                  <strong>{formatCurrency(s.amount)}</strong> · {formatDay(s.date)}
                </span>
                <button
                  type="button"
                  className="admin-savings-contribution-remove"
                  onClick={() => handleDelete(s.id)}
                  aria-label="Remove repayment"
                  title="Remove"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
