import { useProfile } from "../api/hooks/useProfile";
import { usePageTitle } from "../site/usePageTitle";
import { ContactSection } from "./home/ContactSection";

export function ContactPage() {
  usePageTitle("Contact");
  const { data: profile } = useProfile();
  return <ContactSection isPage profile={profile} />;
}
