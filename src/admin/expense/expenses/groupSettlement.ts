import type { GroupMemberBalance, SettlementTransfer } from "../../../api/types";

// Greedy "largest debtor pays largest creditor" — settles everyone in at
// most (people − 1) transfers, which is plenty good for a trip-sized group.
export function suggestTransfers(balances: GroupMemberBalance[]): SettlementTransfer[] {
  const creditors = balances.filter((b) => b.pendingCents > 0).map((b) => ({ ...b, left: b.pendingCents }));
  const debtors = balances.filter((b) => b.pendingCents < 0).map((b) => ({ ...b, left: -b.pendingCents }));
  creditors.sort((a, b) => b.left - a.left);
  debtors.sort((a, b) => b.left - a.left);

  const transfers: SettlementTransfer[] = [];
  let c = 0;
  let d = 0;
  while (c < creditors.length && d < debtors.length) {
    const amountCents = Math.min(creditors[c].left, debtors[d].left);
    transfers.push({
      fromAdminUserId: debtors[d].adminUserId,
      fromName: debtors[d].name,
      toAdminUserId: creditors[c].adminUserId,
      toName: creditors[c].name,
      amountCents,
    });
    creditors[c].left -= amountCents;
    debtors[d].left -= amountCents;
    if (creditors[c].left === 0) c++;
    if (debtors[d].left === 0) d++;
  }
  return transfers;
}
