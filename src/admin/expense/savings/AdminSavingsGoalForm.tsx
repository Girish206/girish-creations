import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSavingsGoals, useCreateSavingsGoal, useUpdateSavingsGoal } from "../../../api/hooks/expense/useSavingsGoals";
import { useExpenseMembers } from "../../../api/hooks/expense/useExpenseMembers";
import { useCreateAdminUser } from "../../../api/hooks/expense/useAdminUsers";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";
import SelectInput from "../../dms/components/SelectInput";
import { INVALID_AMOUNT_MESSAGE, isValidAmount } from "../currency";
import "../../admin.css";
import { memberLabel } from "../memberLabel";

const schema = z.object({
  name: z.string().trim().min(1, "Required"),
  hasTarget: z.boolean(),
  targetAmount: z.string().optional(),
  targetDate: z.string().optional(),
  bankName: z.string().optional(),
  // A number is an existing person. A non-empty string is a new name typed
  // into the picker, added as a guest on save. "" = nobody.
  accountHolderAdminUserId: z.union([z.number(), z.string()]).optional(),
  restrictMembers: z.boolean(),
  memberAdminUserIds: z.array(z.union([z.number(), z.string()])),
  kind: z.enum(["savings", "fund"]),
}).refine((values) => !values.hasTarget || isValidAmount(values.targetAmount), {
  path: ["targetAmount"],
  message: INVALID_AMOUNT_MESSAGE,
});

type FormValues = z.infer<typeof schema>;
type PersonRef = number | string;

// The goal's owner always has access, so they're always in the list (first).
function withOwnerFirst<T extends PersonRef>(ids: T[], ownerId: number | null): T[] {
  if (ownerId === null) return ids;
  return [ownerId as T, ...ids.filter((memberId) => memberId !== ownerId)];
}

function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export interface AdminSavingsGoalFormProps {
  id?: number;
  onSaved: () => void;
}

// A goal can either target a specific amount (progress bar in the list) or
// be open-ended — e.g. "just saving ₹5000/month, no fixed total" — in
// which case it just tracks a running sum of contributions.
export function AdminSavingsGoalForm({ id, onSaved }: AdminSavingsGoalFormProps) {
  const isEdit = id !== undefined;
  const { data: items } = useSavingsGoals();
  const { data: members } = useExpenseMembers();
  const { admin } = useAdminAuth();
  const existing = isEdit ? items?.find((item) => item.id === id) : undefined;
  // Owner: whoever created the goal, or the logged-in account for a new one.
  // Legacy goals have no recorded creator, so nobody is locked in for them.
  const ownerId = isEdit ? (existing?.createdBy?.id ?? null) : admin?.sub ? Number(admin.sub) : null;
  // A goal from before owners were recorded is visible to everyone until
  // it's shared with specific people.
  const isLegacy = isEdit && !existing?.createdBy;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const hasTarget = useWatch({ control, name: "hasTarget" });
  const restrictMembers = useWatch({ control, name: "restrictMembers" });
  const memberAdminUserIds = useWatch({ control, name: "memberAdminUserIds" }) ?? [];
  const kind = useWatch({ control, name: "kind" }) ?? "savings";
  const isFund = kind === "fund";

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        kind: existing.kind === "fund" ? "fund" : "savings",
        hasTarget: existing.targetAmount !== null,
        targetAmount: existing.targetAmount ?? "",
        targetDate: toDateInputValue(existing.targetDate),
        bankName: existing.bankName ?? "",
        accountHolderAdminUserId: existing.accountHolderAdminUserId ?? "",
        restrictMembers: existing.members.length > 0,
        memberAdminUserIds:
          existing.members.length > 0
            ? withOwnerFirst(
                existing.members.map((m) => m.adminUserId),
                existing.createdBy?.id ?? null,
              )
            : [],
      });
    } else {
      reset({
        name: "",
        kind: "savings",
        hasTarget: true,
        targetAmount: "",
        targetDate: "",
        bankName: "",
        accountHolderAdminUserId: "",
        restrictMembers: false,
        memberAdminUserIds: [],
      });
    }
  }, [existing, reset]);

  const createGoal = useCreateSavingsGoal();
  const updateGoal = useUpdateSavingsGoal();
  const createPerson = useCreateAdminUser();

  async function onSubmit(values: FormValues) {
    // Names typed into the pickers become guests (no login) first. The same
    // name in both pickers is one person.
    const created = new Map<string, number>();
    const resolvePerson = async (ref: PersonRef): Promise<number> => {
      if (typeof ref === "number") return ref;
      const name = ref.trim();
      const key = name.toLowerCase();
      if (!created.has(key)) {
        const person = await createPerson.mutateAsync({
          name,
          grantLogin: false,
          hasPortfolioAccess: false,
          hasExpensesAccess: false,
          hasSavingsAccess: false,
        });
        created.set(key, person.id);
      }
      return created.get(key)!;
    };

    const holder = values.accountHolderAdminUserId;
    const accountHolderAdminUserId =
      holder === undefined || (typeof holder === "string" && holder.trim() === "") ? null : await resolvePerson(holder);
    const memberIds: number[] = [];
    if (values.restrictMembers) {
      for (const ref of values.memberAdminUserIds) {
        if (typeof ref === "string" && ref.trim() === "") continue;
        memberIds.push(await resolvePerson(ref));
      }
    }

    const input = {
      name: values.name,
      targetAmount: values.hasTarget ? values.targetAmount || null : null,
      targetDate: values.targetDate || null,
      bankName: values.bankName || null,
      accountHolderAdminUserId,
      memberAdminUserIds: values.restrictMembers ? withOwnerFirst(Array.from(new Set(memberIds)), ownerId) : [],
      kind: values.kind,
    };
    if (isEdit && existing) {
      await updateGoal.mutateAsync({ id: existing.id, input });
    } else {
      await createGoal.mutateAsync(input);
    }
    onSaved();
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  const memberOptions = (members ?? []).map((m) => ({ value: m.id, label: memberLabel(m) }));
  const sharedOptions = (members ?? []).map((m) => ({
    value: m.id,
    label: `${memberLabel(m)}${m.id === ownerId ? " (owner)" : ""}`,
  }));
  const setVisibility = (restricted: boolean) => {
    setValue("restrictMembers", restricted);
    if (restricted) {
      setValue("memberAdminUserIds", withOwnerFirst(getValues("memberAdminUserIds") ?? [], ownerId));
    }
  };

  // A shared fund is for a group of people: no fixed target to start with,
  // and shared with the people chosen.
  const setKind = (next: "savings" | "fund") => {
    setValue("kind", next);
    if (next === "fund" && !isEdit) {
      setValue("hasTarget", false);
      setVisibility(true);
    }
  };

  // A fund that's been spent from has to stay a fund: as savings, those
  // expenses would turn into "everyone owes the payer" in its trip.
  const wasFund = existing?.kind === "fund";
  const fundLocked = wasFund && Number(existing?.spentAmount ?? 0) > 0;
  const droppingFund = wasFund && !isFund;

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <div className="admin-exp-form">
        {fundLocked ? (
          <p className="admin-form-hint m-0">
            <i className="fa-solid fa-people-group" aria-hidden="true"></i> Shared fund. Money has been spent from it, so
            it stays one. Close it when the trip's done.
          </p>
        ) : (
        <div>
          <div className="admin-segmented admin-exp-seg" role="radiogroup" aria-label="Type">
            <button
              type="button"
              role="radio"
              aria-checked={!isFund}
              className={!isFund ? "active" : ""}
              onClick={() => setKind("savings")}
            >
              <i className="fa-solid fa-piggy-bank" aria-hidden="true"></i> Savings
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={isFund}
              className={isFund ? "active" : ""}
              onClick={() => setKind("fund")}
            >
              <i className="fa-solid fa-people-group" aria-hidden="true"></i> Shared fund
            </button>
          </div>
          {droppingFund ? (
            <p className="admin-form-hint m-0 mt-1 text-danger-brand" role="status">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Its trip group
              {existing?.name ? ` ${existing.name}` : ""} will be deleted. Only possible while the trip has no expenses
              or repayments.
            </p>
          ) : (
            <p className="admin-form-hint m-0 mt-1">
              {isFund
                ? "Collect money from everyone, pay expenses from it, and split what's left at the end."
                : "Money put aside toward a goal."}
            </p>
          )}
        </div>
        )}

        <Controller
          name="name"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <InputComp
              label={isFund ? "Name" : "Goal name"}
              inputSize="sm"
              placeholder={isFund ? "e.g. Bandihole Trip" : "e.g. New laptop"}
              required
              autoFocus={!isEdit}
              {...field}
              error={errors.name?.message}
            />
          )}
        />

        {/* Target: a switch, and the amount (big, like an expense's) when on. */}
        <div className={`admin-exp-split${hasTarget ? " open" : ""}`}>
          <div className="admin-exp-split-head">
            <Controller
              name="hasTarget"
              control={control}
              render={({ field }) => (
                <label className="admin-exp-switch">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={field.value ?? true}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  <span className="admin-exp-switch-track" aria-hidden="true"></span>
                  <span>{isFund ? "Fixed amount to collect" : "Fixed target amount"}</span>
                </label>
              )}
            />
          </div>
          {hasTarget && (
            <div className="admin-exp-split-body">
              <Controller
                name="targetAmount"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <label className={`admin-exp-amount${errors.targetAmount ? " has-error" : ""}`}>
                    <span aria-hidden="true">₹</span>
                    <input
                      {...field}
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0"
                      aria-label="Target amount"
                      autoComplete="off"
                    />
                  </label>
                )}
              />
              {errors.targetAmount && <small className="admin-exp-error m-0">{errors.targetAmount.message}</small>}
            </div>
          )}
        </div>

        <div className="admin-exp-row">
          <Controller
            name="targetDate"
            control={control}
            defaultValue=""
            render={({ field }) => <InputComp label="Target date" inputSize="sm" type="date" {...field} />}
          />
          <Controller
            name="bankName"
            control={control}
            defaultValue=""
            render={({ field }) => <InputComp label="Bank" inputSize="sm" placeholder="Optional" {...field} />}
          />
        </div>

        <Controller
          name="accountHolderAdminUserId"
          control={control}
          render={({ field }) => (
            <SelectInput
              label={isFund ? "Kept by" : "Account holder"}
              size="sm"
              creatable
              placeholder="Pick or type a name"
              options={memberOptions}
              value={field.value}
              onChange={(value) => field.onChange(value === "" ? "" : value)}
            />
          )}
        />

        <div className="admin-exp-paidfrom">
          <span className="admin-exp-paidfrom-label">Who can see</span>
          <div className="admin-segmented" role="radiogroup" aria-label="Who can see this goal">
            <button
              type="button"
              role="radio"
              aria-checked={!restrictMembers}
              className={!restrictMembers ? "active" : ""}
              onClick={() => setVisibility(false)}
            >
              <i className="fa-solid fa-user-lock" aria-hidden="true"></i> {isLegacy ? "Everyone" : "Private"}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={restrictMembers}
              className={restrictMembers ? "active" : ""}
              onClick={() => setVisibility(true)}
            >
              <i className="fa-solid fa-users" aria-hidden="true"></i> Selected people
            </button>
          </div>
        </div>

        {restrictMembers && (
          <Controller
            name="memberAdminUserIds"
            control={control}
            render={({ field }) => (
              /* Removing the owner's chip just puts it straight back. */
              <SelectInput
                label="Shared with"
                size="sm"
                isMulti
                creatable
                clearable={false}
                placeholder="Pick or type names…"
                options={sharedOptions}
                value={field.value}
                onChange={(ids: PersonRef[]) => field.onChange(withOwnerFirst(ids, ownerId))}
              />
            )}
          />
        )}
        <p className="admin-form-hint m-0">
          <i className="fa-solid fa-eye" aria-hidden="true"></i>{" "}
          {restrictMembers
            ? memberAdminUserIds.length <= 1
              ? "Only the owner and the account holder can see this goal. Add people to share it with them."
              : `Shared with ${memberAdminUserIds.length} people, plus the account holder if there is one.`
            : isLegacy
              ? "Visible to everyone with Savings access."
              : "Only the owner and the account holder can see this goal."}
        </p>
      </div>

      <SubmitButton loading={isSubmitting}>{isEdit ? "Save" : isFund ? "Create fund" : "Create goal"}</SubmitButton>
    </ModalForm>
  );
}
