import { router } from "../routes/router";

// The site installs as two separate apps: admin pages advertise the admin
// manifest (opens into /admin), every other page the portfolio manifest
// (opens into the people directory). Distinct manifest ids keep them apart.
const ADMIN_MANIFEST = "/admin.webmanifest";
const PORTFOLIO_MANIFEST = "/portfolio.webmanifest";

const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

function syncManifestLink(pathname: string) {
  const admin = isAdminPath(pathname);
  // iOS "Add to Home Screen" names the icon from this meta tag.
  document
    .querySelector('meta[name="apple-mobile-web-app-title"]')
    ?.setAttribute("content", admin ? "GC Admin" : "Girish Creations");

  const href = admin ? ADMIN_MANIFEST : PORTFOLIO_MANIFEST;
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (link?.getAttribute("href") === href) return;
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  link.href = href;
}

export function setupAppManifest() {
  syncManifestLink(router.state.location.pathname);
  router.subscribe((state) => syncManifestLink(state.location.pathname));
}
