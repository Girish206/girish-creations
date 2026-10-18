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
// today), e.g. 22 Feb 2021 -> 9 Oct 2026 = "5 years 7 months".
export function formatDuration(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  if (end.getUTCDate() < start.getUTCDate()) months -= 1;
  months = Math.max(0, months);
  return `${plural(Math.floor(months / 12), "year")} ${plural(months % 12, "month")}`;
}
