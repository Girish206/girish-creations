import { useEffect, useState } from "react";

const STORAGE_KEY = "darkMode";

function initialIsDark(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "true";
  } catch {
    // Storage unavailable (private mode etc.) — fall back to the OS setting.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

// Toggles `body.dark-theme`, which the public site's palette (site.css) keys
// off. With no saved choice yet, follows the operating system's setting.
export function useDarkTheme() {
  const [isDark, setIsDark] = useState(initialIsDark);

  useEffect(() => {
    document.body.classList.toggle("dark-theme", isDark);
  }, [isDark]);

  function toggle() {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Not persisted — the toggle still applies for this visit.
      }
      return next;
    });
  }

  return { isDark, toggle };
}
