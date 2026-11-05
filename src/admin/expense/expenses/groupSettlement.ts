import type { GroupMemberBalance, SettlementTransfer } from "../../../api/types";
import type { useAdminAuth } from "../../../context/AdminAuthContext";

type Admin = ReturnType<typeof useAdminAuth>["admin"];

// Whoever gets the money says it arrived. Super admins can do it for anyone. The
// server enforces this too, for group and daily splits alike.
export function mayMarkPaid(admin: Admin, toAdminUserId: number) {
  return Boolean(admin?.isSuperAdmin) || Number(admin?.sub) === toAdminUserId;
}

// Who pays whom: the first person owing clears the first person owed, and what's
// left of either moves on to the next. The order comes from the expenses alone,
// not from what's still pending, so a part payment only lowers its own row and
// nobody is moved on to paying someone else. Only changing an expense can change
// the pairs. The server does the same (group-balances.ts), to limit repayments
// and for the split-up email.
export function suggestTransfers(balances: GroupMemberBalance[]): SettlementTransfer[] {
  const fromExpenses = (b: GroupMemberBalance) => b.paidCents - b.shareCents;
  const creditors = balances
    .filter((b) => b.pendingCents > 0)
    .sort((a, b) => fromExpenses(b) - fromExpenses(a) || a.adminUserId - b.adminUserId)
    .map((b) => ({ ...b, left: b.pendingCents }));
  const debtors = balances
    .filter((b) => b.pendingCents < 0)
    .sort((a, b) => fromExpenses(a) - fromExpenses(b) || a.adminUserId - b.adminUserId)
    .map((b) => ({ ...b, left: -b.pendingCents }));

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
