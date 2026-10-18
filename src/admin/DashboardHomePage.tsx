import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "../api/hooks/useProfile";
import { useExperience } from "../api/hooks/useExperience";
import { useEducation } from "../api/hooks/useEducation";
import { useCertifications } from "../api/hooks/useCertifications";
import { useSkills } from "../api/hooks/useSkills";
import { useTools } from "../api/hooks/useTools";
import { useProjectsList } from "../api/hooks/useProjects";
import { useBlogList } from "../api/hooks/useBlogPosts";
import { apiClient } from "../api/client";
import { usePortfolioScope } from "../portfolio/PortfolioScope";
import type { ApiEnvelope, ContactMessage, PaginatedResponse } from "../api/types";
import "./dms/css/adminDisplays.css";
import "./admin.css";

function useContactCount() {
  const scope = usePortfolioScope();
  return useQuery({
    queryKey: ["admin-contact-messages-count", scope?.cacheKey],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<PaginatedResponse<ContactMessage>>>("/admin/contact", {
        params: { page: 1, pageSize: 1 },
      });
      return data.data.total;
    },
  });
}

export function DashboardHomePage() {
  const { data: profile } = useProfile();
  const { data: experience } = useExperience();
  const { data: education } = useEducation();
  const { data: certifications } = useCertifications();
  const { data: skills } = useSkills();
  const { data: tools } = useTools();
  const { data: projectsPage } = useProjectsList(1, 1);
  const { data: blogPage } = useBlogList(1, 1);
  const { data: contactCount } = useContactCount();

  const stats = [
    { label: "Experience", value: experience?.length, icon: "fa-solid fa-briefcase", link: "/admin/experience" },
    { label: "Education", value: education?.length, icon: "fa-solid fa-graduation-cap", link: "/admin/education" },
    {
      label: "Certifications",
      value: certifications?.length,
      icon: "fa-solid fa-certificate",
      link: "/admin/certifications",
    },
    { label: "Skills", value: skills?.length, icon: "fa-solid fa-star", link: "/admin/skills" },
    { label: "Tools", value: tools?.length, icon: "fa-solid fa-toolbox", link: "/admin/tools" },
    {
      label: "Projects",
      value: projectsPage?.total,
      icon: "fa-solid fa-diagram-project",
      link: "/admin/projects",
    },
    { label: "Blog Posts", value: blogPage?.total, icon: "fa-solid fa-blog", link: "/admin/blog" },
    { label: "Contact Messages", value: contactCount, icon: "fa-solid fa-envelope", link: "/admin/contact" },
  ];

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <div className="admin-dashboard-hero">
        <div>
          <span className="admin-dashboard-hero-badge">Dashboard</span>
          <h1>Welcome back{profile ? `, ${profile.fullName}` : ""}</h1>
          <p>Here's what's currently published on your portfolio.</p>
        </div>
        <span className="admin-dashboard-hero-date">
          <i className="fa-solid fa-calendar-days"></i> {today}
        </span>
      </div>

      <div className="admin-card-grid">
        {stats.map((stat) => (
          <Link to={stat.link} className="card admin-item-card admin-dashboard-stat-card" key={stat.label}>
            <div className="admin-item-card-header">
              <div className="admin-item-card-heading">
                <div className="admin-item-card-icon">
                  <i className={stat.icon}></i>
                </div>
                <div>
                  <div className="admin-dashboard-stat-value">{stat.value ?? "–"}</div>
                  <p className="admin-item-card-subtitle">{stat.label}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
