// Shared currency formatter for the expense/investment/savings module —
// Indian Rupee, since this tracker is for a group of people using INR.
// Whole amounts stay compact ("₹500"); anything with paise shows both
// digits ("₹45.50") rather than being rounded away.
export function formatCurrency(value: number | string): string {
  const amount = Number(value);
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  });
}
