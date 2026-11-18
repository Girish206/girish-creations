import type { SavingsGoal } from "../../../api/types";
import { formatCurrency } from "../currency";

const money = (cents: number) => formatCurrency(cents / 100);

// A shared fund's end-of-trip split: what each person put in, their share of
// everything paid from it, and what they get back or still owe. Money moves
// between each person and whoever keeps the fund.
export function FundSplit({ goal }: { goal: SavingsGoal }) {
  const rows = goal.fundSplit;
  if (!rows || rows.length === 0) return null;
  const holder = goal.accountHolder ? goal.accountHolder.name || goal.accountHolder.email : null;
  const holderId = goal.accountHolderAdminUserId;

  return (
    <div className="admin-fund-split">
      <h5 className="admin-fund-split-title">Split at the end</h5>
      <table className="admin-fund-split-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Put in</th>
            <th>Share</th>
            <th>Settle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.adminUserId}>
              <td>{row.name}</td>
              <td>{money(row.putInCents)}</td>
              <td>{money(row.shareCents)}</td>
              <td>
                {row.balanceCents === 0 ? (
                  <span className="admin-settle-square">Even</span>
                ) : row.adminUserId === holderId ? (
                  // The holder's own part is with them already.
                  <span className={row.balanceCents > 0 ? "admin-settle-gets" : "admin-settle-owes"}>
                    {row.balanceCents > 0 ? "Keeps" : "Covers"} {money(Math.abs(row.balanceCents))}
                  </span>
                ) : row.balanceCents > 0 ? (
                  <span className="admin-settle-gets">Gets {money(row.balanceCents)} back</span>
                ) : (
                  <span className="admin-settle-owes">Pays {money(-row.balanceCents)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {goal.expenseGroupId !== null ? (
        <p className="admin-fund-split-note">
          <i className="fa-solid fa-suitcase-rolling"></i> This is the fund on its own. The trip's settle-up (Expenses →{" "}
          {goal.name}) nets it with what people paid from their own money, so settle up there.
        </p>
      ) : (
      <p className="admin-fund-split-note">
        {holder
          ? `Refunds come from ${holder}, who keeps the fund; anyone who owes pays ${holder}.`
          : "Set who keeps the fund (account holder) so everyone knows who pays out."}{" "}
        Paying in what's owed? Add it as money in.
      </p>
      )}
    </div>
  );
}
