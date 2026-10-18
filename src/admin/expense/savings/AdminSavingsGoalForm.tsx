import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSavingsGoals, useCreateSavingsGoal, useUpdateSavingsGoal } from "../../../api/hooks/expense/useSavingsGoals";
import { useExpenseMembers } from "../../../api/hooks/expense/useExpenseMembers";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";
import SelectInput from "../../dms/components/SelectInput";
import "../../admin.css";

const schema = z.object({
  name: z.string().min(1, "Required"),
  hasTarget: z.boolean(),
  targetAmount: z.string().optional(),
  targetDate: z.string().optional(),
  bankName: z.string().optional(),
  accountHolderAdminUserId: z.union([z.number(), z.literal("")]).optional(),
  restrictMembers: z.boolean(),
  memberAdminUserIds: z.array(z.number()),
});

type FormValues = z.infer<typeof schema>;

// The goal's owner always has access, so they're always in the list (first).
function withOwnerFirst(ids: number[], ownerId: number | null): number[] {
  if (ownerId === null) return ids;
  return [ownerId, ...ids.filter((memberId) => memberId !== ownerId)];
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

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
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

  async function onSubmit(values: FormValues) {
    const input = {
      name: values.name,
      targetAmount: values.hasTarget ? values.targetAmount || null : null,
      targetDate: values.targetDate || null,
      bankName: values.bankName || null,
      accountHolderAdminUserId: values.accountHolderAdminUserId === "" ? null : values.accountHolderAdminUserId,
      memberAdminUserIds: values.restrictMembers ? withOwnerFirst(values.memberAdminUserIds, ownerId) : [],
    };
    if (isEdit && existing) {
      await updateGoal.mutateAsync({ id: existing.id, input });
    } else {
      await createGoal.mutateAsync(input);
    }
    onSaved();
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  const memberOptions = (members ?? []).map((m) => ({ value: m.id, label: m.name || m.email }));
  const sharedOptions = (members ?? []).map((m) => ({
    value: m.id,
    label: `${m.name || m.email}${m.id === ownerId ? " (owner)" : ""}`,
  }));
  const setVisibility = (restricted: boolean) => {
    setValue("restrictMembers", restricted);
    if (restricted) {
      setValue("memberAdminUserIds", withOwnerFirst(getValues("memberAdminUserIds") ?? [], ownerId));
    }
  };

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="name"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Goal Name" required {...field} error={errors.name?.message} />}
      />

      <Controller
        name="hasTarget"
        control={control}
        render={({ field }) => (
          <div className="form-check mb-3">
            <input
              type="checkbox"
              className="form-check-input"
              id="hasTarget"
              checked={field.value ?? true}
              onChange={(e) => field.onChange(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="hasTarget">
              This goal has a fixed target amount
            </label>
          </div>
        )}
      />

      {hasTarget && (
        <Controller
          name="targetAmount"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <InputComp
              label="Target Amount"
              type="number"
              required
              {...field}
              error={errors.targetAmount?.message}
            />
          )}
        />
      )}

      <Controller
        name="targetDate"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Target Date (optional)" type="date" {...field} />}
      />

      <Controller
        name="bankName"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Bank Name (optional)" {...field} />}
      />

      <Controller
        name="accountHolderAdminUserId"
        control={control}
        render={({ field }) => (
          <SelectInput
            label="Account Holder (optional)"
            placeholder="Not specified"
            options={memberOptions}
            value={field.value}
            onChange={(value) => field.onChange(value === "" ? "" : value)}
          />
        )}
      />

      <div className="mb-3 m-1">
        <span className="select-label ps-1 d-block mb-1">Who can see this goal</span>
        <div className="admin-segmented" role="radiogroup" aria-label="Who can see this goal">
          <button
            type="button"
            role="radio"
            aria-checked={!restrictMembers}
            className={!restrictMembers ? "active" : ""}
            onClick={() => setVisibility(false)}
          >
            <i className="fa-solid fa-users" aria-hidden="true"></i> Everyone
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={restrictMembers}
            className={restrictMembers ? "active" : ""}
            onClick={() => setVisibility(true)}
          >
            <i className="fa-solid fa-user-lock" aria-hidden="true"></i> Only selected people
          </button>
        </div>
        <small className="text-muted d-block mt-2 ps-1">
          {restrictMembers
            ? memberAdminUserIds.length <= 1
              ? "Only you can see this goal. Add people to share it with them."
              : `Shared with ${memberAdminUserIds.length} people, including you.`
            : "Visible to everyone with Savings access."}
        </small>
      </div>

      {restrictMembers && (
        <Controller
          name="memberAdminUserIds"
          control={control}
          render={({ field }) => (
            /* Removing the owner's chip just puts it straight back. */
            <SelectInput
              label="Shared with"
              isMulti
              clearable={false}
              placeholder="Choose people…"
              options={sharedOptions}
              value={field.value}
              onChange={(ids: number[]) => field.onChange(withOwnerFirst(ids, ownerId))}
              className="mb-3"
            />
          )}
        />
      )}

      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
