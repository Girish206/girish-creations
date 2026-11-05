// Expense, contribution and repayment dates are calendar days, stored as UTC
// midnight — so they're read back in UTC too, or anyone west of Greenwich
// would see the day before.
export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

// Today on the user's own calendar. (toISOString() would give the UTC day,
// which is still yesterday in India until 5:30 am.)
export function todayLocal() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
