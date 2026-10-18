import { useProfile } from "../api/hooks/useProfile";
import type { UserProfile } from "../api/types";

interface NavLink {
  to: string;
  label: string;
  end?: boolean;
  // Hidden unless this returns true for the portfolio's profile — a page
  // with nothing on it isn't worth a link.
  show?: (profile: UserProfile) => boolean;
}

export const NAV_LINKS: NavLink[] = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About" },
  { to: "/experience", label: "Experience", show: (p) => p.counts.experience + p.counts.education > 0 },
  { to: "/skills", label: "Skills", show: (p) => p.counts.skills + p.counts.tools > 0 },
  { to: "/projects", label: "Projects", show: (p) => p.counts.projects > 0 },
  // Freelance services are only offered by the site's creator.
  { to: "/services", label: "Services", show: (p) => p.isCreator },
  { to: "/blog", label: "Blog", show: (p) => p.counts.blogPosts > 0 },
  { to: "/contact", label: "Contact" },
];

// The current portfolio's nav links; conditional ones wait for the profile.
export function useNavLinks() {
  const { data: profile } = useProfile();
  return NAV_LINKS.filter((link) => !link.show || (profile !== undefined && link.show(profile)));
}
