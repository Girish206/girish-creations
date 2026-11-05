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
import { INVALID_AMOUNT_MESSAGE, isValidAmount } from "../currency";
import { todayLocal } from "../dates";

const schema = z.object({
  amount: z.string().min(1, "Required").refine(isValidAmount, INVALID_AMOUNT_MESSAGE),
  date: z.string().min(1, "Required"),
  contributedByAdminUserId: z.number({ message: "Required" }),
});

type FormValues = z.infer<typeof schema>;

export interface AdminSavingsContributionFormProps {
  goalId: number;
  // Whether they manage the goal, and so can log this for someone else.
  canChooseContributor: boolean;
  onSaved: () => void;
}

// Someone managing the goal gets a "Contributed by" picker, defaulting to
// themselves, to log a deposit on someone else's behalf (e.g. a member who
// handed over cash, or a guest member without a login). Anyone else adds their own.
export function AdminSavingsContributionForm({ goalId, canChooseContributor, onSaved }: AdminSavingsContributionFormProps) {
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
      date: todayLocal(),
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
      {canChooseContributor && (
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
      )}
      <Controller
        name="amount"
        control={control}
        render={({ field }) => (
          <InputComp
            label="Contribution Amount"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            required
            {...field}
            error={errors.amount?.message}
          />
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
