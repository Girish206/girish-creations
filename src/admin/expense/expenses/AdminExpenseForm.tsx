import { useEffect, useRef, useState } from "react";
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
import { useCreateAdminUser } from "../../../api/hooks/expense/useAdminUsers";
import type { AdminUserRef, ExpenseGroup } from "../../../api/types";
import { useSavingsGoals } from "../../../api/hooks/expense/useSavingsGoals";
import { useExpenseMembers } from "../../../api/hooks/expense/useExpenseMembers";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import TextareaInput from "../../dms/components/TextareaInput";
import SelectInput from "../../dms/components/SelectInput";
import { formatCurrency, INVALID_AMOUNT_MESSAGE, isValidAmount } from "../currency";
import { todayLocal } from "../dates";
import { toast } from "sonner";
import "../../admin.css";
import { memberLabel } from "../memberLabel";

const schema = z.object({
  amount: z.string().min(1, "Required").refine(isValidAmount, INVALID_AMOUNT_MESSAGE),
  date: z.string().min(1, "Required"),
  categoryId: z.number({ message: "Pick a category" }),
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
  // "equal" divides it evenly; "custom" uses splitAmounts, keyed by person.
  splitMode: z.enum(["equal", "custom"]),
  splitAmounts: z.record(z.string(), z.string()),
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

const toCents = (value: string | number) => Math.round(Number(value || 0) * 100);

// Whether saved shares are just what an even split would give. Only then can
// an expense reopen as "Equally".
function isEqualSplit(amount: string, shares: { adminUserId: number; shareAmount: string }[]) {
  const saved = shares.map((share) => toCents(share.shareAmount)).sort((a, b) => a - b);
  const even = computeEqualShares(amount, shares.length).map(toCents).sort((a, b) => a - b);
  return saved.every((cents, index) => cents === even[index]);
}

// The payer leads the split when they're sharing it. They can be left out, for
// an expense they covered for the others.
function withPayerFirst(ids: number[], payerId: number | null): number[] {
  if (payerId === null || !ids.includes(payerId)) return ids;
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
  // A new expense started from a group opens with that group picked.
  groupId?: number;
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

// A new expense's date: its group's start date when it has one, else today.
function defaultDateFor(group: { startDate?: string | null } | undefined) {
  return group?.startDate?.slice(0, 10) ?? todayLocal();
}

// Rendered inside a DefaultModal by AdminExpensesList. Ungrouped expenses
// are paid by whoever logs them (the backend defaults paidByAdminUserId to
// the signed-in admin). Once a group is picked, the form shows the people in
// it — editable here, saved onto the group — and a "Paid by" picker among
// them, starting on the signed-in account.
export function AdminExpenseForm({ id, groupId, onSaved }: AdminExpenseFormProps) {
  const isEdit = id !== undefined;
  const { data: items } = useExpenses();
  const { data: categories } = useExpenseCategories();
  const { admin } = useAdminAuth();
  // Goals are behind their own access flag; without it, this would just 403.
  const hasSavingsAccess = Boolean(admin?.hasSavingsAccess);
  const { data: savingsGoals } = useSavingsGoals(hasSavingsAccess);
  const { data: groups } = useExpenseGroups();
  const { data: members } = useExpenseMembers();
  const existing = isEdit ? items?.find((item) => item.id === id) : undefined;
  const myId = admin?.sub ? Number(admin.sub) : null;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setFocus,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const amount = useWatch({ control, name: "amount" });
  const splitEnabled = useWatch({ control, name: "splitEnabled" });
  const splitAdminUserIds = useWatch({ control, name: "splitAdminUserIds" }) ?? [];
  const splitMode = useWatch({ control, name: "splitMode" }) ?? "equal";
  const splitAmounts = useWatch({ control, name: "splitAmounts" }) ?? {};
  const selectedGroupId = useWatch({ control, name: "expenseGroupId" });
  const selectedGoalId = useWatch({ control, name: "savingsGoalId" });
  const paidFromFund = (savingsGoals ?? []).some((g) => g.id === selectedGoalId && g.kind === "fund");
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
  // A trip made for a shared fund: each expense is paid from the fund or from
  // the payer's own money (a closed fund only for what was already on it).
  const tripFund =
    selectedGroup?.fund && (!selectedGroup.fund.closedAt || existing?.savingsGoalId === selectedGroup.fund.id)
      ? selectedGroup.fund
      : null;

  // Fill the form once its data is in (an edit also needs the groups, for
  // the group's people). Later refetches mustn't wipe what's been typed.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    if (isEdit && (!existing || !groups)) return;
    if (groupId !== undefined && !groups) return;
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
        // The payer is always listed, so "Paid by" can show them — older
        // expenses may have been moved into a group they weren't in.
        groupMemberIds: existing.expenseGroupId
          ? [...new Set([...groupMemberIdsOf(group, existing.paidByAdminUserId), existing.paidByAdminUserId])]
          : [],
        paidByAdminUserId: existing.paidByAdminUserId,
        splitEnabled: existing.splitParticipants.length > 0,
        splitAdminUserIds:
          existing.splitParticipants.length > 0
            ? withPayerFirst(
                existing.splitParticipants.map((p) => p.adminUserId),
                existing.paidByAdminUserId,
              )
            : [],
        splitMode:
          existing.splitParticipants.length === 0 ||
          isEqualSplit(existing.amount, existing.splitParticipants)
            ? "equal"
            : "custom",
        splitAmounts: Object.fromEntries(existing.splitParticipants.map((p) => [String(p.adminUserId), p.shareAmount])),
      });
    } else {
      const startGroup = groupId !== undefined ? groups?.find((g) => g.id === groupId && !g.closedAt) : undefined;
      const startMemberIds = startGroup ? groupMemberIdsOf(startGroup, myId) : [];
      const startDate = defaultDateFor(startGroup);
      // Paid from the fund means paid by whoever keeps its money.
      const startFund = startGroup?.fund && !startGroup.fund.closedAt ? startGroup.fund : null;
      const startHolder =
        startFund?.holderAdminUserId != null && startMemberIds.includes(startFund.holderAdminUserId)
          ? startFund.holderAdminUserId
          : null;
      reset({
        amount: "",
        date: startDate,
        description: "",
        // A fund's trip starts on "paid from the fund".
        savingsGoalId: startGroup?.fund && !startGroup.fund.closedAt ? startGroup.fund.id : "",
        expenseGroupId: startGroup?.id ?? "",
        groupMemberIds: startMemberIds,
        paidByAdminUserId:
          startHolder ??
          (startGroup && !(myId !== null && startMemberIds.includes(myId)) ? (startMemberIds[0] ?? null) : myId),
        splitEnabled: false,
        splitAdminUserIds: [],
        splitMode: "equal",
        splitAmounts: {},
      });
    }
  }, [isEdit, existing, groups, groupId, myId, reset]);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const createExpenseGroup = useCreateExpenseGroup();
  const updateExpenseGroup = useUpdateExpenseGroup();
  const createPerson = useCreateAdminUser();
  const [addingPeople, setAddingPeople] = useState(false);
  // People added from this form, named until the members list refetches.
  const [addedPeople, setAddedPeople] = useState<{ id: number; name: string }[]>([]);

  // Who keeps a shared fund's money (its account holder, else whoever made it).
  function fundHolderId(goalId: number | string | undefined): number | null {
    const goal = (savingsGoals ?? []).find((g) => g.id === goalId);
    if (goal?.kind === "fund") return goal.accountHolderAdminUserId ?? goal.createdBy?.id ?? null;
    return groups?.find((g) => g.fund?.id === goalId)?.fund?.holderAdminUserId ?? null;
  }

  function setPayer(payer: number | null) {
    setValue("paidByAdminUserId", payer);
    // Keeps whoever's ticked, with the payer first if they're among them.
    if (payer !== null && getValues("splitEnabled")) {
      setValue("splitAdminUserIds", withPayerFirst(getValues("splitAdminUserIds") ?? [], payer));
    }
  }

  // Paid from a fund: "Paid by" moves to whoever keeps the fund, if they're
  // among the group's people.
  function payFromFundHolder(goalId: number | string | undefined) {
    const holder = fundHolderId(goalId);
    if (holder !== null && (getValues("groupMemberIds") ?? []).includes(holder)) setPayer(holder);
  }

  // Picking a group brings in its people and starts "Paid by" on you (or
  // the first of them, if you're not in it).
  function onGroupChange(value: number | string) {
    const group = typeof value === "number" ? groups?.find((g) => g.id === value) : undefined;
    // A fund's trip starts on its fund; leaving one drops that fund (its money
    // only pays for its own trip).
    const currentGoal = getValues("savingsGoalId");
    const goalTrip = (savingsGoals ?? []).find((g) => g.id === currentGoal)?.expenseGroupId ?? null;
    if (group?.fund && !group.fund.closedAt) {
      setValue("savingsGoalId", group.fund.id);
    } else if (goalTrip !== null && goalTrip !== group?.id) {
      setValue("savingsGoalId", "");
    }
    // A new expense starts on the group's start date (today without one).
    if (!isEdit) setValue("date", defaultDateFor(group));
    if (value === "") return;
    const ids = groupMemberIdsOf(group, myId);
    setValue("groupMemberIds", ids);
    const fundHolder = group?.fund && !group.fund.closedAt ? group.fund.holderAdminUserId : null;
    const payer =
      fundHolder !== null && ids.includes(fundHolder)
        ? fundHolder
        : myId !== null && ids.includes(myId)
          ? myId
          : (ids[0] ?? null);
    setValue("paidByAdminUserId", payer);
    // An open split follows the group: everyone in it, ticked.
    if (getValues("splitEnabled")) setValue("splitAdminUserIds", withPayerFirst(ids, payer));
  }

  // Taking the payer out of the group moves "Paid by" back to you (or the
  // first person left).
  // A typed-in name is someone new: they're added as a guest straight away
  // (listed for splits, can be given a login later under People), so "Paid
  // by" and the split can use them like anyone else.
  async function onGroupPeoplePicked(picked: (number | string)[]) {
    const typed = picked.filter((v): v is string => typeof v === "string" && v.trim() !== "");
    if (typed.length === 0) {
      onGroupMembersChange(picked.filter((v): v is number => typeof v === "number"));
      return;
    }
    setAddingPeople(true);
    try {
      const ids: number[] = [];
      for (const entry of picked) {
        if (typeof entry === "number") {
          ids.push(entry);
        } else if (entry.trim() !== "") {
          const created = await createPerson.mutateAsync({
            name: entry.trim(),
            hasPortfolioAccess: false,
            hasExpensesAccess: false,
            hasSavingsAccess: false,
          });
          if (!ids.includes(created.id)) ids.push(created.id);
          setAddedPeople((list) => [...list, { id: created.id, name: entry.trim() }]);
        }
      }
      onGroupMembersChange(ids);
    } finally {
      setAddingPeople(false);
    }
  }

  function onGroupMembersChange(ids: number[]) {
    const before = getValues("groupMemberIds") ?? [];
    setValue("groupMemberIds", ids);
    let payer = paidBy ?? null;
    if (payer === null || !ids.includes(payer)) {
      payer = myId !== null && ids.includes(myId) ? myId : (ids[0] ?? null);
      setValue("paidByAdminUserId", payer);
    }
    // People added to the group join the split; people taken out leave it.
    if (getValues("splitEnabled")) {
      const added = ids.filter((v) => !before.includes(v));
      const kept = (getValues("splitAdminUserIds") ?? []).filter((v) => ids.includes(v));
      setValue("splitAdminUserIds", withPayerFirst([...kept, ...added], payer));
    }
  }

  async function onSubmit(values: FormValues) {
    // Same rule the server enforces — caught here first for a friendlier
    // inline error instead of a toast.
    if ((windowStart && values.date < windowStart) || (windowEnd && values.date > windowEnd)) {
      setError("date", { message: `"${selectedGroup?.name}" expenses must be dated ${windowText}` });
      return;
    }

    // Checked before a typed-in group gets created below.
    if (values.splitEnabled && values.splitMode === "custom") {
      const entered = values.splitAdminUserIds.map((memberId) => values.splitAmounts[String(memberId)]?.trim() || "0");
      if (!entered.every((value) => /^\d{1,12}(\.\d{1,2})?$/.test(value))) {
        setError("splitAdminUserIds", { message: "Each share must be an amount with at most 2 decimals" });
        return;
      }
      const totalCents = entered.reduce((sum, value) => sum + toCents(value), 0);
      if (totalCents !== toCents(values.amount)) {
        setError("splitAdminUserIds", {
          message: `The shares add up to ${formatCurrency(totalCents / 100)}, but the expense is ${formatCurrency(values.amount)}`,
        });
        return;
      }
    }

    // A split needs someone sharing it other than whoever paid.
    if (values.splitEnabled && !values.splitAdminUserIds.some((memberId) => memberId !== payerId)) {
      setError("splitAdminUserIds", { message: "Tick who shares this expense" });
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
        // If saving the expense fails below, a retry must reuse this group.
        setValue("expenseGroupId", created.id);
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
      ...(values.splitEnabled && values.splitMode === "custom"
        ? {
            splitShares: withPayerFirst(values.splitAdminUserIds, payer).map((memberId) => ({
              adminUserId: memberId,
              shareAmount: values.splitAmounts[String(memberId)]?.trim() || "0",
            })),
          }
        : { splitAdminUserIds: values.splitEnabled ? withPayerFirst(values.splitAdminUserIds, payer) : [] }),
    };
    if (isEdit && existing) {
      await updateExpense.mutateAsync({ id: existing.id, input });
      onSaved();
      return;
    }
    await createExpense.mutateAsync(input);
    // Stay open for the next one: clear what's per-expense, keep the date,
    // group, people, paid from and paid by.
    toast.success("Expense added");
    reset({
      ...values,
      expenseGroupId: expenseGroupId ?? "",
      amount: "",
      categoryId: undefined as unknown as number,
      description: "",
      splitEnabled: false,
      splitAdminUserIds: [],
      splitMode: "equal",
      splitAmounts: {},
    });
    setFocus("amount");
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  // Closed goals/groups can't take new expenses — only keep one listed if
  // this expense already points at it, so the picker still shows its name.
  const savingsGoalOptions = (savingsGoals ?? [])
    .filter((g) => !g.closedAt || g.id === existing?.savingsGoalId)
    .map((g) => ({
      value: g.id,
      label: `${g.name}${g.kind === "fund" ? " (shared fund)" : ""}${g.closedAt ? " (closed)" : ""}`,
    }));
  // A goal this account can't see still has to show by name on its expense.
  if (existing?.savingsGoal && !savingsGoalOptions.some((g) => g.value === existing.savingsGoalId)) {
    savingsGoalOptions.push({ value: existing.savingsGoal.id, label: existing.savingsGoal.name });
  }
  const groupOptions = (groups ?? [])
    .filter((g) => !g.closedAt || g.id === existing?.expenseGroupId)
    .map((g) => ({ value: g.id, label: g.name }));
  // Everyone the pickers may need to name: former members (no longer in the
  // member list) can still be on this expense or in its group, and would
  // otherwise silently drop out of the split when it's saved.
  const people = new Map<number, AdminUserRef>();
  for (const member of members ?? []) people.set(member.id, member);
  const addPerson = (person: AdminUserRef) => {
    if (!people.has(person.id)) people.set(person.id, person);
  };
  if (existing) {
    addPerson(existing.paidBy);
    existing.splitParticipants.forEach((p) => addPerson(p.adminUser));
  }
  selectedGroup?.members.forEach((member) => addPerson(member.adminUser));
  const peopleList = Array.from(people.values());
  const shares = splitEnabled ? computeEqualShares(amount, splitAdminUserIds.length) : [];
  const customTotalCents = splitAdminUserIds.reduce(
    (sum, memberId) => sum + toCents(splitAmounts[String(memberId)] ?? ""),
    0,
  );
  const unassignedCents = toCents(amount) - customTotalCents;

  // Starts from the even split, so it only needs adjusting. Shares already
  // typed for these people are kept.
  function chooseCustomSplit() {
    const current = getValues("splitAmounts") ?? {};
    setValue(
      "splitAmounts",
      Object.fromEntries(
        splitAdminUserIds.map((memberId, i) => [
          String(memberId),
          current[String(memberId)] ?? (shares[i] !== undefined ? shares[i].toFixed(2) : ""),
        ]),
      ),
    );
    setValue("splitMode", "custom");
  }
  const memberName = (memberId: number) => {
    const member = people.get(memberId);
    return (member && memberLabel(member)) || addedPeople.find((p) => p.id === memberId)?.name || "Unknown member";
  };
  const memberOptions = peopleList.map((member) => ({
    value: member.id,
    label: `${memberLabel(member)}${member.id === payerId ? " (paid)" : ""}`,
  }));
  const groupPeopleOptions = [
    ...peopleList.map((member) => ({
      value: member.id,
      label: `${memberLabel(member)}${member.id === myId ? " (you)" : ""}`,
    })),
    ...addedPeople
      .filter((p) => !peopleList.some((member) => member.id === p.id))
      .map((p) => ({ value: p.id, label: p.name })),
  ];
  const payerOptions = groupMemberIds.map((memberId) => ({
    value: memberId,
    label: `${memberName(memberId)}${memberId === myId ? " (you)" : ""}`,
  }));

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <div className="admin-exp-form">
        {/* Amount + date: the two things every expense needs, up top. */}
        <div className="admin-exp-hero">
          <Controller
            name="amount"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <label className={`admin-exp-amount${errors.amount ? " has-error" : ""}`}>
                <span aria-hidden="true">₹</span>
                <input
                  {...field}
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  aria-label="Amount"
                  autoFocus={!isEdit}
                  autoComplete="off"
                />
              </label>
            )}
          />
          <Controller
            name="date"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <input
                {...field}
                type="date"
                aria-label="Date"
                className={`admin-exp-date${errors.date ? " has-error" : ""}`}
                min={windowStart ?? undefined}
                max={windowEnd ?? undefined}
              />
            )}
          />
        </div>
        {(errors.amount || errors.date) && (
          <small className="admin-exp-error">{errors.amount?.message ?? errors.date?.message}</small>
        )}

        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Category"
              size="sm"
              required
              placeholder="Pick a category"
              options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
              value={field.value}
              onChange={field.onChange}
              error={errors.categoryId?.message}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <TextareaInput
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              placeholder="Note: what was it for? (optional)"
              rows={1}
              className="admin-exp-note"
            />
          )}
        />

        <Controller
          name="expenseGroupId"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Group"
              size="sm"
              placeholder="None (daily)"
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
        {tripFund ? (
          <Controller
            name="savingsGoalId"
            control={control}
            render={({ field }) => (
              <div className="admin-exp-paidfrom">
                <span className="admin-exp-paidfrom-label">Paid from</span>
                <div className="admin-segmented" role="radiogroup" aria-label="Paid from">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={field.value === tripFund.id}
                    className={field.value === tripFund.id ? "active" : ""}
                    onClick={() => {
                      field.onChange(tripFund.id);
                      payFromFundHolder(tripFund.id);
                    }}
                    title={tripFund.name}
                  >
                    <i className="fa-solid fa-people-group" aria-hidden="true"></i> Fund
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={field.value !== tripFund.id}
                    className={field.value !== tripFund.id ? "active" : ""}
                    onClick={() => field.onChange("")}
                  >
                    <i className="fa-solid fa-wallet" aria-hidden="true"></i> Own money
                  </button>
                </div>
              </div>
            )}
          />
        ) : (
          hasSavingsAccess && (
            <Controller
              name="savingsGoalId"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Paid from"
                  size="sm"
                  placeholder="None"
                  options={savingsGoalOptions}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value === "" ? "" : value);
                    // A fund's money is for its trip: put the expense there.
                    const trip = (savingsGoals ?? []).find((g) => g.id === value)?.expenseGroupId ?? null;
                    if (trip !== null && getValues("expenseGroupId") !== trip) {
                      setValue("expenseGroupId", trip);
                      onGroupChange(trip);
                    }
                    if (value !== "") payFromFundHolder(value);
                  }}
                />
              )}
            />
          )
        )}
        {(paidFromFund || (tripFund && selectedGoalId === tripFund.id)) && (
          <p className="admin-form-hint m-0">
            <i className="fa-solid fa-people-group"></i> From the fund. Split only for some people or custom amounts.
          </p>
        )}
        {tripFund && selectedGoalId !== tripFund.id && (
          <p className="admin-form-hint m-0">
            <i className="fa-solid fa-wallet"></i> Paid from their own money: whoever shares it pays them back in the trip's
            settle-up.
          </p>
        )}

        {hasGroup && (
          <>
            <Controller
              name="groupMemberIds"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="People"
                  size="sm"
                  required
                  isMulti
                  creatable
                  isLoading={addingPeople}
                  readOnly={addingPeople}
                  placeholder="Pick or type a new name…"
                  options={groupPeopleOptions}
                  value={field.value}
                  onChange={onGroupPeoplePicked}
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
                  size="sm"
                  required
                  clearable={false}
                  options={payerOptions}
                  value={field.value ?? ""}
                  onChange={(value: number) => setPayer(value)}
                  error={errors.paidByAdminUserId?.message}
                />
              )}
            />
          </>
        )}
        {windowText && (
          <p className="admin-form-hint m-0">
            <i className="fa-solid fa-calendar-days"></i> {selectedGroup?.name} expenses must be dated {windowText}.
          </p>
        )}

        <div className={`admin-exp-split${splitEnabled ? " open" : ""}`}>
          <div className="admin-exp-split-head">
            <Controller
              name="splitEnabled"
              control={control}
              render={({ field }) => (
                <label className="admin-exp-switch">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={field.value ?? false}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      // Turning the split on starts with the payer in it — and,
                      // in a group, everyone in the group. Untick the payer for
                      // an expense they covered for the others.
                      if (e.target.checked) {
                        const start = hasGroup ? groupMemberIds : (getValues("splitAdminUserIds") ?? []);
                        const withPayer = payerId !== null && !start.includes(payerId) ? [payerId, ...start] : start;
                        setValue("splitAdminUserIds", withPayerFirst(withPayer, payerId));
                      }
                    }}
                  />
                  <span className="admin-exp-switch-track" aria-hidden="true"></span>
                  <span>Split with others</span>
                </label>
              )}
            />
            {splitEnabled && (
              <div className="admin-segmented" role="radiogroup" aria-label="How to split">
                <button
                  type="button"
                  role="radio"
                  aria-checked={splitMode === "equal"}
                  className={splitMode === "equal" ? "active" : ""}
                  onClick={() => setValue("splitMode", "equal")}
                >
                  <i className="fa-solid fa-equals" aria-hidden="true"></i> Equal
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={splitMode === "custom"}
                  className={splitMode === "custom" ? "active" : ""}
                  onClick={chooseCustomSplit}
                >
                  <i className="fa-solid fa-sliders" aria-hidden="true"></i> Amount
                </button>
              </div>
            )}
          </div>

          {splitEnabled && (
            <Controller
              name="splitAdminUserIds"
              control={control}
              render={({ field }) => {
                // In a group the people are already picked above, so the
                // split is just ticks against them — no second picker.
                const rows: number[] = hasGroup ? withPayerFirst(groupMemberIds, payerId) : field.value;
                const toggle = (memberId: number, on: boolean) => {
                  const next = on ? [...field.value, memberId] : field.value.filter((v: number) => v !== memberId);
                  field.onChange(withPayerFirst(rows.filter((v) => next.includes(v)), payerId));
                };
                return (
                <div className="admin-exp-split-body">
                  {!hasGroup && (
                    <SelectInput
                      size="sm"
                      isMulti
                      clearable={false}
                      placeholder="Choose people…"
                      options={memberOptions}
                      value={field.value}
                      onChange={(ids: number[]) => field.onChange(withPayerFirst(ids, payerId))}
                      error={errors.splitAdminUserIds?.message}
                    />
                  )}
                  {hasGroup && errors.splitAdminUserIds?.message && (
                    <p className="admin-form-hint m-0 admin-settle-owes">{errors.splitAdminUserIds.message}</p>
                  )}
                  {rows.length > 0 && (
                    <ul className="admin-split-shares">
                      {rows.map((memberId: number) => {
                        const i = field.value.indexOf(memberId);
                        const included = i !== -1;
                        return (
                        <li key={memberId} className={included ? "" : "is-out"}>
                          <span>
                            {hasGroup && (
                              <input
                                type="checkbox"
                                className="form-check-input admin-split-tick"
                                checked={included}
                                onChange={(e) => toggle(memberId, e.target.checked)}
                                aria-label={`Include ${memberName(memberId)}`}
                              />
                            )}
                            {memberName(memberId)}
                            {memberId === payerId && <span className="admin-split-payer">Paid</span>}
                          </span>
                          {!included ? (
                            <span className="admin-split-out">Not in</span>
                          ) : splitMode === "custom" ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              className="form-control form-control-sm admin-split-share-input"
                              aria-label={`${memberName(memberId)}'s share`}
                              value={splitAmounts[String(memberId)] ?? ""}
                              onChange={(e) =>
                                setValue("splitAmounts", { ...getValues("splitAmounts"), [String(memberId)]: e.target.value })
                              }
                            />
                          ) : (
                            <strong>{shares[i] !== undefined ? formatCurrency(shares[i]) : "—"}</strong>
                          )}
                        </li>
                        );
                      })}
                    </ul>
                  )}
                  {splitMode === "custom" && (
                    <p
                      className={`admin-form-hint m-0 ${unassignedCents === 0 ? "admin-settle-gets" : "admin-settle-owes"}`}
                      role="status"
                    >
                      {unassignedCents === 0
                        ? "Shares add up to the full amount."
                        : unassignedCents > 0
                          ? `${formatCurrency(unassignedCents / 100)} still to assign`
                          : `${formatCurrency(-unassignedCents / 100)} too much`}
                    </p>
                  )}
                  {!hasGroup && (
                    <p className="admin-form-hint m-0">
                      <i className="fa-solid fa-circle-info"></i> No group, so repayments settle one-to-one under Daily
                      splits.
                    </p>
                  )}
                </div>
                );
              }}
            />
          )}
        </div>
      </div>

      <SubmitButton loading={isSubmitting}>{isEdit ? "Save" : "Add expense"}</SubmitButton>
    </ModalForm>
  );
}
