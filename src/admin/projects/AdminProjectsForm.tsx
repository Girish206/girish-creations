import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProjectsList } from "../../api/hooks/useProjects";
import { useCreateProject, useUpdateProject } from "../../api/hooks/admin/useAdminProjects";
import { uploadUrl } from "../../api/client";
import { ModalForm } from "../components/ModalForm";
import InputComp from "../dms/components/InputComp";
import TextareaInput from "../dms/components/TextareaInput";
import { SubmitButton } from "../components/SubmitButton";
import "../admin.css";

const schema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  technologiesUsed: z.string().min(1, "Required"),
  projectUrl: z.union([z.string().url("Invalid URL"), z.literal("")]).optional(),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export interface AdminProjectsFormProps {
  id?: number;
  onSaved: () => void;
}

export function AdminProjectsForm({ id, onSaved }: AdminProjectsFormProps) {
  const isEdit = id !== undefined;
  const { data } = useProjectsList(1, 100);
  const existing = isEdit ? data?.items.find((item) => item.id === id) : undefined;
  const [imageFile, setImageFile] = useState<File | null>(null);

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
        description: existing.description,
        technologiesUsed: existing.technologiesUsed,
        projectUrl: existing.projectUrl ?? "",
        startDate: toDateInputValue(existing.startDate),
        endDate: toDateInputValue(existing.endDate),
      });
    }
  }, [existing, reset]);

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  async function onSubmit(values: FormValues) {
    const input = {
      ...values,
      projectUrl: values.projectUrl || null,
      endDate: values.endDate || null,
      imageFile,
    };
    if (isEdit && existing) {
      await updateProject.mutateAsync({ id: existing.id, input });
    } else {
      await createProject.mutateAsync(input);
    }
    setImageFile(null);
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
        name="description"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <TextareaInput label="Description" rows={4} required {...field} error={errors.description?.message} />
        )}
      />
      <Controller
        name="technologiesUsed"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp label="Technologies Used" required {...field} error={errors.technologiesUsed?.message} />
        )}
      />
      <Controller
        name="projectUrl"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Project URL" {...field} error={errors.projectUrl?.message} />}
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

      <div className="mb-4">
        <label className="form-label">Image</label>
        {existing?.image && <img src={uploadUrl(existing.image)} alt="" className="admin-file-preview" />}
        <input
          type="file"
          accept="image/*"
          className="form-control shadow-none"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
