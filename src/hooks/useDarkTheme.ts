import { useEffect, useState } from "react";

// Port of static/assets/js/script.js's "Theme color control js" block.
export function useDarkTheme() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem("darkMode") === "true");

  useEffect(() => {
    document.body.classList.toggle("dark-theme", isDark);
  }, [isDark]);

  function toggle() {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("darkMode", String(next));
      return next;
    });
  }

  return { isDark, toggle };
}
