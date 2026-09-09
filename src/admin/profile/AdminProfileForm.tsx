import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProfile } from "../../api/hooks/useProfile";
import { useUpdateProfile } from "../../api/hooks/admin/useAdminProfile";
import { uploadUrl } from "../../api/client";
import { useImageLightbox } from "../../components/lightbox/useImageLightbox";
import { Banner } from "../components/Banner";
import InputComp from "../dms/components/InputComp";
import TextareaInput from "../dms/components/TextareaInput";
import CustomButton from "../dms/components/CustomButton";
import "../admin.css";
import "./adminProfile.css";

const schema = z.object({
  fullName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  bio: z.string().optional(),
  objective: z.string().optional(),
  contactNumber: z.string().optional(),
  address: z.string().optional(),
  facebookId: z.string().optional(),
  instaId: z.string().optional(),
  linkedinId: z.string().optional(),
  twitterId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// A bold hero header (gradient banner + floating avatar + always-visible
// Save button) followed by sectioned cards, instead of one long stacked
// form. Fields still use DMS's InputComp/TextareaInput via react-hook-form's
// <Controller> (those components are controlled, with no ref-forwarding).
export function AdminProfileForm() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [removeSignature, setRemoveSignature] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName,
        email: profile.email,
        bio: profile.bio ?? "",
        objective: profile.objective ?? "",
        contactNumber: profile.contactNumber ?? "",
        address: profile.address ?? "",
        facebookId: profile.facebookId ?? "",
        instaId: profile.instaId ?? "",
        linkedinId: profile.linkedinId ?? "",
        twitterId: profile.twitterId ?? "",
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

  async function onSubmit(values: FormValues) {
    await updateProfile.mutateAsync({ ...values, profilePictureFile, signatureFile, removeSignature });
    setProfilePictureFile(null);
    setSignatureFile(null);
    setRemoveSignature(false);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  }

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
        <div className="admin-card-body">No profile exists yet. Create one directly in the database first.</div>
      </div>
    );
  }

  return (
    <form className="admin-profile-page" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="admin-profile-hero">
        <div className="admin-profile-hero-top">
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
                onChange={(e) => setProfilePictureFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {avatarLightbox}
          <div className="admin-profile-hero-info">
            <h1>{profile.fullName}</h1>
            <p>
              <i className="fa-solid fa-envelope"></i> {profile.email}
            </p>
          </div>
        </div>

        <CustomButton
          type="submit"
          className="admin-profile-save-btn"
          disabled={isSubmitting}
          loading={isSubmitting}
          loadingLabel="Saving..."
        >
          <i className="fa-solid fa-check"></i> Save Changes
        </CustomButton>
      </div>

      {savedMessage && <Banner variant="success">Saved.</Banner>}

      <div className="admin-profile-grid">
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
                  setSignatureFile(file);
                  if (file) setRemoveSignature(false);
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
                }}
              >
                <i className="fa-solid fa-trash"></i> Remove signature
              </button>
            )}
          </div>
          {signatureLightbox}
        </section>
      </div>
    </form>
  );
}
