import { useEffect } from "react";

const SITE_NAME = "Girish Creations";

// Sets the browser tab title for a public page ("About · Girish Creations").
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Full Stack Developer`;
  }, [title]);
}
