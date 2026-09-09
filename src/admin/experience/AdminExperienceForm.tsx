import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useExperience } from "../../api/hooks/useExperience";
import { useCreateExperience, useUpdateExperience } from "../../api/hooks/admin/useAdminExperience";
import { ModalForm } from "../components/ModalForm";
import { SubmitButton } from "../components/SubmitButton";
import InputComp from "../dms/components/InputComp";
import TextareaInput from "../dms/components/TextareaInput";

const schema = z.object({
  jobTitle: z.string().min(1, "Required"),
  companyName: z.string().min(1, "Required"),
  location: z.string().optional(),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export interface AdminExperienceFormProps {
  id?: number;
  onSaved: () => void;
}

// Rendered inside a DefaultModal by AdminExperienceList — this component owns
// no routing, just the id of the entry being edited (undefined = create) and
// a callback to run once the save succeeds (the list closes the modal).
//
// Fields use DMS's InputComp/TextareaInput, which are controlled components
// (no ref-forwarding), so each is wired via react-hook-form's <Controller>
// rather than the usual register() spread (register() relies on an
// uncontrolled ref, which these components don't expose).
export function AdminExperienceForm({ id, onSaved }: AdminExperienceFormProps) {
  const isEdit = id !== undefined;
  const { data: items } = useExperience();
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
        jobTitle: existing.jobTitle,
        companyName: existing.companyName,
        location: existing.location ?? "",
        startDate: toDateInputValue(existing.startDate),
        endDate: toDateInputValue(existing.endDate),
        description: existing.description ?? "",
      });
    }
  }, [existing, reset]);

  const createExperience = useCreateExperience();
  const updateExperience = useUpdateExperience();

  async function onSubmit(values: FormValues) {
    const input = {
      ...values,
      location: values.location || null,
      endDate: values.endDate || null,
      description: values.description || null,
    };
    if (isEdit && existing) {
      await updateExperience.mutateAsync({ id: existing.id, input });
    } else {
      await createExperience.mutateAsync(input);
    }
    onSaved();
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="jobTitle"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp label="Job Title" required {...field} error={errors.jobTitle?.message} />
        )}
      />
      <Controller
        name="companyName"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp label="Company Name" required {...field} error={errors.companyName?.message} />
        )}
      />
      <Controller
        name="location"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Location" {...field} />}
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
        render={({ field }) => <InputComp label='End Date (leave blank for "Present")' type="date" {...field} />}
      />
      <Controller
        name="description"
        control={control}
        defaultValue=""
        render={({ field }) => <TextareaInput label="Description" rows={4} {...field} />}
      />
      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
