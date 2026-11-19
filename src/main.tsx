import "./styles/brand.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { showMutationError } from "./api/mutationErrors";
import { AppToaster } from "./components/AppToaster";
import { setupAppManifest } from "./pwa/appManifest";
import { reloadForNewBuild } from "./utils/staleBuild";
import { setupServiceWorker } from "./pwa/serviceWorker";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    // A mutation that renders its own error UI opts out via
    // meta: { skipGlobalError: true } (e.g. the public contact form).
    onError: (error, _variables, _context, mutation) => {
      if (!mutation.meta?.skipGlobalError) showMutationError(error);
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

setupAppManifest();

setupServiceWorker();

// A chunk from an older build failed to load (it's gone after a deploy):
// reload into the new build instead of showing an error.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForNewBuild()) event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <RouterProvider router={router} />
        <AppToaster />
      </AdminAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
