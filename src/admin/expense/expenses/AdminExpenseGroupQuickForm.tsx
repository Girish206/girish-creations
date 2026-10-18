import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateExpenseGroup, useUpdateExpenseGroup } from "../../../api/hooks/expense/useExpenseGroups";
import { useExpenseMembers } from "../../../api/hooks/expense/useExpenseMembers";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import type { ExpenseGroup } from "../../../api/types";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";
import SelectInput from "../../dms/components/SelectInput";

const schema = z
  .object({
    name: z.string().trim().min(1, "Required"),
    startDate: z.string(),
    endDate: z.string(),
    memberAdminUserIds: z.array(z.number()).min(1, "Add at least one person"),
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

  async function onSubmit(values: FormValues) {
    const input = {
      name: values.name,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      memberAdminUserIds: values.memberAdminUserIds,
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
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <InputComp
            label="Expense Group Name"
            placeholder="e.g. Goa Trip 2026"
            required
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
            label="People in this group"
            required
            isMulti
            placeholder="Choose people…"
            options={(members ?? []).map((member) => ({
              value: member.id,
              label: `${member.name || member.email}${member.id === myId ? " (you)" : ""}`,
            }))}
            value={field.value}
            onChange={field.onChange}
            error={errors.memberAdminUserIds?.message}
          />
        )}
      />
      <div className="row g-2">
        <div className="col-sm-6">
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <InputComp label="Start Date" type="date" max={endDate || undefined} {...field} />
            )}
          />
        </div>
        <div className="col-sm-6">
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <InputComp
                label="End Date"
                type="date"
                min={startDate || undefined}
                {...field}
                error={errors.endDate?.message}
              />
            )}
          />
        </div>
      </div>
      <p className="admin-form-hint">
        Optional. If set, only expenses dated within these days can be added to this group.
      </p>
      <SubmitButton loading={isSubmitting}>{group ? "Save" : "Create Group"}</SubmitButton>
    </ModalForm>
  );
}
