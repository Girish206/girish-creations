const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

// Same rule the server enforces, for an inline message instead of a toast.
export function isValidAmount(value: string | undefined): boolean {
  const trimmed = (value ?? "").trim();
  return AMOUNT_PATTERN.test(trimmed) && Number(trimmed) > 0;
}

export const INVALID_AMOUNT_MESSAGE = "Enter an amount above zero, with at most 2 decimals";

// Shared currency formatter for the expense/savings module —
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

// Short form for tight spots (section headers, summary tiles): full below a
// lakh ("₹84,500"), then lakhs / crores with up to 2 decimals ("₹12.45L",
// "₹1.2Cr"). Pair it with the full formatCurrency value as a tooltip.
export function formatCompactCurrency(value: number | string): string {
  const amount = Number(value);
  const abs = Math.abs(amount);
  if (abs < 100000) return formatCurrency(amount);
  // 99.995L and up would round to "100L", so those already read as crores.
  const [divisor, unit] = abs >= 9999500 ? [10000000, "Cr"] : [100000, "L"];
  const short = (abs / divisor).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return `${amount < 0 ? "-" : ""}₹${short}${unit}`;
}
