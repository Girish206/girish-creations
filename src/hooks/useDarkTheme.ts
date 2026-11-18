import { useLayoutEffect, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";

const STORAGE_KEY = "darkMode";

// The visitor's own choice from an earlier toggle, or null if they never
// picked one.
function storedChoice(): boolean | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "true";
  } catch {
    // Storage unavailable (private mode etc.) — fall back to the default.
  }
  return null;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

// Runs `update` (which must change the theme synchronously) inside a view
// transition: the new theme grows as a circle from the toggle button. Falls
// back to an instant switch where the browser has no View Transitions API or
// the visitor asked for reduced motion. The keyframes' pseudo-elements are
// styled in src/styles/brand.css.
function switchWithReveal(update: () => void, event?: MouseEvent<HTMLElement>) {
  const doc = document as ViewTransitionDocument;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced) {
    update();
    return;
  }

  // Centre on the button itself, so a keyboard press (clientX/Y = 0) still
  // starts from the right place.
  const rect = event?.currentTarget?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : 0;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transition = doc.startViewTransition(update);
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 550, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {
      // Transition skipped (e.g. tab hidden) — the theme has still switched.
    });
}

// Toggles `body.dark-theme`, which the public site's palette (site.css) keys
// off. A visitor's toggle choice is remembered and always wins; until they
// make one, `defaultDark` decides (dark for the site, light for portfolios
// using the classic design).
export function useDarkTheme(defaultDark = true) {
  const [choice, setChoice] = useState(storedChoice);
  const isDark = choice ?? defaultDark;

  // Before paint, so a dark visit never flashes the light palette first.
  useLayoutEffect(() => {
    document.body.classList.toggle("dark-theme", isDark);
  }, [isDark]);

  // Pass the click event so the reveal starts from the button.
  function toggle(event?: MouseEvent<HTMLElement>) {
    const next = !isDark;
    // flushSync runs the layout effects (body class here, data-bs-theme in
    // useAdminTheme) before the view transition takes its "after" snapshot.
    switchWithReveal(() => flushSync(() => setChoice(next)), event);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Not persisted — the toggle still applies for this visit.
    }
  }

  return { isDark, toggle };
}
