import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCertifications } from "../../api/hooks/useCertifications";
import { useCreateCertification, useUpdateCertification } from "../../api/hooks/admin/useAdminCertifications";
import { ModalForm } from "../components/ModalForm";
import { SubmitButton } from "../components/SubmitButton";
import InputComp from "../dms/components/InputComp";
import "../admin.css";

const schema = z.object({
  name: z.string().min(1, "Required"),
  issuingOrganization: z.string().min(1, "Required"),
  issueDate: z.string().min(1, "Required"),
  expirationDate: z.string().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.union([z.string().url("Invalid URL"), z.literal("")]).optional(),
});

type FormValues = z.infer<typeof schema>;

function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export interface AdminCertificationsFormProps {
  id?: number;
  onSaved: () => void;
}

export function AdminCertificationsForm({ id, onSaved }: AdminCertificationsFormProps) {
  const isEdit = id !== undefined;
  const { data: items } = useCertifications();
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
        name: existing.name,
        issuingOrganization: existing.issuingOrganization,
        issueDate: toDateInputValue(existing.issueDate),
        expirationDate: toDateInputValue(existing.expirationDate),
        credentialId: existing.credentialId ?? "",
        credentialUrl: existing.credentialUrl ?? "",
      });
    }
  }, [existing, reset]);

  const createCertification = useCreateCertification();
  const updateCertification = useUpdateCertification();

  async function onSubmit(values: FormValues) {
    const input = {
      ...values,
      expirationDate: values.expirationDate || null,
      credentialId: values.credentialId || null,
      credentialUrl: values.credentialUrl || null,
    };
    if (isEdit && existing) {
      await updateCertification.mutateAsync({ id: existing.id, input });
    } else {
      await createCertification.mutateAsync(input);
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
        render={({ field }) => <InputComp label="Name" required {...field} error={errors.name?.message} />}
      />
      <Controller
        name="issuingOrganization"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp
            label="Issuing Organization"
            required
            {...field}
            error={errors.issuingOrganization?.message}
          />
        )}
      />
      <Controller
        name="issueDate"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp label="Issue Date" type="date" required {...field} error={errors.issueDate?.message} />
        )}
      />
      <Controller
        name="expirationDate"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Expiration Date" type="date" {...field} />}
      />
      <Controller
        name="credentialId"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Credential ID" {...field} />}
      />
      <Controller
        name="credentialUrl"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <InputComp label="Credential URL" {...field} error={errors.credentialUrl?.message} />
        )}
      />
      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
