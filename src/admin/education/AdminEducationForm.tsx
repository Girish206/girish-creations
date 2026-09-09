import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEducation } from "../../api/hooks/useEducation";
import { useCreateEducation, useUpdateEducation } from "../../api/hooks/admin/useAdminEducation";
import { ModalForm } from "../components/ModalForm";
import { SubmitButton } from "../components/SubmitButton";
import InputComp from "../dms/components/InputComp";
import "../admin.css";

const schema = z.object({
  course: z.string().min(1, "Required"),
  institutionName: z.string().min(1, "Required"),
  specialization: z.string().optional(),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().optional(),
  grade: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export interface AdminEducationFormProps {
  id?: number;
  onSaved: () => void;
}

export function AdminEducationForm({ id, onSaved }: AdminEducationFormProps) {
  const isEdit = id !== undefined;
  const { data: items } = useEducation();
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
        course: existing.course,
        institutionName: existing.institutionName,
        specialization: existing.specialization ?? "",
        startDate: toDateInputValue(existing.startDate),
        endDate: toDateInputValue(existing.endDate),
        grade: existing.grade,
      });
    }
  }, [existing, reset]);

  const createEducation = useCreateEducation();
  const updateEducation = useUpdateEducation();

  async function onSubmit(values: FormValues) {
    const input = {
      ...values,
      specialization: values.specialization || null,
      endDate: values.endDate || null,
    };
    if (isEdit && existing) {
      await updateEducation.mutateAsync({ id: existing.id, input });
    } else {
      await createEducation.mutateAsync(input);
    }
    onSaved();
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="course"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Course" required {...field} error={errors.course?.message} />}
      />
      <Controller
        name="institutionName"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp label="Institution Name" required {...field} error={errors.institutionName?.message} />
        )}
      />
      <Controller
        name="specialization"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Specialization" {...field} />}
      />
      <Controller
        name="startDate"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp label="Start Date" type="date" required {...field} error={errors.startDate?.message} />
        )}
      />
      <Controller
        name="endDate"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="End Date" type="date" {...field} />}
      />
      <Controller
        name="grade"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp label="Grade" type="number" step="0.01" required {...field} error={errors.grade?.message} />
        )}
      />
      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
