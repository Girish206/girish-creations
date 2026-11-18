import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAddSavingsContribution } from "../../../api/hooks/expense/useSavingsGoals";
import { useExpenseMembers } from "../../../api/hooks/expense/useExpenseMembers";
import { useCreateAdminUser } from "../../../api/hooks/expense/useAdminUsers";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import SelectInput from "../../dms/components/SelectInput";
import { INVALID_AMOUNT_MESSAGE, isValidAmount } from "../currency";
import { todayLocal } from "../dates";
import "../../admin.css";
import { memberLabel } from "../memberLabel";

const schema = z.object({
  amount: z.string().min(1, "Required").refine(isValidAmount, INVALID_AMOUNT_MESSAGE),
  date: z.string().min(1, "Required"),
  // A number = an existing person; a string = a new name typed into the
  // picker, added as a guest on save.
  contributedByAdminUserId: z.union([z.number(), z.string().trim().min(1, "Required")], { message: "Required" }),
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
  const createPerson = useCreateAdminUser();

  async function onSubmit(values: FormValues) {
    let contributedByAdminUserId = values.contributedByAdminUserId;
    if (typeof contributedByAdminUserId === "string") {
      // A guest: listed for contributions, can be given a login later under People.
      const created = await createPerson.mutateAsync({
        name: contributedByAdminUserId.trim(),
        hasPortfolioAccess: false,
        hasExpensesAccess: false,
        hasSavingsAccess: false,
      });
      contributedByAdminUserId = created.id;
    }
    await addContribution.mutateAsync({ goalId, input: { ...values, contributedByAdminUserId } });
    onSaved();
  }

  const memberOptions = (members ?? []).map((member) => ({
    value: member.id,
    label: `${memberLabel(member)}${admin?.sub && member.id === Number(admin.sub) ? " (you)" : ""}`,
  }));

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <div className="admin-exp-form">
        {/* Amount (big) + date pill, same as a new expense. */}
        <div className="admin-exp-hero">
          <Controller
            name="amount"
            control={control}
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
                  aria-label="Contribution amount"
                  autoFocus
                  autoComplete="off"
                />
              </label>
            )}
          />
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="date"
                aria-label="Date"
                className={`admin-exp-date${errors.date ? " has-error" : ""}`}
              />
            )}
          />
        </div>
        {(errors.amount || errors.date) && (
          <small className="admin-exp-error">{errors.amount?.message ?? errors.date?.message}</small>
        )}

        {canChooseContributor && (
          <Controller
            name="contributedByAdminUserId"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Contributed by"
                size="sm"
                required
                clearable={false}
                creatable
                placeholder="Pick or type a new name…"
                options={memberOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.contributedByAdminUserId?.message}
              />
            )}
          />
        )}
      </div>

      <SubmitButton loading={isSubmitting}>Add contribution</SubmitButton>
    </ModalForm>
  );
}
