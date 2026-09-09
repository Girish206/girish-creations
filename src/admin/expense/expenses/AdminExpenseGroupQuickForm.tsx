import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateExpenseGroup } from "../../../api/hooks/expense/useExpenseGroups";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";

const schema = z.object({ name: z.string().min(1, "Required") });
type FormValues = z.infer<typeof schema>;

export interface AdminExpenseGroupQuickFormProps {
  onSaved: () => void;
}

// Minimal "just give it a name" create form — grouping a batch of trip/
// event expenses shouldn't require leaving the Expenses page. Renaming
// isn't exposed here; the group name can still be changed by creating a
// new one and moving expenses over via the bulk "Move to Group" action.
export function AdminExpenseGroupQuickForm({ onSaved }: AdminExpenseGroupQuickFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "" } });

  const createGroup = useCreateExpenseGroup();

  async function onSubmit(values: FormValues) {
    await createGroup.mutateAsync(values.name);
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
      <SubmitButton loading={isSubmitting}>Create Group</SubmitButton>
    </ModalForm>
  );
}
