import { useEffect } from "react";
import { useProfile } from "../api/hooks/useProfile";

const SITE_NAME = "Girish Creations";

// Sets the browser tab title: "About · Jane Doe" inside someone's portfolio,
// "Page not found · Girish Creations" outside one.
export function usePageTitle(title?: string) {
  // Idle (undefined) outside a portfolio.
  const owner = useProfile().data?.fullName;
  useEffect(() => {
    if (title) {
      document.title = `${title} · ${owner ?? SITE_NAME}`;
    } else {
      document.title = owner ? `${owner} · Portfolio` : `${SITE_NAME} — Portfolios`;
    }
  }, [title, owner]);
}
