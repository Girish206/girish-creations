import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAdminUsers,
  type AccountScope,
  useCreateAdminUser,
  useUpdateAdminUser,
} from "../../../api/hooks/expense/useAdminUsers";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";
import { toast } from "sonner";
import { messageFor } from "../../../api/mutationErrors";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { normalizeMobile } from "../../../utils/mobile";
import "../../admin.css";
import "./accountForm.css";

const schema = z
  .object({
    name: z.string().min(1, "Required"),
    wantsLogin: z.boolean(),
    email: z.string().optional(),
    mobile: z.string().optional(),
    password: z.string().optional(),
    removeLogin: z.boolean(),
    isActive: z.boolean(),
    hasPortfolioAccess: z.boolean(),
    hasExpensesAccess: z.boolean(),
    hasSavingsAccess: z.boolean(),
    isSuperAdmin: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.mobile && !normalizeMobile(values.mobile)) {
      ctx.addIssue({ code: "custom", path: ["mobile"], message: "Enter a valid 10-digit mobile number" });
    }
    if (!values.wantsLogin || values.removeLogin) return;
    if (values.email && !z.string().email().safeParse(values.email).success) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Enter a valid email" });
    }
    if (!values.email && !values.mobile) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "An email or a mobile number is needed to sign in" });
    }
    if (values.password && values.password.length < 8) {
      ctx.addIssue({ code: "custom", path: ["password"], message: "Must be at least 8 characters" });
    }
  });

type FormValues = z.infer<typeof schema>;

export interface AdminAccountFormProps {
  id?: number;
  // Opened from a guest's "Grant login" action: start with login ticked.
  startWithLogin?: boolean;
  // Adding from the Money Hub: portfolio and super admin access stay as they
  // are, and are managed from Admin Accounts on the portfolio side. Adding from
  // there starts with portfolio access ticked.
  scope?: AccountScope;
  onSaved: () => void;
}

const ACCESS_CHECKBOXES = [
  { name: "hasPortfolioAccess" as const, label: "Portfolio", icon: "fa-briefcase" },
  { name: "hasExpensesAccess" as const, label: "Expenses", icon: "fa-receipt" },
  { name: "hasSavingsAccess" as const, label: "Savings", icon: "fa-piggy-bank" },
];

// Rendered inside a DefaultModal by AdminAccountsList. A member can be added
// as a "guest" — just a name, no email/password — purely so they show up in
// expense-split and savings-account-holder pickers. Checking "Grant login
// access" reveals email/password to turn them into a real account; once an
// account already has login, its email is locked (it's the login
// identifier) but the password can still be rotated (leave blank to keep).
export function AdminAccountForm({ id, startWithLogin = false, scope, onSaved }: AdminAccountFormProps) {
  const isEdit = id !== undefined;
  const { admin } = useAdminAuth();
  // Only the owner hands out super admin (the server enforces it too).
  const canSetSuperAdmin = Boolean(admin?.isOwner);
  // Members without super admin add people for the Money Hub only: no
  // portfolio access, and at most the access they have themselves.
  const moneyHubOnly = scope === "money-hub";
  const accessCheckboxes = admin?.isSuperAdmin && !moneyHubOnly
    ? ACCESS_CHECKBOXES
    : ACCESS_CHECKBOXES.filter(
        (checkbox) =>
          (checkbox.name === "hasExpensesAccess" && admin?.hasExpensesAccess) ||
          (checkbox.name === "hasSavingsAccess" && admin?.hasSavingsAccess),
      );
  const { data: items } = useAdminUsers(scope);
  const existing = isEdit ? items?.find((item) => item.id === id) : undefined;

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const wantsLogin = useWatch({ control, name: "wantsLogin" });
  const removeLogin = useWatch({ control, name: "removeLogin" });
  const [showPassword, setShowPassword] = useState(false);
  // The server's reason a save failed (e.g. the email is taken by a
  // deactivated account), shown in the form as well as the toast.
  const [saveError, setSaveError] = useState("");
  const alreadyHasLogin = Boolean(existing?.hasLogin);
  // Once someone signs in on their own, how they sign in is theirs: whoever
  // added them can't change it any more (the server enforces this too).
  const signInLocked =
    isEdit && alreadyHasLogin && !admin?.isSuperAdmin && existing?.id !== Number(admin?.sub);
  // The server spots someone who already has an account, who keeps their
  // password if this is left blank. It asks for one if they turn out to be new.
  const passwordOptional = alreadyHasLogin || !isEdit;

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name ?? "",
        wantsLogin: existing.hasLogin || startWithLogin,
        email: existing.email ?? "",
        mobile: existing.mobile ?? "",
        password: "",
        removeLogin: false,
        isActive: existing.isActive,
        hasPortfolioAccess: existing.hasPortfolioAccess,
        hasExpensesAccess: existing.hasExpensesAccess,
        hasSavingsAccess: existing.hasSavingsAccess,
        isSuperAdmin: existing.isSuperAdmin,
      });
    } else {
      reset({
        name: "",
        wantsLogin: startWithLogin,
        email: "",
        mobile: "",
        password: "",
        removeLogin: false,
        isActive: true,
        hasPortfolioAccess: scope === "portfolio",
        hasExpensesAccess: false,
        hasSavingsAccess: false,
        isSuperAdmin: false,
      });
    }
  }, [existing, startWithLogin, scope, reset]);

  const createAccount = useCreateAdminUser();
  const updateAccount = useUpdateAdminUser();

  async function onSubmit(values: FormValues) {
    // Password is only truly required the first time login access is
    // granted (create-with-login, or granting it to an existing guest);
    // once an account has login, resubmitting with a blank password just
    // keeps the current one.
    const grantingLoginNow = values.wantsLogin && !alreadyHasLogin;
    // A guest's email may already be stored (login was removed earlier).
    if (grantingLoginNow && !values.password && !passwordOptional) {
      setError("password", { message: "Required" });
      return;
    }

    // A login with neither gives them nothing here, and they'd drop off People.
    if (
      moneyHubOnly &&
      values.wantsLogin &&
      !values.removeLogin &&
      !values.hasExpensesAccess &&
      !values.hasSavingsAccess
    ) {
      setSaveError("Give them Expenses or Savings access so they can use Pocket, or untick login access.");
      return;
    }

    // They wouldn't show up in the list they're being added from.
    if (scope === "portfolio" && !isEdit && !values.hasPortfolioAccess) {
      setSaveError("Tick Portfolio module access to add them here, or add them from People in Pocket.");
      return;
    }

    setSaveError("");
    try {
      await save(values);
      onSaved();
    } catch (error) {
      setSaveError(messageFor(error));
    }
  }

  async function save(values: FormValues) {
    const accessFlags = {
      hasPortfolioAccess: values.hasPortfolioAccess,
      hasExpensesAccess: values.hasExpensesAccess,
      hasSavingsAccess: values.hasSavingsAccess,
      // A guest can't sign in, so super admin only applies with login.
      ...(canSetSuperAdmin && !existing?.isOwner
        ? { isSuperAdmin: values.wantsLogin && !values.removeLogin && values.isSuperAdmin }
        : {}),
    };

    if (isEdit && existing) {
      await updateAccount.mutateAsync({
        id: existing.id,
        input: {
          name: values.name || null,
          // Email is fixed once it's someone's sign-in; until then (a guest,
          // or an account signing in by mobile) it can be set.
          email: !existing.email && values.wantsLogin && values.email ? values.email : undefined,
          mobile: values.mobile ? normalizeMobile(values.mobile) : null,
          password: values.removeLogin ? undefined : values.password || undefined,
          removeLogin: values.removeLogin || undefined,
          isActive: values.isActive,
          ...accessFlags,
        },
      });
    } else {
      const saved = await createAccount.mutateAsync({
        email: values.wantsLogin ? values.email || null : null,
        mobile: values.mobile ? normalizeMobile(values.mobile) : null,
        password: values.wantsLogin ? values.password || null : null,
        grantLogin: values.wantsLogin,
        name: values.name || null,
        ...accessFlags,
      });
      if (saved.addedToExisting) {
        toast.success(`${saved.name || saved.email || saved.mobile} already had an account, so it was updated.`);
      }
    }
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  const showSuperAdmin = Boolean(admin?.isSuperAdmin) && !moneyHubOnly && wantsLogin && !removeLogin;

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <div className="acct-form-pair">
        <Controller
          name="name"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <InputComp
              inputSize="sm"
              placeholder="Name *"
              aria-label="Name"
              autoFocus={!isEdit}
              {...field}
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          name="mobile"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <InputComp
              inputSize="sm"
              placeholder="Mobile (optional)"
              aria-label="Mobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              readOnly={signInLocked}
              {...field}
              error={errors.mobile?.message}
            />
          )}
        />
      </div>

      <div className="acct-form-section">
        <Controller
          name="wantsLogin"
          control={control}
          render={({ field }) => (
            <Switch
              label="Can sign in"
              checked={field.value ?? false}
              disabled={alreadyHasLogin}
              onChange={field.onChange}
            />
          )}
        />
        {alreadyHasLogin && !existing?.isOwner && !signInLocked && (
          <Controller
            name="removeLogin"
            control={control}
            render={({ field }) => (
              <Switch label="Remove login" checked={field.value ?? false} onChange={field.onChange} />
            )}
          />
        )}
      </div>
      <p className="acct-form-hint">
        {signInLocked
          ? "They sign in on their own now, so only they or a super admin can change their password, email or mobile."
          : !wantsLogin
            ? "Without sign-in they're still listed in split and savings pickers. You can give login later."
            : removeLogin
              ? "They'll stay as a guest in the pickers."
              : alreadyHasLogin
                ? "Signs in with email or mobile. Leave the password blank to keep theirs."
                : passwordOptional
                  ? "Signs in with email or mobile. Leave the password blank if they already have an account."
                  : "Signs in with email or mobile, and a password."}
      </p>

      {wantsLogin && !removeLogin && (
        <div className="acct-form-pair">
          <Controller
            name="email"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <InputComp
                inputSize="sm"
                placeholder="Email"
                aria-label="Email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                readOnly={signInLocked || (alreadyHasLogin && Boolean(existing?.email))}
                {...field}
                error={errors.email?.message}
              />
            )}
          />
          {!signInLocked && (
            <Controller
              name="password"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <InputComp
                  inputSize="sm"
                  placeholder={alreadyHasLogin ? "New password" : passwordOptional ? "Password (optional)" : "Password *"}
                  aria-label="Password"
                  type={showPassword ? "text" : "password"}
                  icon={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                  iconOnClick={() => setShowPassword((shown) => !shown)}
                  autoCapitalize="none"
                  spellCheck={false}
                  required={!passwordOptional}
                  {...field}
                  error={errors.password?.message}
                />
              )}
            />
          )}
        </div>
      )}

      {accessCheckboxes.length > 0 && (
        <div className="acct-form-access">
          <span className="acct-form-label">Access</span>
          <div className="acct-form-chips">
            {accessCheckboxes.map((checkbox) => (
              <Controller
                key={checkbox.name}
                name={checkbox.name}
                control={control}
                render={({ field }) => (
                  <label className={`acct-form-chip${field.value ? " is-on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <i className={`fa-solid ${checkbox.icon}`} aria-hidden="true"></i>
                    {checkbox.label}
                  </label>
                )}
              />
            ))}
          </div>
        </div>
      )}

      {(showSuperAdmin || isEdit) && (
        <div className="acct-form-section">
          {showSuperAdmin && (
            <Controller
              name="isSuperAdmin"
              control={control}
              render={({ field }) => (
                <Switch
                  label="Super admin"
                  title={
                    "Sees every user's data and manages accounts" +
                    (canSetSuperAdmin ? "" : " (only the owner can change this)")
                  }
                  checked={field.value ?? false}
                  disabled={!canSetSuperAdmin || existing?.isOwner}
                  onChange={field.onChange}
                />
              )}
            />
          )}
          {isEdit && (
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  label="Active"
                  title="Turning this off blocks sign-in"
                  checked={field.value ?? false}
                  disabled={existing?.isOwner}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </div>
      )}

      {saveError && (
        <div className="admin-banner admin-banner-error mb-2" role="alert">
          <i className="fa-solid fa-circle-exclamation me-2" aria-hidden="true"></i>
          {saveError}
        </div>
      )}

      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}

// A small on/off switch (the expense form's style) in place of a checkbox.
function Switch({
  label,
  title,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  title?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`admin-exp-switch acct-form-switch${disabled ? " is-disabled" : ""}`} title={title}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="admin-exp-switch-track" aria-hidden="true"></span>
      <span>{label}</span>
    </label>
  );
}
