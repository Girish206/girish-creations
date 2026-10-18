import { CtaBand } from "../site/ui";
import { usePageTitle } from "../site/usePageTitle";
import { ServicesSection } from "./home/ServicesSection";

export function ServicesPage() {
  usePageTitle("Services");
  return (
    <>
      <ServicesSection isPage />
      <CtaBand />
    </>
  );
}
