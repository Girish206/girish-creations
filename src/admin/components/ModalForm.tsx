import type { FormEvent, ReactNode } from "react";

export interface ModalFormProps {
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
}

// Bare <form> used inside a DefaultModal — the modal chrome + title already
// provide the framing, and DMS's own InputComp/TextareaInput/SelectInput
// fields are fully self-styled, so no extra wrapper class is needed.
export function ModalForm({ onSubmit, children }: ModalFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
      {children}
    </form>
  );
}
