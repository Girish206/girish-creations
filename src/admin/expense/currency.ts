// Shared currency formatter for the expense/investment/savings module —
// Indian Rupee, since this tracker is for a group of people using INR.
export function formatCurrency(value: number | string): string {
  return Number(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}
