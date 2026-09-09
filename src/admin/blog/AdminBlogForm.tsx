import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBlogList } from "../../api/hooks/useBlogPosts";
import { useCreateBlogPost, useUpdateBlogPost } from "../../api/hooks/admin/useAdminBlog";
import { ModalForm } from "../components/ModalForm";
import InputComp from "../dms/components/InputComp";
import TextareaInput from "../dms/components/TextareaInput";
import { SubmitButton } from "../components/SubmitButton";
import "../admin.css";

const schema = z.object({
  title: z.string().min(1, "Required"),
  content: z.string().min(1, "Required"),
  tags: z.string().optional(),
  slug: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface AdminBlogFormProps {
  id?: number;
  onSaved: () => void;
}

export function AdminBlogForm({ id, onSaved }: AdminBlogFormProps) {
  const isEdit = id !== undefined;
  const { data } = useBlogList(1, 100);
  const existing = isEdit ? data?.items.find((item) => item.id === id) : undefined;

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
        content: existing.content,
        tags: existing.tags ?? "",
        slug: existing.slug,
      });
    }
  }, [existing, reset]);

  const createBlogPost = useCreateBlogPost();
  const updateBlogPost = useUpdateBlogPost();

  async function onSubmit(values: FormValues) {
    if (isEdit && existing) {
      await updateBlogPost.mutateAsync({
        id: existing.id,
        input: {
          title: values.title,
          content: values.content,
          tags: values.tags || null,
          slug: values.slug,
        },
      });
    } else {
      await createBlogPost.mutateAsync({
        title: values.title,
        content: values.content,
        tags: values.tags || null,
      });
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

      {isEdit && (
        <Controller
          name="slug"
          control={control}
          defaultValue=""
          render={({ field }) => <InputComp label="Slug" {...field} error={errors.slug?.message} />}
        />
      )}

      <Controller
        name="content"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <TextareaInput label="Content" rows={8} required {...field} error={errors.content?.message} />
        )}
      />
      <Controller
        name="tags"
        control={control}
        defaultValue=""
        render={({ field }) => <InputComp label="Tags" {...field} />}
      />
      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
