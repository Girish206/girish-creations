import type { ReactNode } from "react";
import "./DetailView.css";

export interface DetailField {
  label: string;
  // Skipped entirely when null/undefined/"" — callers don't need to filter
  // optional fields themselves before passing them in.
  value: ReactNode;
}

export interface DetailViewProps {
  fields: DetailField[];
}

// Read-only "View" modal content — every field of a record, full text, no
// truncation. Rendered inside a DefaultModal by a list page's RowActions
// "eye" button, as the counterpart to the card/row summary which clamps
// long text (description, content) to keep the list scannable.
export function DetailView({ fields }: DetailViewProps) {
  const visible = fields.filter((f) => f.value !== null && f.value !== undefined && f.value !== "");
  return (
    <div className="admin-detail-view">
      {visible.map((field) => (
        <div className="admin-detail-row" key={field.label}>
          <span className="admin-detail-label">{field.label}</span>
          <div className="admin-detail-value">{field.value}</div>
        </div>
      ))}
    </div>
  );
}
