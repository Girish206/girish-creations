import { FaFacebook, FaFilePdf, FaInstagram, FaLinkedin } from "react-icons/fa6";
import { useProfile } from "../api/hooks/useProfile";
import { uploadUrl } from "../api/client";
import { CopyEmailButton } from "../components/CopyEmailButton";
import { formatBio } from "../utils/bio";
import { useImageLightbox } from "../components/lightbox/useImageLightbox";

export function ProfileCard() {
  const { data: profile, isLoading } = useProfile();
  const profileImageUrl = profile ? uploadUrl(profile.profilePicture) : undefined;
  const { openAt, lightbox } = useImageLightbox(profileImageUrl ? [profileImageUrl] : []);

  if (isLoading || !profile) {
    return (
      <div className="card profile-card">
        <div className="card-body">
          <div className="image text-center">
            <div
              style={{
                maxHeight: 230,
                width: 230,
                height: 230,
                borderRadius: "50%",
                background: "#eee",
                margin: "0 auto",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card profile-card">
      <div className="card-body">
        <div className="image text-center">
          <img
            src={profileImageUrl}
            id="profileimage"
            style={{ maxHeight: 230, width: 230, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }}
            alt={profile.fullName}
            onClick={() => profileImageUrl && openAt(0)}
          />
        </div>
        {lightbox}
        <div className="text">
          <h3 className="card-title">{profile.fullName} 👋</h3>
          <p>{formatBio(profile.bio, profile.formattedExperience)}</p>
          <div className="common-button-groups">
            <a className="btn btn-call" target="_blank" rel="noreferrer" href="/assets/resume/Girish S Resume.pdf">
              <FaFilePdf /> Resume
            </a>
            <CopyEmailButton email={profile.email} />
          </div>
          <div className="social-media-icon">
            <ul className="list-unstyled">
              {profile.linkedinId && (
                <li>
                  <a href={profile.linkedinId} target="_blank" rel="noreferrer">
                    <FaLinkedin />
                  </a>
                </li>
              )}
              {profile.instaId && (
                <li>
                  <a href={profile.instaId} target="_blank" rel="noreferrer">
                    <FaInstagram />
                  </a>
                </li>
              )}
              {profile.facebookId && (
                <li>
                  <a href={profile.facebookId} target="_blank" rel="noreferrer">
                    <FaFacebook />
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
