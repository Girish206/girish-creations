import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useProfile } from "../../api/hooks/useProfile";
import { useExperience } from "../../api/hooks/useExperience";
import { useUpdateProfile, type ProfileFormInput } from "../../api/hooks/admin/useAdminProfile";
import { uploadUrl } from "../../api/client";
import type { PortfolioStyle } from "../../api/types";
import { CLASSIC_ACCENTS } from "../../portfolio/portfolioStyle";
import { useImageLightbox } from "../../components/lightbox/useImageLightbox";
import InputComp from "../dms/components/InputComp";
import TextareaInput from "../dms/components/TextareaInput";
import "../admin.css";
import "./adminProfile.css";

const schema = z.object({
  // Mirrors the server's rule (profile.service.ts); it also rejects a few
  // reserved words and names already taken.
  username: z
    .string()
    .regex(
      /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/,
      "3–40 lowercase letters, numbers or hyphens, starting and ending with a letter or number",
    ),
  fullName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  bio: z.string().optional(),
  objective: z.string().optional(),
  contactNumber: z.string().optional(),
  showContactNumber: z.boolean(),
  address: z.string().optional(),
  facebookId: z.string().optional(),
  instaId: z.string().optional(),
  linkedinId: z.string().optional(),
  twitterId: z.string().optional(),
  portfolioStyle: z.enum(["tech", "classic"]),
  portfolioAccent: z.enum(["emerald", "ocean", "indigo", "rose", "sunset", "violet"]),
});

type FormValues = z.infer<typeof schema>;

type PendingFiles = Pick<
  ProfileFormInput,
  "profilePictureFile" | "signatureFile" | "removeSignature" | "resumeFile" | "removeResume"
>;

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "invalid" | "error";

// How long typing has to pause before the change is saved.
const AUTOSAVE_DELAY_MS = 800;

// A profile header (cover band + overlapping avatar + identity/meta line)
// followed by sectioned cards. There's no Save button: text edits autosave
// after a short pause and image changes save immediately, with the status
// shown in the header. Fields still use DMS's InputComp/TextareaInput via
// react-hook-form's <Controller> (those components are controlled, with no
// ref-forwarding).
export function AdminProfileForm() {
  const { data: profile, isLoading } = useProfile();
  const { data: experience } = useExperience();
  const { mutateAsync: updateProfile } = useUpdateProfile();
  // These only drive the previews; what still has to be uploaded lives in
  // pendingFiles, so a preview survives the save instead of flashing back to
  // the old image until the profile refetch lands.
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [removeSignature, setRemoveSignature] = useState(false);
  // Name of a just-picked résumé, or true once removed, until the refetch lands.
  const [resumeChange, setResumeChange] = useState<string | true | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const {
    control,
    reset,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onChange" });

  const pendingFiles = useRef<PendingFiles>({});
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formInitialized = useRef(false);

  // Saves run one at a time so a slow request can't land after (and
  // overwrite) a newer one. An invalid form (e.g. an emptied name) isn't
  // sent; the next valid edit saves everything, pending images included.
  const save = useCallback(() => {
    saveQueue.current = saveQueue.current.then(async () => {
      if (!(await trigger())) {
        setStatus("invalid");
        return;
      }
      const files = pendingFiles.current;
      pendingFiles.current = {};
      setStatus("saving");
      try {
        await updateProfile({ ...getValues(), ...files });
        // A newer edit may have started its pause meanwhile; keep showing that.
        setStatus((current) => (current === "saving" ? "saved" : current));
      } catch {
        pendingFiles.current = { ...files, ...pendingFiles.current };
        setStatus("error");
      }
    });
  }, [trigger, getValues, updateProfile]);

  const scheduleSave = useCallback(
    (delay: number) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setStatus("pending");
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        save();
      }, delay);
    },
    [save],
  );

  // Only user edits count; reset() fires watch without a `type`.
  useEffect(() => {
    const subscription = watch((_values, { type }) => {
      if (type === "change") scheduleSave(AUTOSAVE_DELAY_MS);
    });
    return () => subscription.unsubscribe();
  }, [watch, scheduleSave]);

  // Leaving the page mid-pause still saves the last edit.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        save();
      }
    };
  }, [save]);

  // A full page unload can't wait for the request, so warn instead.
  useEffect(() => {
    if (status !== "pending" && status !== "saving") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  function queueFiles(files: PendingFiles) {
    pendingFiles.current = { ...pendingFiles.current, ...files };
    scheduleSave(0);
  }

  // Fill the form once. Every save refetches the profile, and resetting on
  // that would wipe whatever was typed while the request was in flight.
  useEffect(() => {
    if (profile && !formInitialized.current) {
      formInitialized.current = true;
      reset({
        username: profile.username ?? "",
        fullName: profile.fullName,
        email: profile.email,
        bio: profile.bio ?? "",
        objective: profile.objective ?? "",
        contactNumber: profile.contactNumber ?? "",
        showContactNumber: profile.showContactNumber ?? true,
        address: profile.address ?? "",
        facebookId: profile.facebookId ?? "",
        instaId: profile.instaId ?? "",
        linkedinId: profile.linkedinId ?? "",
        twitterId: profile.twitterId ?? "",
        portfolioStyle: profile.portfolioStyle ?? "tech",
        // A shade from an earlier palette isn't a valid choice any more.
        portfolioAccent: CLASSIC_ACCENTS.find((shade) => shade.value === profile.portfolioAccent)?.value ?? "emerald",
      });
    }
  }, [profile, reset]);

  const avatarPreview = useMemo(() => {
    if (profilePictureFile) return URL.createObjectURL(profilePictureFile);
    return profile?.profilePicture ? uploadUrl(profile.profilePicture) : null;
  }, [profilePictureFile, profile?.profilePicture]);

  const { openAt: openAvatarLightbox, lightbox: avatarLightbox } = useImageLightbox(
    avatarPreview ? [avatarPreview] : [],
  );

  useEffect(() => {
    return () => {
      if (profilePictureFile && avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarPreview]);

  const signaturePreview = useMemo(() => {
    if (signatureFile) return URL.createObjectURL(signatureFile);
    if (removeSignature) return null;
    return profile?.signature ? uploadUrl(profile.signature) : null;
  }, [signatureFile, removeSignature, profile?.signature]);

  const { openAt: openSignatureLightbox, lightbox: signatureLightbox } = useImageLightbox(
    signaturePreview ? [signaturePreview] : [],
  );

  if (isLoading) {
    return (
      <div className="card">
        <div className="admin-card-body">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card">
        <div className="admin-card-body">Couldn't load your portfolio. Refresh the page to try again.</div>
      </div>
    );
  }

  const currentRole = experience?.find((exp) => !exp.endDate) ?? experience?.[0];
  const publicPath = profile.username ? `/${profile.username}` : null;
  const hasResume = resumeChange === null ? Boolean(profile.resume) : resumeChange !== true;

  return (
    <form className="admin-profile-page" onSubmit={(e) => e.preventDefault()} noValidate>
      <div className="card admin-profile-hero">
        <div className="admin-profile-hero-body">
          <div className="admin-profile-avatar-wrap">
            <div className="admin-profile-avatar">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt=""
                  style={{ cursor: "pointer" }}
                  onClick={() => openAvatarLightbox(0)}
                />
              ) : (
                <i className="fa-solid fa-user"></i>
              )}
            </div>
            <label className="admin-profile-avatar-edit" title="Change photo">
              <i className="fa-solid fa-camera"></i>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  if (!file) return;
                  setProfilePictureFile(file);
                  queueFiles({ profilePictureFile: file });
                }}
              />
            </label>
          </div>
          {avatarLightbox}
          <div className="admin-profile-hero-info">
            <h1>{profile.fullName}</h1>
            {currentRole && (
              <p className="admin-profile-role">
                {currentRole.jobTitle} <span>at {currentRole.companyName}</span>
              </p>
            )}
          </div>
          {publicPath && (
            <a className="admin-upload-btn admin-profile-view-btn" href={publicPath} target="_blank" rel="noreferrer">
              <i className="fa-solid fa-arrow-up-right-from-square"></i> View my portfolio
            </a>
          )}
        </div>
        <ProfileMeta email={profile.email} experience={profile.formattedExperience} />
      </div>

      <SaveStatusIndicator status={status} onRetry={save} />

      <div className="admin-profile-grid">
        <section className="card admin-profile-section">
          <header className="admin-profile-section-header">
            <i className="fa-solid fa-globe"></i> Public Page
          </header>
          <Controller
            name="username"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <InputComp
                label="Username"
                required
                icon="fa-solid fa-at"
                {...field}
                onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                error={errors.username?.message}
              />
            )}
          />
          <small className="admin-hint">
            Your portfolio lives at{" "}
            {publicPath ? (
              <a href={publicPath} target="_blank" rel="noreferrer">
                <code>
                  {window.location.host}
                  {publicPath}
                </code>
              </a>
            ) : (
              <code>{window.location.host}/your-username</code>
            )}{" "}
            and is listed on the home page with your name and photo. Changing the username changes that link.
          </small>
        </section>

        <section className="card admin-profile-section">
          <header className="admin-profile-section-header">
            <i className="fa-solid fa-palette"></i> Portfolio Design
          </header>
          <Controller
            name="portfolioStyle"
            control={control}
            defaultValue="tech"
            render={({ field }) => (
              <div className="admin-style-options" role="radiogroup" aria-label="Portfolio design">
                {STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === option.value}
                    className={`admin-style-option${field.value === option.value ? " is-selected" : ""}`}
                    onClick={() => field.onChange(option.value)}
                  >
                    <span className={`admin-style-preview admin-style-preview-${option.value}`} aria-hidden="true">
                      <i />
                      <b />
                      <b />
                    </span>
                    <span className="admin-style-name">
                      {option.label}
                      {field.value === option.value && <i className="fa-solid fa-circle-check"></i>}
                    </span>
                    <span className="admin-style-desc">{option.description}</span>
                  </button>
                ))}
              </div>
            )}
          />
          {watch("portfolioStyle") === "classic" && (
            <Controller
              name="portfolioAccent"
              control={control}
              defaultValue="emerald"
              render={({ field }) => (
                <div className="admin-shade-picker">
                  <span className="admin-shade-label">Colour</span>
                  <div className="admin-shade-options" role="radiogroup" aria-label="Classic colour">
                    {CLASSIC_ACCENTS.map((shade) => (
                      <button
                        key={shade.value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === shade.value}
                        className={`admin-shade${field.value === shade.value ? " is-selected" : ""}`}
                        onClick={() => field.onChange(shade.value)}
                      >
                        <span className="admin-shade-swatch" style={{ background: shade.swatch }} aria-hidden="true">
                          {field.value === shade.value && <i className="fa-solid fa-check"></i>}
                        </span>
                        {shade.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />
          )}
          <small className="admin-hint">Changes how your public portfolio looks and reads. Your content stays the same.</small>
        </section>

        <section className="card admin-profile-section">
          <header className="admin-profile-section-header">
            <i className="fa-solid fa-id-card"></i> Basic Info
          </header>
          <Controller
            name="fullName"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <InputComp label="Full Name" required {...field} error={errors.fullName?.message} />
            )}
          />
          <Controller
            name="email"
            control={control}
            defaultValue=""
            render={({ field }) => <InputComp label="Email" required {...field} error={errors.email?.message} />}
          />
          <Controller
            name="contactNumber"
            control={control}
            defaultValue=""
            render={({ field }) => <InputComp label="Contact Number" icon="fa-solid fa-phone" {...field} />}
          />
          <Controller
            name="showContactNumber"
            control={control}
            defaultValue={true}
            render={({ field }) => (
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="showContactNumber"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="showContactNumber">
                  Show my contact number on my public portfolio
                </label>
              </div>
            )}
          />
          <Controller
            name="address"
            control={control}
            defaultValue=""
            render={({ field }) => <TextareaInput label="Address" rows={2} {...field} />}
          />
        </section>

        <section className="card admin-profile-section">
          <header className="admin-profile-section-header">
            <i className="fa-solid fa-pen-nib"></i> Bio &amp; Objective
          </header>
          <Controller
            name="bio"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <>
                <TextareaInput label="Bio" rows={4} {...field} />
                <small className="admin-hint">
                  Tip: write <code>{"{{experience}}"}</code> anywhere you'd mention your years of experience —
                  it's replaced with the live-calculated duration (e.g. "5 years 7 months") so it never goes
                  stale.
                </small>
              </>
            )}
          />
          <Controller
            name="objective"
            control={control}
            defaultValue=""
            render={({ field }) => <TextareaInput label="Objective" rows={4} {...field} />}
          />
        </section>

        <section className="card admin-profile-section">
          <header className="admin-profile-section-header">
            <i className="fa-solid fa-share-nodes"></i> Social Links
          </header>
          <Controller
            name="linkedinId"
            control={control}
            defaultValue=""
            render={({ field }) => <InputComp label="LinkedIn URL" icon="fa-brands fa-linkedin" {...field} />}
          />
          <Controller
            name="instaId"
            control={control}
            defaultValue=""
            render={({ field }) => <InputComp label="Instagram URL" icon="fa-brands fa-instagram" {...field} />}
          />
          <Controller
            name="facebookId"
            control={control}
            defaultValue=""
            render={({ field }) => <InputComp label="Facebook URL" icon="fa-brands fa-facebook" {...field} />}
          />
          <Controller
            name="twitterId"
            control={control}
            defaultValue=""
            render={({ field }) => <InputComp label="Twitter URL" icon="fa-brands fa-x-twitter" {...field} />}
          />
        </section>

        <section className="card admin-profile-section">
          <header className="admin-profile-section-header">
            <i className="fa-solid fa-signature"></i> Signature
          </header>
          <div className="admin-signature-preview-wrap">
            {signaturePreview ? (
              <img
                src={signaturePreview}
                alt=""
                className="admin-signature-preview"
                style={{ cursor: "pointer" }}
                onClick={() => openSignatureLightbox(0)}
              />
            ) : (
              <div className="admin-signature-placeholder">
                <i className="fa-solid fa-signature"></i>
                <span>No signature uploaded</span>
              </div>
            )}
          </div>
          <div className="admin-signature-actions">
            <label className="admin-upload-btn">
              <i className="fa-solid fa-upload"></i> {signaturePreview ? "Replace signature" : "Upload signature"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  if (!file) return;
                  setSignatureFile(file);
                  setRemoveSignature(false);
                  queueFiles({ signatureFile: file, removeSignature: false });
                }}
              />
            </label>
            {signaturePreview && (
              <button
                type="button"
                className="admin-remove-btn"
                onClick={() => {
                  setSignatureFile(null);
                  setRemoveSignature(true);
                  queueFiles({ signatureFile: null, removeSignature: true });
                }}
              >
                <i className="fa-solid fa-trash"></i> Remove signature
              </button>
            )}
          </div>
          {signatureLightbox}
        </section>

        <section className="card admin-profile-section">
          <header className="admin-profile-section-header">
            <i className="fa-solid fa-file-pdf"></i> Résumé
          </header>
          <div className="admin-signature-preview-wrap">
            <div className="admin-signature-placeholder">
              <i className="fa-solid fa-file-pdf"></i>
              {typeof resumeChange === "string" ? (
                <span>{resumeChange}</span>
              ) : hasResume && profile.resume ? (
                <a href={uploadUrl(profile.resume)} target="_blank" rel="noreferrer">
                  View current résumé
                </a>
              ) : (
                <span>No résumé uploaded — the Résumé buttons stay hidden on your portfolio</span>
              )}
            </div>
          </div>
          <div className="admin-signature-actions">
            <label className="admin-upload-btn">
              <i className="fa-solid fa-upload"></i> {hasResume ? "Replace résumé" : "Upload résumé (PDF)"}
              <input
                type="file"
                accept="application/pdf"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  if (!file) return;
                  setResumeChange(file.name);
                  queueFiles({ resumeFile: file, removeResume: false });
                }}
              />
            </label>
            {hasResume && (
              <button
                type="button"
                className="admin-remove-btn"
                onClick={() => {
                  setResumeChange(true);
                  queueFiles({ resumeFile: null, removeResume: true });
                }}
              >
                <i className="fa-solid fa-trash"></i> Remove résumé
              </button>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}

const STYLE_OPTIONS: { value: PortfolioStyle; label: string; description: string }[] = [
  {
    value: "tech",
    label: "Tech",
    description: "For developers: terminal card, tech stack, code-style accents.",
  },
  {
    value: "classic",
    label: "Classic",
    description: "Clean and elegant with plain wording — suits any profession.",
  },
];

// Email and experience as a quiet meta strip along the bottom of the
// header, separated by dividers rather than pills. Experience links to its
// admin page.
function ProfileMeta({ email, experience }: { email: string; experience: string }) {
  return (
    <ul className="admin-profile-meta">
      <li>
        <i className="fa-solid fa-envelope" aria-hidden="true"></i>
        <span>{email}</span>
      </li>
      <li>
        <i className="fa-solid fa-hourglass-half" aria-hidden="true"></i>
        <Link to="/admin/experience">
          <strong>{experience}</strong> experience
        </Link>
      </li>
    </ul>
  );
}

const STATUS_LABELS: Record<SaveStatus, { icon: string; text: string }> = {
  idle: { icon: "fa-solid fa-cloud", text: "Changes save automatically" },
  pending: { icon: "fa-solid fa-pen", text: "Editing…" },
  saving: { icon: "fa-solid fa-spinner fa-spin", text: "Saving…" },
  saved: { icon: "fa-solid fa-circle-check", text: "All changes saved" },
  invalid: { icon: "fa-solid fa-circle-exclamation", text: "Fix the highlighted fields to save" },
  error: { icon: "fa-solid fa-triangle-exclamation", text: "Couldn't save" },
};

function SaveStatusIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  const { icon, text } = STATUS_LABELS[status];
  return (
    <div className={`admin-profile-status admin-profile-status-${status}`} role="status" aria-live="polite">
      <i className={icon} aria-hidden="true"></i>
      <span>{text}</span>
      {status === "error" && (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
