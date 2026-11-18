import type { ExpenseGroup, GroupMemberBalance, SettlementTransfer } from "../../../api/types";
import type { useAdminAuth } from "../../../context/AdminAuthContext";

type Admin = ReturnType<typeof useAdminAuth>["admin"];

// Whoever gets the money says it arrived. Super admins can do it for anyone. The
// server enforces this too, for group and daily splits alike.
export function mayMarkPaid(admin: Admin, toAdminUserId: number) {
  return Boolean(admin?.isSuperAdmin) || Number(admin?.sub) === toAdminUserId;
}

// Adding people to a group and emailing its split-up is for the people in it;
// an older group with no people recorded stays open to anyone who sees it.
export function mayManageGroup(admin: Admin, group: Pick<ExpenseGroup, "members">) {
  if (admin?.isSuperAdmin || group.members.length === 0) return true;
  return group.members.some((member) => member.adminUserId === Number(admin?.sub));
}

// Renaming, re-dating, taking people out, closing, reopening and deleting is for
// whoever created the group; with no creator in it, its people. Server-enforced.
export function mayRunGroup(admin: Admin, group: Pick<ExpenseGroup, "members" | "createdByAdminUserId">) {
  if (admin?.isSuperAdmin) return true;
  const creator = group.createdByAdminUserId;
  if (creator !== null && group.members.some((member) => member.adminUserId === creator)) {
    return creator === Number(admin?.sub);
  }
  return mayManageGroup(admin, group);
}

// Where someone stands from the money alone, before repayments: what they paid
// and put into the trip's fund, less their shares and any fund money they hold.
export const owedFromMoney = (b: GroupMemberBalance) =>
  b.paidCents - b.shareCents + b.fundPutInCents - b.fundShareCents - b.fundHeldCents;

// Who pays whom: the first person owing clears the first person owed, and what's
// left of either moves on to the next. The order comes from the expenses alone,
// not from what's still pending, so a part payment only lowers its own row and
// nobody is moved on to paying someone else. Only changing an expense can change
// the pairs. The server does the same (group-balances.ts), to limit repayments
// and for the split-up email.
// With a shared fund, everyone settles with whoever keeps the fund instead: they
// hold the money, so they collect from each person who owes and pay back what
// each person is owed; nobody pays anyone else. What comes in to them is listed
// first (biggest first), then what they pay out (biggest first).
export function suggestTransfers(
  balances: GroupMemberBalance[],
  fundHolderId: number | null = null,
): SettlementTransfer[] {
  const holder = fundHolderId === null ? undefined : balances.find((b) => b.adminUserId === fundHolderId);
  if (holder) {
    return balances
      .filter((b) => b !== holder && b.pendingCents !== 0)
      .sort(
        (a, b) =>
          Math.sign(a.pendingCents) - Math.sign(b.pendingCents) ||
          Math.abs(b.pendingCents) - Math.abs(a.pendingCents),
      )
      .map((b) => {
        const [from, to] = b.pendingCents < 0 ? [b, holder] : [holder, b];
        return {
          fromAdminUserId: from.adminUserId,
          fromName: from.name,
          toAdminUserId: to.adminUserId,
          toName: to.name,
          amountCents: Math.abs(b.pendingCents),
        };
      });
  }
  const fromExpenses = owedFromMoney;
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
