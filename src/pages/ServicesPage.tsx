import { useProfile } from "../api/hooks/useProfile";
import { CtaBand } from "../site/ui";
import { usePageTitle } from "../site/usePageTitle";
import { ServicesSection } from "./home/ServicesSection";
import { NotFoundPage } from "./NotFoundPage";

// Freelance services are offered only on the site creator's portfolio;
// anyone else's /services is a 404.
export function ServicesPage() {
  usePageTitle("Services");
  const { data: profile } = useProfile();
  if (!profile) return null;
  if (!profile.isCreator) return <NotFoundPage />;
  return (
    <>
      <ServicesSection isPage />
      <CtaBand />
    </>
  );
}
