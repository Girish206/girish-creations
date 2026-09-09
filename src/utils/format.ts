// Shared formatting helpers for the projects/blog pages.

export function formatYear(date: string | null | undefined): string {
  if (!date) return "Present";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.getFullYear().toString();
}

export function formatFullDate(date: string | null | undefined): string {
  if (!date) return "Present";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export function truncateText(text: string, length = 150): string {
  const trimmed = text.trim();
  if (trimmed.length <= length) return trimmed;
  return `${trimmed.slice(0, length).trim()}…`;
}

export function excerpt(content: string, length = 150): string {
  return truncateText(stripHtml(content), length);
}

export function readingTime(content: string): string {
  const words = stripHtml(content).trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

export function splitTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export const BLOG_PLACEHOLDER_IMAGES = [
  "/assets/img/blog/blog-img-1.jpg",
  "/assets/img/blog/blog-img-2.jpg",
  "/assets/img/blog/blog-img-3.jpg",
  "/assets/img/blog/blog-img-4.jpg",
  "/assets/img/blog/blog-img-5.jpg",
  "/assets/img/blog/blog-img-6.jpg",
];

export function blogImageFor(seed: number): string {
  const index = ((seed % BLOG_PLACEHOLDER_IMAGES.length) + BLOG_PLACEHOLDER_IMAGES.length) % BLOG_PLACEHOLDER_IMAGES.length;
  return BLOG_PLACEHOLDER_IMAGES[index];
}
