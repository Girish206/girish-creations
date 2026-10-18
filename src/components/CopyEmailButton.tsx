import { useState } from "react";
import { FaCheck, FaRegCopy } from "react-icons/fa6";

export function CopyEmailButton({ email, className = "gc-btn gc-btn-ghost" }: { email: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — fall back to
      // opening the visitor's mail client instead of failing silently.
      window.location.href = `mailto:${email}`;
    }
  }

  return (
    <button type="button" className={className} onClick={handleClick} aria-live="polite">
      {copied ? <FaCheck /> : <FaRegCopy />}
      {copied ? "Copied!" : "Copy email"}
    </button>
  );
}
