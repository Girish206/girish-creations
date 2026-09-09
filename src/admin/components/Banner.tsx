import type { ReactNode } from "react";

export interface BannerProps {
  variant: "success" | "error";
  children: ReactNode;
}

export function Banner({ variant, children }: BannerProps) {
  return <div className={`admin-banner admin-banner-${variant}`}>{children}</div>;
}
