// Date-formatting helpers mirroring the old Django model properties
// (ExperienceDetails.start_year/end_year/formatted_duration, EducationDetails.start_year/end_year)
// now that the API returns raw ISO date strings instead of pre-formatted values.

export function yearOf(dateString: string): number {
  return new Date(dateString).getFullYear();
}

export function endYearOrPresent(dateString: string | null): number | "Present" {
  return dateString ? new Date(dateString).getFullYear() : "Present";
}

// Mirrors ExperienceDetails.formatted_duration in main/models.py:
// total_days // 365 years, (total_days % 365) // 30 months (approximate, non-calendar-aware).
export function formatDuration(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const totalYears = Math.floor(totalDays / 365);
  const remainingDays = totalDays % 365;
  const totalMonths = Math.floor(remainingDays / 30);
  return `${totalYears} years ${totalMonths} months`;
}
