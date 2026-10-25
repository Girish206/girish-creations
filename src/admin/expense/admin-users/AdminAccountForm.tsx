import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
} from "../../../api/hooks/expense/useAdminUsers";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";
import { messageFor } from "../../../api/mutationErrors";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { normalizeMobile } from "../../../utils/mobile";

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
  onSaved: () => void;
}

const ACCESS_CHECKBOXES = [
  { name: "hasPortfolioAccess" as const, label: "Portfolio module access" },
  { name: "hasExpensesAccess" as const, label: "Expenses access" },
  { name: "hasSavingsAccess" as const, label: "Savings access" },
];

// Rendered inside a DefaultModal by AdminAccountsList. A member can be added
// as a "guest" — just a name, no email/password — purely so they show up in
// expense-split and savings-account-holder pickers. Checking "Grant login
// access" reveals email/password to turn them into a real account; once an
// account already has login, its email is locked (it's the login
// identifier) but the password can still be rotated (leave blank to keep).
export function AdminAccountForm({ id, startWithLogin = false, onSaved }: AdminAccountFormProps) {
  const isEdit = id !== undefined;
  const { admin } = useAdminAuth();
  // Only the owner hands out super admin (the server enforces it too).
  const canSetSuperAdmin = Boolean(admin?.isOwner);
  // Members without super admin add people for the Money Hub only: no
  // portfolio access, and at most the access they have themselves.
  const accessCheckboxes = admin?.isSuperAdmin
    ? ACCESS_CHECKBOXES
    : ACCESS_CHECKBOXES.filter(
        (checkbox) =>
          (checkbox.name === "hasExpensesAccess" && admin?.hasExpensesAccess) ||
          (checkbox.name === "hasSavingsAccess" && admin?.hasSavingsAccess),
      );
  const { data: items } = useAdminUsers();
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
        hasPortfolioAccess: false,
        hasExpensesAccess: false,
        hasSavingsAccess: false,
        isSuperAdmin: false,
      });
    }
  }, [existing, startWithLogin, reset]);

  const createAccount = useCreateAdminUser();
  const updateAccount = useUpdateAdminUser();

  async function onSubmit(values: FormValues) {
    // Password is only truly required the first time login access is
    // granted (create-with-login, or granting it to an existing guest);
    // once an account has login, resubmitting with a blank password just
    // keeps the current one.
    const grantingLoginNow = values.wantsLogin && !alreadyHasLogin;
    // A guest's email may already be stored (login was removed earlier).
    if (grantingLoginNow && !values.password) {
      setError("password", { message: "Required" });
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
      await createAccount.mutateAsync({
        email: values.wantsLogin ? values.email || null : null,
        mobile: values.mobile ? normalizeMobile(values.mobile) : null,
        password: values.wantsLogin ? values.password || null : null,
        name: values.name || null,
        ...accessFlags,
      });
    }
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="name"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Name" required {...field} error={errors.name?.message} />}
      />
      <Controller
        name="mobile"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp
            label="Mobile number (optional — can be used to sign in)"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            {...field}
            error={errors.mobile?.message}
          />
        )}
      />

      <Controller
        name="wantsLogin"
        control={control}
        render={({ field }) => (
          <div className="form-check mb-2">
            <input
              type="checkbox"
              className="form-check-input"
              id="wantsLogin"
              checked={field.value ?? false}
              disabled={alreadyHasLogin}
              onChange={(e) => field.onChange(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="wantsLogin">
              Grant login access (email or mobile number, and a password)
            </label>
          </div>
        )}
      />
      {!wantsLogin && (
        <p className="text-muted small mb-3">
          Without login access, this person is still listed in expense-split and savings-account-holder pickers —
          you can grant login access later at any time.
        </p>
      )}

      {alreadyHasLogin && !existing?.isOwner && (
        <Controller
          name="removeLogin"
          control={control}
          render={({ field }) => (
            <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="removeLogin"
                checked={field.value ?? false}
                onChange={(e) => field.onChange(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="removeLogin">
                Remove login access (keep them as a guest in pickers)
              </label>
            </div>
          )}
        />
      )}

      {wantsLogin && !removeLogin && (
        <>
          <Controller
            name="email"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <InputComp
                label="Email (optional if a mobile number is set)"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                readOnly={alreadyHasLogin && Boolean(existing?.email)}
                {...field}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            name="password"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <InputComp
                label={alreadyHasLogin ? "New Password (leave blank to keep current)" : "Password"}
                type={showPassword ? "text" : "password"}
                icon={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                iconOnClick={() => setShowPassword((shown) => !shown)}
                autoCapitalize="none"
                spellCheck={false}
                required={!alreadyHasLogin}
                {...field}
                error={errors.password?.message}
              />
            )}
          />
        </>
      )}

      <div className="mb-3 d-flex flex-column gap-2">
        {accessCheckboxes.map((checkbox) => (
          <Controller
            key={checkbox.name}
            name={checkbox.name}
            control={control}
            render={({ field }) => (
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={checkbox.name}
                  checked={field.value ?? false}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                <label className="form-check-label" htmlFor={checkbox.name}>
                  {checkbox.label}
                </label>
              </div>
            )}
          />
        ))}
        {admin?.isSuperAdmin && wantsLogin && !removeLogin && (
          <Controller
            name="isSuperAdmin"
            control={control}
            render={({ field }) => (
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="isSuperAdmin"
                  checked={field.value ?? false}
                  disabled={!canSetSuperAdmin || existing?.isOwner}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="isSuperAdmin">
                  Super admin — sees every user's data and manages accounts
                  {!canSetSuperAdmin && " (only the owner can change this)"}
                </label>
              </div>
            )}
          />
        )}
        {isEdit && (
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="isActive"
                  checked={field.value ?? false}
                  disabled={existing?.isOwner}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="isActive">
                  Active (unchecking disables sign-in)
                </label>
              </div>
            )}
          />
        )}
      </div>

      {saveError && (
        <div className="admin-banner admin-banner-error mb-3" role="alert">
          <i className="fa-solid fa-circle-exclamation me-2" aria-hidden="true"></i>
          {saveError}
        </div>
      )}

      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
