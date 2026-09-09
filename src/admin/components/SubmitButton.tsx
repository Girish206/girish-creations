import type { ButtonHTMLAttributes } from "react";
import CustomButton from "../dms/components/CustomButton";

export interface SubmitButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  loading?: boolean;
  loadingLabel?: string;
}

// The full-width form-submit button — used at the bottom of every admin
// form, rendered through the ported DMS CustomButton so it picks up the
// theme's --primary color automatically.
export function SubmitButton({
  loading = false,
  loadingLabel = "Saving...",
  children,
  className = "",
  disabled,
  ...rest
}: SubmitButtonProps) {
  return (
    <CustomButton
      type="submit"
      className={`w-100 ${className}`.trim()}
      disabled={disabled}
      loading={loading}
      loadingLabel={loadingLabel}
      {...rest}
    >
      {children}
    </CustomButton>
  );
}
