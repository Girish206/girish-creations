import type { FormEvent, ReactNode } from "react";

export interface FormCardProps {
  title: string;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
  banner?: ReactNode;
}

// The .card.admin-form-card wrapper + .admin-page-header used by every admin
// create/edit form. Fields are DMS's own InputComp/TextareaInput/SelectInput,
// which are fully self-styled, so no extra wrapper class is needed around
// the <form> itself.
export function FormCard({ title, onSubmit, children, banner }: FormCardProps) {
  return (
    <div className="card admin-form-card">
      <div className="admin-card-body">
        <div className="admin-page-header">
          <h1>{title}</h1>
        </div>
        {banner}
        <form onSubmit={onSubmit} noValidate>
          {children}
        </form>
      </div>
    </div>
  );
}
