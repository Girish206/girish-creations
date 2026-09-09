import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTools } from "../../api/hooks/useTools";
import { useCreateTool, useUpdateTool } from "../../api/hooks/admin/useAdminTools";
import { ModalForm } from "../components/ModalForm";
import { SubmitButton } from "../components/SubmitButton";
import InputComp from "../dms/components/InputComp";
import "../admin.css";

const schema = z.object({
  toolName: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

export interface AdminToolsFormProps {
  id?: number;
  onSaved: () => void;
}

export function AdminToolsForm({ id, onSaved }: AdminToolsFormProps) {
  const isEdit = id !== undefined;
  const { data: items } = useTools();
  const existing = isEdit ? items?.find((item) => item.id === id) : undefined;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (existing) {
      reset({ toolName: existing.toolName });
    }
  }, [existing, reset]);

  const createTool = useCreateTool();
  const updateTool = useUpdateTool();

  async function onSubmit(values: FormValues) {
    if (isEdit && existing) {
      await updateTool.mutateAsync({ id: existing.id, input: values });
    } else {
      await createTool.mutateAsync(values);
    }
    onSaved();
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="toolName"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Tool Name" required {...field} error={errors.toolName?.message} />}
      />
      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
