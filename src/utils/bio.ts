// Lets bio text stay accurate without manual edits: write "{{experience}}" in
// the bio field (via the admin Profile form) and it's substituted with the
// live-computed formattedExperience (e.g. "5 years 7 months") on every render,
// instead of a duration hardcoded as plain text that goes stale over time.
export function formatBio(bio: string | null | undefined, formattedExperience: string | undefined): string {
  if (!bio) return "";
  if (!formattedExperience) return bio;
  return bio.replace(/\{\{\s*experience\s*\}\}/gi, formattedExperience);
}
