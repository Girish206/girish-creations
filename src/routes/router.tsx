import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { HomePage } from "../pages/HomePage";
import { AboutPage } from "../pages/AboutPage";
import { ContactPage } from "../pages/ContactPage";
import { ServicesPage } from "../pages/ServicesPage";
import { BlogListPage } from "../pages/blog/BlogListPage";
import { BlogDetailPage } from "../pages/blog/BlogDetailPage";
import { ProjectsListPage } from "../pages/projects/ProjectsListPage";
import { ProjectDetailPage } from "../pages/projects/ProjectDetailPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProtectedRoute, RequireModuleAccess, RequireSubModuleAccess } from "../admin/ProtectedRoute";

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
// Two module trees share the same LayoutWrapper/Sidebar shell (which reads
// the URL to pick the right menu) but are each wrapped in RequireModuleAccess
// so an account without that module's access flag gets redirected rather
// than seeing a 403 from every request.
export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/services", element: <ServicesPage /> },
      { path: "/blog", element: <BlogListPage /> },
      { path: "/blog/:slug", element: <BlogDetailPage /> },
      { path: "/projects", element: <ProjectsListPage /> },
      { path: "/projects/:id", element: <ProjectDetailPage /> },
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
        element: <RequireModuleAccess module="portfolio" />,
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
                path: "certifications",
                lazy: async () => {
                  const { AdminCertificationsList } = await import(
                    "../admin/certifications/AdminCertificationsList"
                  );
                  return { Component: AdminCertificationsList };
                },
              },
              {
                path: "skills",
                lazy: async () => {
                  const { AdminSkillsList } = await import("../admin/skills/AdminSkillsList");
                  return { Component: AdminSkillsList };
                },
              },
              {
                path: "tools",
                lazy: async () => {
                  const { AdminToolsList } = await import("../admin/tools/AdminToolsList");
                  return { Component: AdminToolsList };
                },
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
            ],
          },
        ],
      },
      {
        element: <RequireModuleAccess module="expense" />,
        children: [
          {
            path: "/admin/expense",
            lazy: async () => {
              const { default: AdminLayoutWrapper } = await import("../admin/dms/layout/LayoutWrapper");
              return { Component: AdminLayoutWrapper };
            },
            children: [
              {
                index: true,
                lazy: async () => {
                  const { ExpenseDashboardPage } = await import("../admin/expense/dashboard/ExpenseDashboardPage");
                  return { Component: ExpenseDashboardPage };
                },
              },
              {
                // Categories + Expenses share the "expenses" sub-access flag.
                element: <RequireSubModuleAccess subModule="expenses" />,
                children: [
                  {
                    path: "categories",
                    lazy: async () => {
                      const { AdminExpenseCategoriesList } = await import(
                        "../admin/expense/categories/AdminExpenseCategoriesList"
                      );
                      return { Component: AdminExpenseCategoriesList };
                    },
                  },
                  {
                    path: "expenses",
                    lazy: async () => {
                      const { AdminExpensesList } = await import("../admin/expense/expenses/AdminExpensesList");
                      return { Component: AdminExpensesList };
                    },
                  },
                ],
              },
              {
                element: <RequireSubModuleAccess subModule="investments" />,
                children: [
                  {
                    path: "investments",
                    lazy: async () => {
                      const { AdminInvestmentsList } = await import(
                        "../admin/expense/investments/AdminInvestmentsList"
                      );
                      return { Component: AdminInvestmentsList };
                    },
                  },
                ],
              },
              {
                element: <RequireSubModuleAccess subModule="savings" />,
                children: [
                  {
                    path: "savings",
                    lazy: async () => {
                      const { AdminSavingsGoalsList } = await import(
                        "../admin/expense/savings/AdminSavingsGoalsList"
                      );
                      return { Component: AdminSavingsGoalsList };
                    },
                  },
                ],
              },
              {
                // Owner-only server-side; the Sidebar also only shows this
                // link to owners, so no extra client-side guard needed here.
                path: "admin-users",
                lazy: async () => {
                  const { AdminAccountsList } = await import("../admin/expense/admin-users/AdminAccountsList");
                  return { Component: AdminAccountsList };
                },
              },
            ],
          },
        ],
      },
    ],
  },
]);
