import { FaLocationDot, FaPhoneVolume, FaSquareEnvelope } from "react-icons/fa6";
import { ProfileCard } from "../layouts/ProfileCard";
import { ContactForm } from "../components/ContactForm";
import { useProfile } from "../api/hooks/useProfile";

export function ContactPage() {
  const { data: profile } = useProfile();

  return (
    <>
      <section className="content-box-area mt-4">
        <div className="container">
          <div className="row g-4">
            <div className="col-xl-4">
              <ProfileCard />
            </div>
            <div className="col-xl-8">
              <div className="card content-box-card">
                <div className="card-body portfolio-card contact-card">
                  <div className="top-info">
                    <div className="text">
                      <h1 className="main-title">
                        Let's 👋 <span>Work</span> Together
                      </h1>
                      <p>
                        Have a project in mind, an opportunity to discuss, or just want to say hello? Send a message
                        below and I'll get back to you.
                      </p>
                    </div>
                  </div>

                  <div className="contact-area">
                    <div className="top-info">
                      <div className="row mt-3 text">
                        <div className="col-md-6 mt-2">
                          <div className="row">
                            <div className="col-md-12">
                              <h5 className="main-title" style={{ fontSize: 20 }}>
                                <span>
                                  <FaPhoneVolume /> Phone
                                </span>
                              </h5>
                              <p style={{ paddingLeft: 20, marginTop: -20 }}>+91 {profile?.contactNumber}</p>
                            </div>
                            <div className="col-md-12 mt-2">
                              <h5 className="main-title" style={{ fontSize: 20 }}>
                                <span>
                                  <FaSquareEnvelope /> Email
                                </span>
                              </h5>
                              <p style={{ paddingLeft: 20, marginTop: -20 }}>{profile?.email}</p>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6 mt-2">
                          <h5 className="main-title" style={{ fontSize: 20 }}>
                            <span>
                              <FaLocationDot /> Address
                            </span>
                          </h5>
                          <p style={{ paddingLeft: 20, marginTop: -20 }}>{profile?.address}</p>
                        </div>
                      </div>
                    </div>

                    <ContactForm />

                    {profile?.address && (
                      <div className="contact-map-area">
                        <iframe
                          src={`https://www.google.com/maps?q=${encodeURIComponent(profile.address)}&output=embed`}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Location map"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* background shape area start */}
      <div className="background-shapes">
        <div className="shape-1 common-shape">
          <img src="/assets/img/bg/banner-shape-1.png" alt="banner-shape-1" />
        </div>
        <div className="shape-2 common-shape">
          <img src="/assets/img/bg/banner-shape-1.png" alt="banner-shape-1" />
        </div>
        <div className="threed-shape-1 move-with-cursor" data-value="1">
          <img src="/assets/img/bg/object-3d-1.png" alt="object-3d-1" />
        </div>
        <div className="threed-shape-2 move-with-cursor" data-value="1">
          <img src="/assets/img/bg/object-3d-2.png" alt="object-3d-2" />
        </div>
      </div>
      {/* background shape area end */}
    </>
  );
}
