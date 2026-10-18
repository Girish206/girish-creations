import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateExpenseGroup, useUpdateExpenseGroup } from "../../../api/hooks/expense/useExpenseGroups";
import type { ExpenseGroup } from "../../../api/types";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";

const schema = z
  .object({
    name: z.string().trim().min(1, "Required"),
    startDate: z.string(),
    endDate: z.string(),
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

// Name plus an optional start/end date — when dates are set, expenses in
// this group must fall inside them (checked in AdminExpenseForm and on the
// server). Kept small so it opens straight from the Expenses page.
export function AdminExpenseGroupQuickForm({ group, onSaved }: AdminExpenseGroupQuickFormProps) {
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
