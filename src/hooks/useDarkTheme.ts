import { useLayoutEffect, useState } from "react";

const STORAGE_KEY = "darkMode";

function initialIsDark(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "true";
  } catch {
    // Storage unavailable (private mode etc.) — fall back to the default.
  }
  return true;
}

// Toggles `body.dark-theme`, which the public site's palette (site.css) keys
// off. Dark by default; a visitor's toggle choice is remembered.
export function useDarkTheme() {
  const [isDark, setIsDark] = useState(initialIsDark);

  // Before paint, so a dark visit never flashes the light palette first.
  useLayoutEffect(() => {
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
