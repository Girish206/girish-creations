// Date-formatting helpers mirroring the old Django model properties
// (ExperienceDetails.start_year/end_year/formatted_duration, EducationDetails.start_year/end_year)
// now that the API returns raw ISO date strings instead of pre-formatted values.

export function yearOf(dateString: string): number {
  return new Date(dateString).getFullYear();
}

export function endYearOrPresent(dateString: string | null): number | "Present" {
  return dateString ? new Date(dateString).getFullYear() : "Present";
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

// Whole calendar months between start and end (an ongoing role counts up to
// today), e.g. 22 Feb 2021 -> 9 Oct 2026 = "5 years 7 months". A zero part is
// left out ("9 months", "2 years", not "0 years 9 months").
export function formatDuration(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  if (end.getUTCDate() < start.getUTCDate()) months -= 1;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0 && rest === 0) return "Less than a month";
  return [years > 0 && plural(years, "year"), rest > 0 && plural(rest, "month")].filter(Boolean).join(" ");
}

// "Feb 2021": a role's start/end on the Experience timeline.
export function formatMonthYear(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", timeZone: "UTC" });
}

// Education grade: up to 10 is a CGPA ("8.5 CGPA"), anything higher a
// percentage ("87.49%"). Null when no usable grade was entered.
export function formatGrade(grade: string | null | undefined): string | null {
  const value = Number(grade);
  if (!grade || !Number.isFinite(value) || value <= 0) return null;
  return value <= 10 ? `${value} CGPA` : `${value}%`;
}
