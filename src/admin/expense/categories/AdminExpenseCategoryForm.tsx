import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory } from "../../../api/hooks/expense/useExpenseCategories";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";

const schema = z.object({ name: z.string().min(1, "Required") });
type FormValues = z.infer<typeof schema>;

export interface AdminExpenseCategoryFormProps {
  id?: number;
  onSaved: () => void;
}

export function AdminExpenseCategoryForm({ id, onSaved }: AdminExpenseCategoryFormProps) {
  const isEdit = id !== undefined;
  const { data: items } = useExpenseCategories();
  const existing = isEdit ? items?.find((item) => item.id === id) : undefined;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (existing) reset({ name: existing.name });
  }, [existing, reset]);

  const createCategory = useCreateExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();

  async function onSubmit(values: FormValues) {
    if (isEdit && existing) {
      await updateCategory.mutateAsync({ id: existing.id, name: values.name });
    } else {
      await createCategory.mutateAsync(values.name);
    }
    onSaved();
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="name"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Category Name" required {...field} error={errors.name?.message} />}
      />
      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
