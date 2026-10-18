import { useProfile } from "../api/hooks/useProfile";
import type { PortfolioAccent, PortfolioStyle } from "../api/types";

// The classic design's colour shades, in picker order. `swatch` is the
// light-theme accent (classic.css holds each shade's full palette).
export const CLASSIC_ACCENTS: { value: PortfolioAccent; label: string; swatch: string }[] = [
  { value: "emerald", label: "Emerald", swatch: "#059669" },
  { value: "ocean", label: "Ocean", swatch: "#0284c7" },
  { value: "indigo", label: "Indigo", swatch: "#4f46e5" },
  { value: "rose", label: "Rose", swatch: "#e11d48" },
  { value: "sunset", label: "Sunset", swatch: "#ea580c" },
  { value: "violet", label: "Violet", swatch: "#9333ea" },
];

// The design the current portfolio's owner picked in the admin Profile page.
export function usePortfolioStyle(): PortfolioStyle {
  return useProfile().data?.portfolioStyle ?? "tech";
}

// Unset, or a shade name from an earlier palette, falls back to emerald.
export function usePortfolioAccent(): PortfolioAccent {
  const accent = useProfile().data?.portfolioAccent;
  return CLASSIC_ACCENTS.some((shade) => shade.value === accent) ? accent! : "emerald";
}

// True on the classic (non-technical) design, which swaps developer wording
// ("tech stack", "shipped") for plain wording.
export function useIsClassic() {
  return usePortfolioStyle() === "classic";
}

// True on the site creator's own portfolio — the only one that offers
// freelance work (Services page, "available for projects", hire-me copy).
export function useIsCreator() {
  return useProfile().data?.isCreator ?? false;
}
