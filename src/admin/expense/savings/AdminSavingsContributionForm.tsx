import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAddSavingsContribution } from "../../../api/hooks/expense/useSavingsGoals";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";

const schema = z.object({
  amount: z.string().min(1, "Required"),
  date: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

export interface AdminSavingsContributionFormProps {
  goalId: number;
  onSaved: () => void;
}

export function AdminSavingsContributionForm({ goalId, onSaved }: AdminSavingsContributionFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", date: new Date().toISOString().slice(0, 10) },
  });

  const addContribution = useAddSavingsContribution();

  async function onSubmit(values: FormValues) {
    await addContribution.mutateAsync({ goalId, input: values });
    onSaved();
  }

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
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
