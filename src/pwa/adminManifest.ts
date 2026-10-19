import { router } from "../routes/router";

// Only admin pages advertise the web app manifest, so the browser offers
// "Install app" there and the installed app opens straight into /admin.
const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

function syncManifestLink(pathname: string) {
  const existing = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (isAdminPath(pathname)) {
    if (existing) return;
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/admin.webmanifest";
    document.head.appendChild(link);
  } else {
    existing?.remove();
  }
}

export function setupAdminManifest() {
  syncManifestLink(router.state.location.pathname);
  router.subscribe((state) => syncManifestLink(state.location.pathname));
}
