import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useInvestments, useCreateInvestment, useUpdateInvestment } from "../../../api/hooks/expense/useInvestments";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";
import TextareaInput from "../../dms/components/TextareaInput";

const schema = z.object({
  title: z.string().min(1, "Required"),
  type: z.string().min(1, "Required"),
  amountInvested: z.string().min(1, "Required"),
  currentValue: z.string().optional(),
  date: z.string().min(1, "Required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export interface AdminInvestmentFormProps {
  id?: number;
  onSaved: () => void;
}

export function AdminInvestmentForm({ id, onSaved }: AdminInvestmentFormProps) {
  const isEdit = id !== undefined;
  const { data: items } = useInvestments();
  const existing = isEdit ? items?.find((item) => item.id === id) : undefined;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        type: existing.type,
        amountInvested: existing.amountInvested,
        currentValue: existing.currentValue ?? "",
        date: toDateInputValue(existing.date),
        notes: existing.notes ?? "",
      });
    }
  }, [existing, reset]);

  const createInvestment = useCreateInvestment();
  const updateInvestment = useUpdateInvestment();

  async function onSubmit(values: FormValues) {
    const input = { ...values, currentValue: values.currentValue || null, notes: values.notes || null };
    if (isEdit && existing) {
      await updateInvestment.mutateAsync({ id: existing.id, input });
    } else {
      await createInvestment.mutateAsync(input);
    }
    onSaved();
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="title"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Title" required {...field} error={errors.title?.message} />}
      />
      <Controller
        name="type"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp label="Type" placeholder="Stocks, Mutual Fund, FD, Crypto..." required {...field} error={errors.type?.message} />
        )}
      />
      <Controller
        name="amountInvested"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp
            label="Amount Invested"
            type="number"
            required
            {...field}
            error={errors.amountInvested?.message}
          />
        )}
      />
      <Controller
        name="currentValue"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Current Value" type="number" {...field} />}
      />
      <Controller
        name="date"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Date" type="date" required {...field} error={errors.date?.message} />}
      />
      <Controller
        name="notes"
        control={control}
        defaultValue=""
        render={({ field }) => <TextareaInput label="Notes" rows={3} {...field} />}
      />
      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
