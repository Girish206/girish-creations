import { useProfile } from "../api/hooks/useProfile";
import { useExperience } from "../api/hooks/useExperience";
import { useSkills } from "../api/hooks/useSkills";
import { useTools } from "../api/hooks/useTools";
import { useProjectsList } from "../api/hooks/useProjects";
import { useBlogList } from "../api/hooks/useBlogPosts";
import { CtaBand } from "../site/ui";
import { usePageTitle } from "../site/usePageTitle";
import { HeroSection } from "./home/HeroSection";
import { BentoSection } from "./home/BentoSection";
import { ProjectsSection } from "./home/ProjectsSection";
import { BlogSection } from "./home/BlogSection";
import { ALL_PROJECTS } from "./home/constants";

// Overview: intro, an "at a glance" grid and the latest projects and
// articles, each linking to the page that shows everything.
export function HomePage() {
  usePageTitle();
  const { data: profile } = useProfile();
  const { data: experience } = useExperience();
  const { data: skills } = useSkills();
  const { data: tools } = useTools();
  const { data: projectsPage, isLoading: projectsLoading } = useProjectsList(1, ALL_PROJECTS);
  const { data: blogPage } = useBlogList(1, 3);

  return (
    <>
      <HeroSection
        profile={profile}
        experience={experience}
        skills={skills}
        tools={tools}
        projectCount={projectsPage?.total}
      />
      <BentoSection
        profile={profile}
        experience={experience}
        skills={skills}
        tools={tools}
        projectCount={projectsPage?.total}
      />
      <ProjectsSection projects={projectsPage?.items} isLoading={projectsLoading} featured={3} />
      <BlogSection posts={blogPage?.items} total={blogPage?.total ?? 0} />
      <CtaBand />
    </>
  );
}
