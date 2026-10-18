import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useExpenses, useCreateExpense, useUpdateExpense } from "../../../api/hooks/expense/useExpenses";
import { useExpenseCategories } from "../../../api/hooks/expense/useExpenseCategories";
import { useExpenseGroups, useCreateExpenseGroup } from "../../../api/hooks/expense/useExpenseGroups";
import { useSavingsGoals } from "../../../api/hooks/expense/useSavingsGoals";
import { useExpenseMembers } from "../../../api/hooks/expense/useExpenseMembers";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";
import TextareaInput from "../../dms/components/TextareaInput";
import SelectInput from "../../dms/components/SelectInput";
import { formatCurrency } from "../currency";
import "../../admin.css";

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
}).refine((values) => !values.splitEnabled || values.splitAdminUserIds.length >= 2, {
  path: ["splitAdminUserIds"],
  message: "Pick at least one other person to split with.",
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

// The payer is always one of the people splitting, and listed first.
function withPayerFirst(ids: number[], payerId: number | null): number[] {
  if (payerId === null) return ids;
  return [payerId, ...ids.filter((memberId) => memberId !== payerId)];
}

function formatDay(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// "between X and Y" / "on or after X" / "on or before Y", or null when the
// group has no date window.
function describeWindow(start: string | null, end: string | null): string | null {
  if (start && end) return `between ${formatDay(start)} and ${formatDay(end)}`;
  if (start) return `on or after ${formatDay(start)}`;
  if (end) return `on or before ${formatDay(end)}`;
  return null;
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
  const { admin } = useAdminAuth();
  const existing = isEdit ? items?.find((item) => item.id === id) : undefined;
  // Whoever paid: the original payer when editing, otherwise the logged-in
  // account (the backend fills paidByAdminUserId in the same way).
  const payerId = existing?.paidByAdminUserId ?? (admin?.sub ? Number(admin.sub) : null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const amount = useWatch({ control, name: "amount" });
  const splitEnabled = useWatch({ control, name: "splitEnabled" });
  const splitAdminUserIds = useWatch({ control, name: "splitAdminUserIds" }) ?? [];
  const selectedGroupId = useWatch({ control, name: "expenseGroupId" });
  // Only an existing group can have a date window (a newly typed name can't).
  const selectedGroup =
    typeof selectedGroupId === "number" ? groups?.find((g) => g.id === selectedGroupId) : undefined;
  const windowStart = selectedGroup?.startDate?.slice(0, 10) ?? null;
  const windowEnd = selectedGroup?.endDate?.slice(0, 10) ?? null;
  const windowText = describeWindow(windowStart, windowEnd);

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
        splitAdminUserIds:
          existing.splitParticipants.length > 0
            ? withPayerFirst(
                existing.splitParticipants.map((p) => p.adminUserId),
                existing.paidByAdminUserId,
              )
            : [],
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
    // Same rule the server enforces — caught here first for a friendlier
    // inline error instead of a toast.
    if ((windowStart && values.date < windowStart) || (windowEnd && values.date > windowEnd)) {
      setError("date", { message: `"${selectedGroup?.name}" expenses must be dated ${windowText}` });
      return;
    }

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
      splitAdminUserIds: values.splitEnabled ? withPayerFirst(values.splitAdminUserIds, payerId) : [],
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
  // Closed goals/groups can't take new expenses — only keep one listed if
  // this expense already points at it, so the picker still shows its name.
  const savingsGoalOptions = (savingsGoals ?? [])
    .filter((g) => !g.closedAt || g.id === existing?.savingsGoalId)
    .map((g) => ({ value: g.id, label: g.closedAt ? `${g.name} (closed)` : g.name }));
  const groupOptions = (groups ?? [])
    .filter((g) => !g.closedAt || g.id === existing?.expenseGroupId)
    .map((g) => ({ value: g.id, label: g.name }));
  const shares = splitEnabled ? computeEqualShares(amount, splitAdminUserIds.length) : [];
  const memberName = (memberId: number) => {
    const member = members?.find((m) => m.id === memberId);
    return member?.name || member?.email || "Unknown member";
  };
  const memberOptions = (members ?? []).map((member) => ({
    value: member.id,
    label: `${member.name || member.email}${member.id === payerId ? " (paid)" : ""}`,
  }));

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
        render={({ field }) => (
          <InputComp
            label="Date"
            type="date"
            required
            min={windowStart ?? undefined}
            max={windowEnd ?? undefined}
            {...field}
            error={errors.date?.message}
          />
        )}
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
      {windowText && (
        <p className="admin-form-hint">
          <i className="fa-solid fa-calendar-days"></i> Expenses in {selectedGroup?.name} must be dated {windowText}.
        </p>
      )}
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
              onChange={(e) => {
                field.onChange(e.target.checked);
                // Turning the split on starts with the payer already in it.
                if (e.target.checked) {
                  setValue("splitAdminUserIds", withPayerFirst(getValues("splitAdminUserIds") ?? [], payerId));
                }
              }}
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
            <div className="mb-3">
              {/* Removing the payer's chip just puts it straight back. */}
              <SelectInput
                label="Split with"
                required
                isMulti
                clearable={false}
                placeholder="Choose people…"
                options={memberOptions}
                value={field.value}
                onChange={(ids: number[]) => field.onChange(withPayerFirst(ids, payerId))}
                error={errors.splitAdminUserIds?.message}
              />
              {field.value.length > 0 && (
                <ul className="admin-split-shares">
                  {field.value.map((memberId: number, i: number) => (
                    <li key={memberId}>
                      <span>
                        {memberName(memberId)}
                        {memberId === payerId && <span className="admin-split-payer">Paid</span>}
                      </span>
                      <strong>{shares[i] !== undefined ? formatCurrency(shares[i]) : "—"}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        />
      )}

      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
