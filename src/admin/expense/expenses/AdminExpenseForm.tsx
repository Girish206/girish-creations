import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useExpenses, useCreateExpense, useUpdateExpense } from "../../../api/hooks/expense/useExpenses";
import { useExpenseCategories } from "../../../api/hooks/expense/useExpenseCategories";
import { useExpenseGroups, useCreateExpenseGroup } from "../../../api/hooks/expense/useExpenseGroups";
import { useSavingsGoals } from "../../../api/hooks/expense/useSavingsGoals";
import { useExpenseMembers } from "../../../api/hooks/expense/useExpenseMembers";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";
import TextareaInput from "../../dms/components/TextareaInput";
import SelectInput from "../../dms/components/SelectInput";
import { formatCurrency } from "../currency";

const schema = z.object({
  amount: z.string().min(1, "Required"),
  date: z.string().min(1, "Required"),
  categoryId: z.number(),
  description: z.string().optional(),
  savingsGoalId: z.union([z.number(), z.literal("")]).optional(),
  // Number = an existing group's id. Non-empty string = a new group name
  // typed into the creatable picker, created on submit. "" = no group.
  expenseGroupId: z.union([z.number(), z.string()]).optional(),
  splitEnabled: z.boolean(),
  splitAdminUserIds: z.array(z.number()),
});

type FormValues = z.infer<typeof schema>;

function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

// Mirrors the backend's integer-cents equal-split algorithm (expense.service.ts)
// so the preview always matches what actually gets saved.
function computeEqualShares(amount: string, count: number): number[] {
  if (count <= 0) return [];
  const totalCents = Math.round(Number(amount || 0) * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - baseCents * count;
  return Array.from({ length: count }, (_, i) => (baseCents + (i < remainder ? 1 : 0)) / 100);
}

export interface AdminExpenseFormProps {
  id?: number;
  onSaved: () => void;
}

// Rendered inside a DefaultModal by AdminExpensesList. Who paid is always
// the logged-in account (the backend defaults paidByAdminUserId to the
// authenticated admin when it's omitted) — each member logs their own
// expenses, so there's no "paid by" picker here.
export function AdminExpenseForm({ id, onSaved }: AdminExpenseFormProps) {
  const isEdit = id !== undefined;
  const { data: items } = useExpenses();
  const { data: categories } = useExpenseCategories();
  const { data: savingsGoals } = useSavingsGoals();
  const { data: groups } = useExpenseGroups();
  const { data: members } = useExpenseMembers();
  const existing = isEdit ? items?.find((item) => item.id === id) : undefined;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const amount = useWatch({ control, name: "amount" });
  const splitEnabled = useWatch({ control, name: "splitEnabled" });
  const splitAdminUserIds = useWatch({ control, name: "splitAdminUserIds" }) ?? [];

  useEffect(() => {
    if (existing) {
      reset({
        amount: existing.amount,
        date: toDateInputValue(existing.date),
        categoryId: existing.categoryId,
        description: existing.description ?? "",
        savingsGoalId: existing.savingsGoalId ?? "",
        expenseGroupId: existing.expenseGroupId ?? "",
        splitEnabled: existing.splitParticipants.length > 0,
        splitAdminUserIds: existing.splitParticipants.map((p) => p.adminUserId),
      });
    } else {
      reset({
        amount: "",
        date: "",
        description: "",
        savingsGoalId: "",
        expenseGroupId: "",
        splitEnabled: false,
        splitAdminUserIds: [],
      });
    }
  }, [existing, reset]);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const createExpenseGroup = useCreateExpenseGroup();

  async function onSubmit(values: FormValues) {
    // A typed-but-not-yet-existing group name (creatable picker) needs to
    // become a real group before the expense can reference its id.
    let expenseGroupId: number | null = null;
    if (values.expenseGroupId !== "" && values.expenseGroupId !== undefined) {
      if (typeof values.expenseGroupId === "number") {
        expenseGroupId = values.expenseGroupId;
      } else {
        const created = await createExpenseGroup.mutateAsync(values.expenseGroupId);
        expenseGroupId = created.id;
      }
    }

    const input = {
      amount: values.amount,
      date: values.date,
      categoryId: values.categoryId,
      description: values.description || null,
      savingsGoalId: values.savingsGoalId === "" ? null : values.savingsGoalId,
      expenseGroupId,
      splitAdminUserIds: values.splitEnabled ? values.splitAdminUserIds : [],
    };
    if (isEdit && existing) {
      await updateExpense.mutateAsync({ id: existing.id, input });
    } else {
      await createExpense.mutateAsync(input);
    }
    onSaved();
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }));
  const savingsGoalOptions = (savingsGoals ?? []).map((g) => ({ value: g.id, label: g.name }));
  const groupOptions = (groups ?? []).map((g) => ({ value: g.id, label: g.name }));
  const shares = splitEnabled ? computeEqualShares(amount, splitAdminUserIds.length) : [];

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="amount"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp label="Amount" type="number" required {...field} error={errors.amount?.message} />
        )}
      />
      <Controller
        name="date"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Date" type="date" required {...field} error={errors.date?.message} />}
      />
      <Controller
        name="categoryId"
        control={control}
        render={({ field }) => (
          <SelectInput
            label="Category"
            required
            options={categoryOptions}
            value={field.value}
            onChange={field.onChange}
            error={errors.categoryId?.message}
          />
        )}
      />
      <Controller
        name="expenseGroupId"
        control={control}
        render={({ field }) => (
          <SelectInput
            label="Expense Group"
            placeholder="Ungrouped — shown under Daily Expenses"
            creatable
            options={groupOptions}
            value={field.value}
            onChange={(value) => field.onChange(value === "" ? "" : value)}
          />
        )}
      />
      <Controller
        name="savingsGoalId"
        control={control}
        render={({ field }) => (
          <SelectInput
            label="Spent From (Savings)"
            placeholder="Not linked to a savings goal"
            options={savingsGoalOptions}
            value={field.value}
            onChange={(value) => field.onChange(value === "" ? "" : value)}
          />
        )}
      />
      <Controller
        name="description"
        control={control}
        defaultValue=""
        render={({ field }) => <TextareaInput label="Description" rows={3} {...field} />}
      />

      <Controller
        name="splitEnabled"
        control={control}
        render={({ field }) => (
          <div className="form-check mb-2">
            <input
              type="checkbox"
              className="form-check-input"
              id="splitEnabled"
              checked={field.value ?? false}
              onChange={(e) => field.onChange(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="splitEnabled">
              Split this expense among people
            </label>
          </div>
        )}
      />

      {splitEnabled && (
        <Controller
          name="splitAdminUserIds"
          control={control}
          render={({ field }) => (
            <div className="mb-3 d-flex flex-column gap-2">
              {(members ?? []).map((member) => {
                const checked = field.value.includes(member.id);
                const shareIndex = field.value.indexOf(member.id);
                return (
                  <div className="form-check d-flex align-items-center justify-content-between" key={member.id}>
                    <span>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`split-member-${member.id}`}
                        checked={checked}
                        onChange={(e) => {
                          field.onChange(
                            e.target.checked
                              ? [...field.value, member.id]
                              : field.value.filter((memberId: number) => memberId !== member.id),
                          );
                        }}
                      />
                      <label className="form-check-label" htmlFor={`split-member-${member.id}`}>
                        {member.name || member.email}
                      </label>
                    </span>
                    {checked && shareIndex >= 0 && shares[shareIndex] !== undefined && (
                      <span className="text-muted small">{formatCurrency(shares[shareIndex])}</span>
                    )}
                  </div>
                );
              })}
              {field.value.length === 0 && <small className="text-muted">Select at least one person.</small>}
            </div>
          )}
        />
      )}

      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
