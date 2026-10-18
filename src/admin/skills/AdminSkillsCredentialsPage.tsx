import { useSearchParams } from "react-router-dom";
import { useSkills } from "../../api/hooks/useSkills";
import { useTools } from "../../api/hooks/useTools";
import { useCertifications } from "../../api/hooks/useCertifications";
import { AdminSkillsList } from "./AdminSkillsList";
import { AdminToolsList } from "../tools/AdminToolsList";
import { AdminCertificationsList } from "../certifications/AdminCertificationsList";
import "./skillsCredentials.css";

const TABS = [
  { key: "skills", label: "Skills", icon: "fa-solid fa-star" },
  { key: "tools", label: "Tools", icon: "fa-solid fa-toolbox" },
  { key: "certifications", label: "Certifications", icon: "fa-solid fa-certificate" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function isTabKey(value: string | null): value is TabKey {
  return TABS.some((tab) => tab.key === value);
}

// One menu item for the three short lists — skills, tools and
// certifications — as tabs. The tab lives in ?tab= so links (and the old
// /admin/tools, /admin/certifications URLs) can open a specific one.
export function AdminSkillsCredentialsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const active: TabKey = isTabKey(requested) ? requested : "skills";

  const counts: Record<TabKey, number | undefined> = {
    skills: useSkills().data?.length,
    tools: useTools().data?.length,
    certifications: useCertifications().data?.length,
  };

  return (
    <div className="admin-skills-credentials">
      <div className="admin-tabs" role="tablist" aria-label="Expertise">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={active === tab.key}
            aria-controls={`panel-${tab.key}`}
            className={`admin-tab${active === tab.key ? " is-active" : ""}`}
            onClick={() => setParams(tab.key === "skills" ? {} : { tab: tab.key }, { replace: true })}
          >
            <i className={tab.icon} aria-hidden="true"></i>
            <span>{tab.label}</span>
            {counts[tab.key] !== undefined && <span className="admin-tab-count">{counts[tab.key]}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
        {active === "skills" && <AdminSkillsList />}
        {active === "tools" && <AdminToolsList />}
        {active === "certifications" && <AdminCertificationsList />}
      </div>
    </div>
  );
}
