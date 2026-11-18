import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory } from "../../../api/hooks/expense/useExpenseCategories";
import type { CategoryIconType } from "../../../api/types";
import { ModalForm } from "../../components/ModalForm";
import { SubmitButton } from "../../components/SubmitButton";
import InputComp from "../../dms/components/InputComp";
import { CategoryIcon } from "./CategoryIcon";
import { ICON_CHOICES, initialsOf, randomIcon, resolveCategoryIcon, suggestIcon } from "./categoryIcons";

const schema = z.object({ name: z.string().trim().min(1, "Required") });
type FormValues = z.infer<typeof schema>;

const ICON_TYPES: { key: CategoryIconType; label: string; icon: string }[] = [
  { key: "icon", label: "Icon", icon: "fa-icons" },
  { key: "text", label: "Text", icon: "fa-font" },
  { key: "image", label: "Image", icon: "fa-image" },
];

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

  const [iconType, setIconType] = useState<CategoryIconType>("icon");
  const [pickedIcon, setPickedIcon] = useState("");
  const [pickedText, setPickedText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  // Until the user picks an icon/text themselves, both follow the name.
  const [iconPicked, setIconPicked] = useState(false);
  const [textPicked, setTextPicked] = useState(false);

  useEffect(() => {
    if (!existing) return;
    reset({ name: existing.name });
    const resolved = resolveCategoryIcon(existing);
    setIconType(resolved.type);
    if (resolved.type === "icon") setPickedIcon(resolved.value);
    if (resolved.type === "text") setPickedText(resolved.value);
    // A saved choice is the user's — don't overwrite it while they rename.
    setIconPicked(existing.iconType === "icon");
    setTextPicked(existing.iconType === "text");
  }, [existing, reset]);

  const name = useWatch({ control, name: "name" }) ?? "";
  const faIcon = iconPicked ? pickedIcon : suggestIcon(name);
  const text = textPicked ? pickedText : initialsOf(name);

  // Preview a picked-but-unsaved image, revoking its object URL afterwards.
  const imageObjectUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => {
    if (!imageObjectUrl) return;
    return () => URL.revokeObjectURL(imageObjectUrl);
  }, [imageObjectUrl]);
  const savedImage = existing?.iconType === "image" ? existing.icon : null;
  const imagePreview = imageObjectUrl ?? savedImage;

  const createCategory = useCreateExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();

  async function onSubmit(values: FormValues) {
    if (iconType === "image" && !imageFile && !imagePreview) {
      setImageError("Choose an image, or switch to an icon or text.");
      return;
    }
    const input = {
      name: values.name,
      iconType,
      icon:
        iconType === "icon"
          ? faIcon
          : iconType === "text"
            ? text.trim() || initialsOf(values.name)
            : // Unchanged image: resend the saved path so the server keeps it.
              (!imageFile && savedImage) || "",
      imageFile: iconType === "image" ? imageFile : null,
    };
    if (isEdit && existing) {
      await updateCategory.mutateAsync({ id: existing.id, ...input });
    } else {
      await createCategory.mutateAsync(input);
    }
    onSaved();
  }

  if (isEdit && !existing) return <p>Loading...</p>;

  const previewValue = iconType === "icon" ? faIcon : iconType === "text" ? text || "?" : imagePreview;

  return (
    <ModalForm onSubmit={handleSubmit(onSubmit)}>
      <div className="admin-cat-form">
        <div className="admin-cat-form-top">
          {previewValue ? (
            <CategoryIcon name={name || "?"} type={iconType} value={previewValue} className="admin-cat-form-preview" />
          ) : (
            <span className="admin-category-icon admin-category-icon-empty admin-cat-form-preview">
              <i className="fa-regular fa-image" aria-hidden="true"></i>
            </span>
          )}
          <div className="admin-cat-form-name">
            <Controller
              name="name"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <InputComp
                  inputSize="sm"
                  placeholder="Category name *"
                  aria-label="Category name"
                  autoFocus={!isEdit}
                  {...field}
                  error={errors.name?.message}
                />
              )}
            />
          </div>
        </div>

        <div className="admin-cat-form-bar">
          <div className="admin-segmented" role="radiogroup" aria-label="Icon type">
            {ICON_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={iconType === t.key}
                className={iconType === t.key ? "active" : ""}
                onClick={() => setIconType(t.key)}
              >
                <i className={`fa-solid ${t.icon}`} aria-hidden="true"></i> {t.label}
              </button>
            ))}
          </div>
          {iconType === "icon" && (
            <div className="admin-cat-form-tools">
              {iconPicked && (
                <button type="button" className="admin-link-btn" onClick={() => setIconPicked(false)} title="Pick from the name again">
                  <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Auto
                </button>
              )}
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => {
                  setPickedIcon(randomIcon(faIcon));
                  setIconPicked(true);
                }}
              >
                <i className="fa-solid fa-shuffle" aria-hidden="true"></i> Shuffle
              </button>
            </div>
          )}
          {iconType === "text" && textPicked && (
            <div className="admin-cat-form-tools">
              <button type="button" className="admin-link-btn" onClick={() => setTextPicked(false)}>
                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Initials
              </button>
            </div>
          )}
        </div>

        {iconType === "icon" && (
          <div className="admin-icon-grid admin-cat-form-grid" role="radiogroup" aria-label="Choose icon">
            {ICON_CHOICES.map((icon) => (
              <button
                key={icon}
                type="button"
                role="radio"
                aria-checked={faIcon === icon}
                aria-label={icon.replace("fa-", "").replace(/-/g, " ")}
                title={icon.replace("fa-", "").replace(/-/g, " ")}
                className={faIcon === icon ? "active" : ""}
                onClick={() => {
                  setPickedIcon(icon);
                  setIconPicked(true);
                }}
              >
                <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
              </button>
            ))}
          </div>
        )}

        {iconType === "text" && (
          <InputComp
            inputSize="sm"
            value={text}
            maxLength={4}
            placeholder="Text or emoji, e.g. FD or 🍔"
            aria-label="Text or emoji (up to 4 characters)"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setPickedText(e.target.value);
              setTextPicked(true);
            }}
          />
        )}

        {iconType === "image" && (
          <div className="admin-cat-form-image">
            <input
              type="file"
              accept="image/*"
              className="form-control form-control-sm shadow-none"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setImageError(null);
                if (file && file.size > 4 * 1024 * 1024) {
                  setImageError("Image must be 4MB or smaller.");
                  e.target.value = "";
                  return;
                }
                setImageFile(file);
              }}
            />
            {imageError ? (
              <small className="text-danger-brand">{imageError}</small>
            ) : (
              <small className="admin-category-icon-hint">Square PNG, JPG, SVG or WebP, up to 4MB.</small>
            )}
          </div>
        )}
      </div>

      <SubmitButton loading={isSubmitting}>Save</SubmitButton>
    </ModalForm>
  );
}
