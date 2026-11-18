import type { ReactNode } from "react";
import "./SearchBox.css";

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // Read by screen readers; defaults to the placeholder.
  label?: string;
  // Layout class from the page (width, flex), not styling.
  className?: string;
  // Small text inside the box on the right, e.g. a "3/12" count.
  trailing?: ReactNode;
}

// The one search box used across the admin: a small pill with a magnifying
// glass that turns the theme colour while the box is focused.
export function SearchBox({ value, onChange, placeholder = "Search…", label, className = "", trailing }: SearchBoxProps) {
  return (
    <label className={`search-box${trailing != null ? " has-trailing" : ""} ${className}`}>
      <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
      <input
        type="search"
        className="form-control shadow-none"
        placeholder={placeholder}
        aria-label={label ?? placeholder.replace(/…$/, "")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {trailing != null && (
        <span className="search-box-trailing" aria-hidden="true">
          {trailing}
        </span>
      )}
    </label>
  );
}
