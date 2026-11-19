import { createBrowserRouter, Navigate } from "react-router-dom";
import { RouteError } from "../components/RouteError";
import { MainLayout } from "../layouts/MainLayout";
import { PortfolioLayout } from "../layouts/PortfolioLayout";
import { PeopleDirectoryPage } from "../pages/directory/PeopleDirectoryPage";
import { HomePage } from "../pages/HomePage";
import { AboutPage } from "../pages/AboutPage";
import { ExperiencePage } from "../pages/ExperiencePage";
import { SkillsPage } from "../pages/SkillsPage";
import { ServicesPage } from "../pages/ServicesPage";
import { ContactPage } from "../pages/ContactPage";
import { ProjectsListPage } from "../pages/projects/ProjectsListPage";
import { BlogListPage } from "../pages/blog/BlogListPage";
import { BlogDetailPage } from "../pages/blog/BlogDetailPage";
import { ProjectDetailPage } from "../pages/projects/ProjectDetailPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProtectedRoute, RequirePortfolioAccess } from "../admin/ProtectedRoute";

// Every admin route below is lazy-loaded. The DMS-ported admin CSS (e.g.
// Navbar.css's bare `.navbar { ... }`, cards.css's bare `.card { ... }`)
// uses unscoped selectors that collide with the public site's own classes
// (the public Navbar is also `.navbar`, HomePage also uses `.card`). Since
// this is one SPA bundle, a plain top-level `import` of any admin component
// would pull that CSS into the page on first load and bleed into the public
// site permanently (CSS imports aren't unmounted when a component unmounts).
// React Router's route-level `lazy()` defers the import (and therefore the
// CSS) until an /admin/* route actually matches.
//
// The admin tree is wrapped in RequirePortfolioAccess so an account without
// portfolio access gets sent back to sign-in rather than seeing a 403 from
// every request.
export const router = createBrowserRouter([
  {
    // Catches anything that fails to load or render below, including a
    // stale build's missing chunks after a deploy (reloads into the new one).
    errorElement: <RouteError />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: "/", element: <PeopleDirectoryPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
      {
        // One person's portfolio. Static paths (/admin, /admin/login) rank above
        // this dynamic segment, and the server refuses usernames that would
        // collide with them.
        path: "/:username",
        element: <PortfolioLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "about", element: <AboutPage /> },
          { path: "experience", element: <ExperiencePage /> },
          { path: "skills", element: <SkillsPage /> },
          { path: "projects", element: <ProjectsListPage /> },
          { path: "services", element: <ServicesPage /> },
          { path: "contact", element: <ContactPage /> },
          { path: "blog", element: <BlogListPage /> },
          { path: "blog/:slug", element: <BlogDetailPage /> },
          { path: "projects/:id", element: <ProjectDetailPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
      {
        path: "/admin/login",
        lazy: async () => {
          const { AdminLoginPage } = await import("../admin/AdminLoginPage");
          return { Component: AdminLoginPage };
        },
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <RequirePortfolioAccess />,
            children: [
              {
                path: "/admin",
                lazy: async () => {
                  const { default: AdminLayoutWrapper } = await import("../admin/dms/layout/LayoutWrapper");
                  return { Component: AdminLayoutWrapper };
                },
                children: [
                  {
                    index: true,
                    lazy: async () => {
                      const { DashboardHomePage } = await import("../admin/DashboardHomePage");
                      return { Component: DashboardHomePage };
                    },
                  },
                  {
                    path: "profile",
                    lazy: async () => {
                      const { AdminProfileForm } = await import("../admin/profile/AdminProfileForm");
                      return { Component: AdminProfileForm };
                    },
                  },
                  {
                    path: "experience",
                    lazy: async () => {
                      const { AdminExperienceList } = await import("../admin/experience/AdminExperienceList");
                      return { Component: AdminExperienceList };
                    },
                  },
                  {
                    path: "education",
                    lazy: async () => {
                      const { AdminEducationList } = await import("../admin/education/AdminEducationList");
                      return { Component: AdminEducationList };
                    },
                  },
                  {
                    // Skills, tools and certifications share one page, as tabs.
                    path: "skills",
                    lazy: async () => {
                      const { AdminSkillsCredentialsPage } = await import("../admin/skills/AdminSkillsCredentialsPage");
                      return { Component: AdminSkillsCredentialsPage };
                    },
                  },
                  {
                    path: "tools",
                    element: <Navigate to="/admin/skills?tab=tools" replace />,
                  },
                  {
                    path: "certifications",
                    element: <Navigate to="/admin/skills?tab=certifications" replace />,
                  },
                  {
                    path: "projects",
                    lazy: async () => {
                      const { AdminProjectsList } = await import("../admin/projects/AdminProjectsList");
                      return { Component: AdminProjectsList };
                    },
                  },
                  {
                    path: "blog",
                    lazy: async () => {
                      const { AdminBlogList } = await import("../admin/blog/AdminBlogList");
                      return { Component: AdminBlogList };
                    },
                  },
                  {
                    path: "contact",
                    lazy: async () => {
                      const { AdminContactList } = await import("../admin/contact/AdminContactList");
                      return { Component: AdminContactList };
                    },
                  },
                  {
                    // Super admins only — the Sidebar shows the link only to
                    // them and the server enforces it.
                    path: "admin-users",
                    lazy: async () => {
                      const { AdminAccountsList } = await import("../admin/admin-users/AdminAccountsList");
                      return { Component: AdminAccountsList };
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
