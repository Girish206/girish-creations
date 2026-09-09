import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSavingsGoals, useCreateSavingsGoal, useUpdateSavingsGoal } from "../../../api/hooks/expense/useSavingsGoals";
import { useExpenseMembers } from "../../../api/hooks/expense/useExpenseMembers";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";
import SelectInput from "../../dms/components/SelectInput";

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
  const existing = isEdit ? items?.find((item) => item.id === id) : undefined;

  const {
    control,
    handleSubmit,
    reset,
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
        memberAdminUserIds: existing.members.map((m) => m.adminUserId),
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
      memberAdminUserIds: values.restrictMembers ? values.memberAdminUserIds : [],
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

      <Controller
        name="restrictMembers"
        control={control}
        render={({ field }) => (
          <div className="form-check mb-2">
            <input
              type="checkbox"
              className="form-check-input"
              id="restrictMembers"
              checked={field.value ?? false}
              onChange={(e) => field.onChange(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="restrictMembers">
              Restrict this goal to specific people
            </label>
          </div>
        )}
      />
      {!restrictMembers && (
        <p className="text-muted small mb-3">
          Visible to everyone with Savings access. Check the box above to limit it to only the people you pick.
        </p>
      )}

      {restrictMembers && (
        <Controller
          name="memberAdminUserIds"
          control={control}
          render={({ field }) => (
            <div className="mb-3 d-flex flex-column gap-2">
              {(members ?? []).map((member) => {
                const checked = field.value.includes(member.id);
                return (
                  <div className="form-check" key={member.id}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`goal-member-${member.id}`}
                      checked={checked}
                      onChange={(e) => {
                        field.onChange(
                          e.target.checked
                            ? [...field.value, member.id]
                            : field.value.filter((memberId: number) => memberId !== member.id),
                        );
                      }}
                    />
                    <label className="form-check-label" htmlFor={`goal-member-${member.id}`}>
                      {member.name || member.email}
                    </label>
                  </div>
                );
              })}
              {memberAdminUserIds.length === 0 && (
                <small className="text-muted">Select at least one person, or uncheck the restriction above.</small>
              )}
            </div>
          )}
        />
      )}

      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
