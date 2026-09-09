import { useState } from "react";

export function CopyEmailButton({ email }: { email: string }) {
  const [active, setActive] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — fail silently, matching
      // the original clipboard.js button which had no error UI either.
    }
    setActive(true);
    setTimeout(() => setActive(false), 1000);
  }

  return (
    <button type="button" className={`btn btn-copy${active ? " active" : ""}`} onClick={handleClick}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10.6667 6H7.33333C6.59695 6 6 6.59695 6 7.33333V10.6667C6 11.403 6.59695 12 7.33333 12H10.6667C11.403 12 12 11.403 12 10.6667V7.33333C12 6.59695 11.403 6 10.6667 6Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3.33333 10H2.66667C2.31305 10 1.97391 9.85952 1.72386 9.60948C1.47381 9.35943 1.33333 9.02029 1.33333 8.66667V2.66667C1.33333 2.31305 1.47381 1.97391 1.72386 1.72386C1.97391 1.47381 2.31305 1.33333 2.66667 1.33333H8.66667C9.02029 1.33333 9.35943 1.47381 9.60948 1.72386C9.85952 1.97391 10 2.31305 10 2.66667V3.33333"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Copy Email
    </button>
  );
}
