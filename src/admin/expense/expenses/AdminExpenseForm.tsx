import { useEffect, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useExpenses, useCreateExpense, useUpdateExpense } from "../../../api/hooks/expense/useExpenses";
import { useExpenseCategories } from "../../../api/hooks/expense/useExpenseCategories";
import {
  useExpenseGroups,
  useCreateExpenseGroup,
  useUpdateExpenseGroup,
} from "../../../api/hooks/expense/useExpenseGroups";
import type { ExpenseGroup } from "../../../api/types";
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
  // Only used while a group is picked: the people in it (saved onto the
  // group) and which of them paid.
  groupMemberIds: z.array(z.number()),
  paidByAdminUserId: z.number().nullable(),
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

// The people in a group, or — for a group from before groups had people —
// just `fallback`.
function groupMemberIdsOf(group: ExpenseGroup | undefined, fallback: number | null): number[] {
  if (group?.members.length) return group.members.map((member) => member.adminUserId);
  return fallback !== null ? [fallback] : [];
}

const sameIds = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

// Rendered inside a DefaultModal by AdminExpensesList. Ungrouped expenses
// are paid by whoever logs them (the backend defaults paidByAdminUserId to
// the signed-in admin). Once a group is picked, the form shows the people in
// it — editable here, saved onto the group — and a "Paid by" picker among
// them, starting on the signed-in account.
export function AdminExpenseForm({ id, onSaved }: AdminExpenseFormProps) {
  const isEdit = id !== undefined;
  const { data: items } = useExpenses();
  const { data: categories } = useExpenseCategories();
  const { data: savingsGoals } = useSavingsGoals();
  const { data: groups } = useExpenseGroups();
  const { data: members } = useExpenseMembers();
  const { admin } = useAdminAuth();
  const existing = isEdit ? items?.find((item) => item.id === id) : undefined;
  const myId = admin?.sub ? Number(admin.sub) : null;

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
  const groupMemberIds = useWatch({ control, name: "groupMemberIds" }) ?? [];
  const paidBy = useWatch({ control, name: "paidByAdminUserId" });
  const hasGroup = selectedGroupId !== "" && selectedGroupId !== undefined;
  // Whoever paid: picked among the group's people when there's a group;
  // otherwise the original payer when editing, or the signed-in account.
  const payerId = hasGroup ? (paidBy ?? null) : (existing?.paidByAdminUserId ?? myId);
  // Only an existing group can have a date window (a newly typed name can't).
  const selectedGroup =
    typeof selectedGroupId === "number" ? groups?.find((g) => g.id === selectedGroupId) : undefined;
  const windowStart = selectedGroup?.startDate?.slice(0, 10) ?? null;
  const windowEnd = selectedGroup?.endDate?.slice(0, 10) ?? null;
  const windowText = describeWindow(windowStart, windowEnd);

  // Fill the form once its data is in (an edit also needs the groups, for
  // the group's people). Later refetches mustn't wipe what's been typed.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    if (isEdit && (!existing || !groups)) return;
    initialized.current = true;
    if (existing) {
      const group = groups?.find((g) => g.id === existing.expenseGroupId);
      reset({
        amount: existing.amount,
        date: toDateInputValue(existing.date),
        categoryId: existing.categoryId,
        description: existing.description ?? "",
        savingsGoalId: existing.savingsGoalId ?? "",
        expenseGroupId: existing.expenseGroupId ?? "",
        groupMemberIds: existing.expenseGroupId ? groupMemberIdsOf(group, existing.paidByAdminUserId) : [],
        paidByAdminUserId: existing.paidByAdminUserId,
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
        groupMemberIds: [],
        paidByAdminUserId: myId,
        splitEnabled: false,
        splitAdminUserIds: [],
      });
    }
  }, [isEdit, existing, groups, myId, reset]);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const createExpenseGroup = useCreateExpenseGroup();
  const updateExpenseGroup = useUpdateExpenseGroup();

  // Picking a group brings in its people and starts "Paid by" on you (or
  // the first of them, if you're not in it).
  function onGroupChange(value: number | string) {
    if (value === "") return;
    const group = typeof value === "number" ? groups?.find((g) => g.id === value) : undefined;
    const ids = groupMemberIdsOf(group, myId);
    setValue("groupMemberIds", ids);
    setValue("paidByAdminUserId", myId !== null && ids.includes(myId) ? myId : (ids[0] ?? null));
  }

  // Taking the payer out of the group moves "Paid by" back to you (or the
  // first person left).
  function onGroupMembersChange(ids: number[]) {
    setValue("groupMemberIds", ids);
    if (paidBy === null || !ids.includes(paidBy)) {
      setValue("paidByAdminUserId", myId !== null && ids.includes(myId) ? myId : (ids[0] ?? null));
    }
  }

  async function onSubmit(values: FormValues) {
    // Same rule the server enforces — caught here first for a friendlier
    // inline error instead of a toast.
    if ((windowStart && values.date < windowStart) || (windowEnd && values.date > windowEnd)) {
      setError("date", { message: `"${selectedGroup?.name}" expenses must be dated ${windowText}` });
      return;
    }

    const grouped = values.expenseGroupId !== "" && values.expenseGroupId !== undefined;
    if (grouped && values.groupMemberIds.length === 0) {
      setError("groupMemberIds", { message: "Add at least one person to the group" });
      return;
    }
    if (grouped && (values.paidByAdminUserId === null || !values.groupMemberIds.includes(values.paidByAdminUserId))) {
      setError("paidByAdminUserId", { message: "Pick who paid" });
      return;
    }

    // A typed-but-not-yet-existing group name (creatable picker) needs to
    // become a real group before the expense can reference its id. An
    // existing group gets the people chosen here if they changed.
    let expenseGroupId: number | null = null;
    if (grouped) {
      if (typeof values.expenseGroupId === "number") {
        expenseGroupId = values.expenseGroupId;
        const group = groups?.find((g) => g.id === expenseGroupId);
        if (!sameIds(groupMemberIdsOf(group, null), values.groupMemberIds)) {
          await updateExpenseGroup.mutateAsync({
            id: expenseGroupId,
            input: { memberAdminUserIds: values.groupMemberIds },
          });
        }
      } else {
        const created = await createExpenseGroup.mutateAsync({
          name: values.expenseGroupId as string,
          memberAdminUserIds: values.groupMemberIds,
        });
        expenseGroupId = created.id;
      }
    }
    const payer = grouped ? values.paidByAdminUserId : (existing?.paidByAdminUserId ?? myId);

    const input = {
      amount: values.amount,
      date: values.date,
      categoryId: values.categoryId,
      description: values.description || null,
      savingsGoalId: values.savingsGoalId === "" ? null : values.savingsGoalId,
      expenseGroupId,
      ...(payer !== null ? { paidByAdminUserId: payer } : {}),
      splitAdminUserIds: values.splitEnabled ? withPayerFirst(values.splitAdminUserIds, payer) : [],
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
  const groupPeopleOptions = (members ?? []).map((member) => ({
    value: member.id,
    label: `${member.name || member.email}${member.id === myId ? " (you)" : ""}`,
  }));
  const payerOptions = groupMemberIds.map((memberId) => ({
    value: memberId,
    label: `${memberName(memberId)}${memberId === myId ? " (you)" : ""}`,
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
            onChange={(value) => {
              field.onChange(value === "" ? "" : value);
              onGroupChange(value);
            }}
          />
        )}
      />
      {hasGroup && (
        <>
          <Controller
            name="groupMemberIds"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="People in this group"
                required
                isMulti
                placeholder="Add people…"
                options={groupPeopleOptions}
                value={field.value}
                onChange={onGroupMembersChange}
                error={errors.groupMemberIds?.message}
              />
            )}
          />
          <Controller
            name="paidByAdminUserId"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Paid by"
                required
                clearable={false}
                options={payerOptions}
                value={field.value ?? ""}
                onChange={(value: number) => {
                  field.onChange(value);
                  // The payer is always part of the split.
                  if (getValues("splitEnabled")) {
                    setValue("splitAdminUserIds", withPayerFirst(getValues("splitAdminUserIds") ?? [], value));
                  }
                }}
                error={errors.paidByAdminUserId?.message}
              />
            )}
          />
        </>
      )}
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
                // Turning the split on starts with the payer already in it —
                // and, in a group, everyone in the group.
                if (e.target.checked) {
                  const start = hasGroup ? groupMemberIds : (getValues("splitAdminUserIds") ?? []);
                  setValue("splitAdminUserIds", withPayerFirst(start, payerId));
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
