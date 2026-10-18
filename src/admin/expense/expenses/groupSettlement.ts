import type { AdminUserRef, Expense, ExpenseGroupSettlement } from "../../../api/types";

// Everything is worked out in integer paise so shares/settlements always
// add up exactly — no 0.1 + 0.2 drift in "₹0.01 still pending".
const toCents = (value: string | number) => Math.round(Number(value) * 100);

export interface MemberBalance {
  adminUserId: number;
  name: string;
  // What they actually paid out of pocket for the group's expenses.
  paidCents: number;
  // Their fair share — their split portion of shared expenses, plus the
  // full amount of any unsplit expense they paid for themselves.
  shareCents: number;
  // Repayments already recorded (see ExpenseGroupSettlement).
  sentCents: number;
  receivedCents: number;
  // > 0: others still owe them this much. < 0: they still owe this much.
  pendingCents: number;
}

export interface SuggestedTransfer {
  fromAdminUserId: number;
  fromName: string;
  toAdminUserId: number;
  toName: string;
  amountCents: number;
}

function displayName(user: AdminUserRef) {
  return user.name || user.email || "Unknown member";
}

export function computeGroupBalances(expenses: Expense[], settlements: ExpenseGroupSettlement[]): MemberBalance[] {
  const byId = new Map<number, MemberBalance>();
  const entry = (user: AdminUserRef) => {
    let balance = byId.get(user.id);
    if (!balance) {
      balance = {
        adminUserId: user.id,
        name: displayName(user),
        paidCents: 0,
        shareCents: 0,
        sentCents: 0,
        receivedCents: 0,
        pendingCents: 0,
      };
      byId.set(user.id, balance);
    }
    return balance;
  };

  for (const expense of expenses) {
    const amountCents = toCents(expense.amount);
    entry(expense.paidBy).paidCents += amountCents;
    if (expense.splitParticipants.length > 0) {
      for (const participant of expense.splitParticipants) {
        entry(participant.adminUser).shareCents += toCents(participant.shareAmount);
      }
    } else {
      entry(expense.paidBy).shareCents += amountCents;
    }
  }

  for (const settlement of settlements) {
    const cents = toCents(settlement.amount);
    entry(settlement.fromAdminUser).sentCents += cents;
    entry(settlement.toAdminUser).receivedCents += cents;
  }

  const balances = Array.from(byId.values());
  for (const balance of balances) {
    balance.pendingCents = balance.paidCents - balance.shareCents + balance.sentCents - balance.receivedCents;
  }
  // Biggest creditors first, then those who are square, then debtors.
  return balances.sort((a, b) => b.pendingCents - a.pendingCents || a.name.localeCompare(b.name));
}

// Greedy "largest debtor pays largest creditor" — settles everyone in at
// most (people − 1) transfers, which is plenty good for a trip-sized group.
export function suggestTransfers(balances: MemberBalance[]): SuggestedTransfer[] {
  const creditors = balances.filter((b) => b.pendingCents > 0).map((b) => ({ ...b, left: b.pendingCents }));
  const debtors = balances.filter((b) => b.pendingCents < 0).map((b) => ({ ...b, left: -b.pendingCents }));
  creditors.sort((a, b) => b.left - a.left);
  debtors.sort((a, b) => b.left - a.left);

  const transfers: SuggestedTransfer[] = [];
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
