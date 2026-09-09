import { useEffect } from "react";
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

const schema = z
  .object({
    name: z.string().min(1, "Required"),
    wantsLogin: z.boolean(),
    email: z.string().optional(),
    password: z.string().optional(),
    isActive: z.boolean(),
    hasPortfolioAccess: z.boolean(),
    hasExpensesAccess: z.boolean(),
    hasInvestmentsAccess: z.boolean(),
    hasSavingsAccess: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!values.wantsLogin) return;
    if (!values.email || !z.string().email().safeParse(values.email).success) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Valid email required for login access" });
    }
    if (values.password && values.password.length < 8) {
      ctx.addIssue({ code: "custom", path: ["password"], message: "Must be at least 8 characters" });
    }
  });

type FormValues = z.infer<typeof schema>;

export interface AdminAccountFormProps {
  id?: number;
  onSaved: () => void;
}

const ACCESS_CHECKBOXES = [
  { name: "hasPortfolioAccess" as const, label: "Portfolio module access" },
  { name: "hasExpensesAccess" as const, label: "Expenses access" },
  { name: "hasInvestmentsAccess" as const, label: "Investments access" },
  { name: "hasSavingsAccess" as const, label: "Savings access" },
];

// Rendered inside a DefaultModal by AdminAccountsList. A member can be added
// as a "guest" — just a name, no email/password — purely so they show up in
// expense-split and savings-account-holder pickers. Checking "Grant login
// access" reveals email/password to turn them into a real account; once an
// account already has login, its email is locked (it's the login
// identifier) but the password can still be rotated (leave blank to keep).
export function AdminAccountForm({ id, onSaved }: AdminAccountFormProps) {
  const isEdit = id !== undefined;
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
  const alreadyHasLogin = Boolean(existing?.hasLogin);

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name ?? "",
        wantsLogin: existing.hasLogin,
        email: existing.email ?? "",
        password: "",
        isActive: existing.isActive,
        hasPortfolioAccess: existing.hasPortfolioAccess,
        hasExpensesAccess: existing.hasExpensesAccess,
        hasInvestmentsAccess: existing.hasInvestmentsAccess,
        hasSavingsAccess: existing.hasSavingsAccess,
      });
    } else {
      reset({
        name: "",
        wantsLogin: false,
        email: "",
        password: "",
        isActive: true,
        hasPortfolioAccess: false,
        hasExpensesAccess: false,
        hasInvestmentsAccess: false,
        hasSavingsAccess: false,
      });
    }
  }, [existing, reset]);

  const createAccount = useCreateAdminUser();
  const updateAccount = useUpdateAdminUser();

  async function onSubmit(values: FormValues) {
    // Password is only truly required the first time login access is
    // granted (create-with-login, or granting it to an existing guest);
    // once an account has login, resubmitting with a blank password just
    // keeps the current one.
    const grantingLoginNow = values.wantsLogin && !alreadyHasLogin;
    if (grantingLoginNow && !values.password) {
      setError("password", { message: "Required" });
      return;
    }

    const accessFlags = {
      hasPortfolioAccess: values.hasPortfolioAccess,
      hasExpensesAccess: values.hasExpensesAccess,
      hasInvestmentsAccess: values.hasInvestmentsAccess,
      hasSavingsAccess: values.hasSavingsAccess,
    };

    if (isEdit && existing) {
      await updateAccount.mutateAsync({
        id: existing.id,
        input: {
          name: values.name || null,
          // Email only changes here when we're granting login for the
          // first time — an already-login account keeps its email fixed.
          email: !alreadyHasLogin && values.wantsLogin ? values.email : undefined,
          password: values.password || undefined,
          isActive: values.isActive,
          ...accessFlags,
        },
      });
    } else {
      await createAccount.mutateAsync({
        email: values.wantsLogin ? values.email || null : null,
        password: values.wantsLogin ? values.password || null : null,
        name: values.name || null,
        ...accessFlags,
      });
    }
    onSaved();
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
              Grant login access (email &amp; password)
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

      {wantsLogin && (
        <>
          <Controller
            name="email"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <InputComp
                label="Email"
                required
                readOnly={alreadyHasLogin}
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
                type="password"
                required={!alreadyHasLogin}
                {...field}
                error={errors.password?.message}
              />
            )}
          />
        </>
      )}

      <div className="mb-3 d-flex flex-column gap-2">
        {ACCESS_CHECKBOXES.map((checkbox) => (
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

      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
