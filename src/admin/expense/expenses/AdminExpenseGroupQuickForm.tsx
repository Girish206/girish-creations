import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateAdminUser } from "../../../api/hooks/expense/useAdminUsers";
import { useCreateExpenseGroup, useUpdateExpenseGroup } from "../../../api/hooks/expense/useExpenseGroups";
import { useExpenseMembers } from "../../../api/hooks/expense/useExpenseMembers";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import type { ExpenseGroup } from "../../../api/types";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";
import SelectInput from "../../dms/components/SelectInput";
import { memberLabel } from "../memberLabel";

const schema = z
  .object({
    name: z.string().trim().min(1, "Required"),
    startDate: z.string(),
    endDate: z.string(),
    // Numbers are existing people; strings are new names typed into the picker.
    memberAdminUserIds: z.array(z.union([z.number(), z.string()])).min(1, "Add at least one person"),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    path: ["endDate"],
    message: "End date can't be before the start date",
  });
type FormValues = z.infer<typeof schema>;

export interface AdminExpenseGroupQuickFormProps {
  // Present = edit this group; absent = create a new one.
  group?: ExpenseGroup;
  onSaved: () => void;
}

// Name, the people on the trip/event (any of them can be marked as having
// paid one of its expenses) and an optional start/end date — when dates are
// set, expenses in this group must fall inside them (checked in
// AdminExpenseForm and on the server). Kept small so it opens straight from
// the Expenses page.
export function AdminExpenseGroupQuickForm({ group, onSaved }: AdminExpenseGroupQuickFormProps) {
  const { admin } = useAdminAuth();
  const { data: members } = useExpenseMembers();
  const myId = admin?.sub ? Number(admin.sub) : null;
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: group?.name ?? "",
      startDate: group?.startDate?.slice(0, 10) ?? "",
      endDate: group?.endDate?.slice(0, 10) ?? "",
      // A new group starts with just you; older groups without people do too.
      memberAdminUserIds: group?.members.length
        ? group.members.map((member) => member.adminUserId)
        : myId !== null
          ? [myId]
          : [],
    },
  });
  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });

  const createGroup = useCreateExpenseGroup();
  const updateGroup = useUpdateExpenseGroup();
  const createPerson = useCreateAdminUser();

  async function onSubmit(values: FormValues) {
    const memberAdminUserIds: number[] = [];
    for (const entry of values.memberAdminUserIds) {
      if (typeof entry === "number") {
        memberAdminUserIds.push(entry);
        continue;
      }
      const name = entry.trim();
      if (!name) continue;
      // Someone new becomes a guest: listed for splits, and can be given a
      // login later under People.
      const created = await createPerson.mutateAsync({
        name,
        hasPortfolioAccess: false,
        hasExpensesAccess: false,
        hasSavingsAccess: false,
      });
      memberAdminUserIds.push(created.id);
    }
    const input = {
      name: values.name,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      memberAdminUserIds,
    };
    if (group) {
      await updateGroup.mutateAsync({ id: group.id, input });
    } else {
      await createGroup.mutateAsync(input);
    }
    onSaved();
  }

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <div className="admin-exp-form">
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <InputComp
              label="Group name"
              inputSize="sm"
              placeholder="e.g. Goa Trip 2026"
              required
              autoFocus={!group}
              {...field}
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          name="memberAdminUserIds"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="People"
              size="sm"
              required
              isMulti
              creatable
              placeholder="Choose, or type a new name…"
              options={(members ?? []).map((member) => ({
                value: member.id,
                label: `${memberLabel(member)}${member.id === myId ? " (you)" : ""}`,
              }))}
              value={field.value}
              onChange={field.onChange}
              error={errors.memberAdminUserIds?.message}
            />
          )}
        />
        <div className="admin-exp-row">
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <InputComp label="Starts" inputSize="sm" type="date" max={endDate || undefined} {...field} />
            )}
          />
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <InputComp
                label="Ends"
                inputSize="sm"
                type="date"
                min={startDate || undefined}
                {...field}
                error={errors.endDate?.message}
              />
            )}
          />
        </div>
        <p className="admin-form-hint m-0">
          <i className="fa-solid fa-calendar-days"></i> Dates are optional. If set, only expenses dated within them can
          go in this group.
        </p>
      </div>
      <SubmitButton loading={isSubmitting}>{group ? "Save" : "Create group"}</SubmitButton>
    </ModalForm>
  );
}
