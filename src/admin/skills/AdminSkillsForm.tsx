import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSkills } from "../../api/hooks/useSkills";
import { useCreateSkill, useUpdateSkill } from "../../api/hooks/admin/useAdminSkills";
import { ModalForm } from "../components/ModalForm";
import { SubmitButton } from "../components/SubmitButton";
import InputComp from "../dms/components/InputComp";
import SelectInput from "../dms/components/SelectInput";
import "../admin.css";

const PROFICIENCY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;

const schema = z.object({
  skillName: z.string().min(1, "Required"),
  proficiencyLevel: z.enum(PROFICIENCY_LEVELS),
});

type FormValues = z.infer<typeof schema>;

export interface AdminSkillsFormProps {
  id?: number;
  onSaved: () => void;
}

export function AdminSkillsForm({ id, onSaved }: AdminSkillsFormProps) {
  const isEdit = id !== undefined;
  const { data: items } = useSkills();
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
        skillName: existing.skillName,
        proficiencyLevel: existing.proficiencyLevel,
      });
    }
  }, [existing, reset]);

  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();

  async function onSubmit(values: FormValues) {
    if (isEdit && existing) {
      await updateSkill.mutateAsync({ id: existing.id, input: values });
    } else {
      await createSkill.mutateAsync(values);
    }
    onSaved();
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="skillName"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Skill Name" required {...field} error={errors.skillName?.message} />}
      />
      <Controller
        name="proficiencyLevel"
        control={control}
        defaultValue={PROFICIENCY_LEVELS[0]}
        render={({ field }) => (
          <SelectInput
            label="Proficiency Level"
            options={PROFICIENCY_LEVELS.map((level) => ({ value: level, label: level }))}
            value={field.value}
            onChange={field.onChange}
            error={errors.proficiencyLevel?.message}
          />
        )}
      />
      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
