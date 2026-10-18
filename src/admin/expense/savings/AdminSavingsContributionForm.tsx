import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAddSavingsContribution } from "../../../api/hooks/expense/useSavingsGoals";
import { useExpenseMembers } from "../../../api/hooks/expense/useExpenseMembers";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";
import SelectInput from "../../dms/components/SelectInput";

const schema = z.object({
  amount: z.string().min(1, "Required"),
  date: z.string().min(1, "Required"),
  contributedByAdminUserId: z.number({ message: "Required" }),
});

type FormValues = z.infer<typeof schema>;

export interface AdminSavingsContributionFormProps {
  goalId: number;
  onSaved: () => void;
}

// "Contributed by" defaults to the logged-in account but can be changed, so
// one person can log a deposit on someone else's behalf (e.g. a member who
// handed over cash, or a guest member without a login).
export function AdminSavingsContributionForm({ goalId, onSaved }: AdminSavingsContributionFormProps) {
  const { admin } = useAdminAuth();
  const { data: members } = useExpenseMembers();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      contributedByAdminUserId: admin?.sub ? Number(admin.sub) : undefined,
    },
  });

  const addContribution = useAddSavingsContribution();

  async function onSubmit(values: FormValues) {
    await addContribution.mutateAsync({ goalId, input: values });
    onSaved();
  }

  const memberOptions = (members ?? []).map((member) => ({
    value: member.id,
    label: `${member.name || member.email}${admin?.sub && member.id === Number(admin.sub) ? " (you)" : ""}`,
  }));

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="contributedByAdminUserId"
        control={control}
        render={({ field }) => (
          <SelectInput
            label="Contributed By"
            required
            clearable={false}
            options={memberOptions}
            value={field.value}
            onChange={field.onChange}
            error={errors.contributedByAdminUserId?.message}
          />
        )}
      />
      <Controller
        name="amount"
        control={control}
        render={({ field }) => (
          <InputComp label="Contribution Amount" type="number" required {...field} error={errors.amount?.message} />
        )}
      />
      <Controller
        name="date"
        control={control}
        render={({ field }) => <InputComp label="Date" type="date" required {...field} error={errors.date?.message} />}
      />
      <SubmitButton loading={isSubmitting}>Add Contribution</SubmitButton>
    </ModalForm>
  );
}
