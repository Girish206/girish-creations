export interface UserProfile {
  id: number;
  // Public URL handle: the portfolio lives at /<username>.
  username: string | null;
  fullName: string;
  email: string;
  bio: string | null;
  objective: string | null;
  profilePicture: string | null;
  signature: string | null;
  // Null on the public site when the owner hides it (showContactNumber).
  contactNumber: string | null;
  // Null on profiles saved before the setting existed — treated as shown.
  showContactNumber: boolean | null;
  address: string | null;
  totalExperience: string;
  formattedExperience: string;
  formattedExperienceInYears: number;
  facebookId: string | null;
  instaId: string | null;
  linkedinId: string | null;
  twitterId: string | null;
  resume: string | null;
  // Null on profiles saved before the choice existed — treated as "tech".
  portfolioStyle: PortfolioStyle | null;
  // Colour shade of the classic design; null means "emerald".
  portfolioAccent: PortfolioAccent | null;
  // Owned by the site's creator: only their portfolio shows freelance /
  // hire-me content.
  isCreator: boolean;
  // Rows per section, so empty pages and nav links can be hidden.
  counts: PortfolioCounts;
}

// "tech": developer look (terminal, tech stack, monospace accents).
// "classic": plain, editorial look for people outside tech.
export type PortfolioStyle = "tech" | "classic";

export type PortfolioAccent = "emerald" | "ocean" | "indigo" | "rose" | "sunset" | "violet";

export interface PortfolioCounts {
  experience: number;
  education: number;
  certifications: number;
  skills: number;
  tools: number;
  projects: number;
  blogPosts: number;
}

// One card in the public people directory (GET /portfolios).
export interface PortfolioSummary {
  id: number;
  username: string;
  fullName: string;
  profilePicture: string | null;
  bio: string | null;
  isCreator: boolean;
  jobTitle: string | null;
  // Only set while the latest role is ongoing.
  companyName: string | null;
  projectCount: number;
  formattedExperience: string;
  formattedExperienceInYears: number;
}

export interface ExperienceDetails {
  id: number;
  jobTitle: string;
  companyName: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
  userProfileId: number;
}

export interface EducationDetails {
  id: number;
  course: string;
  institutionName: string;
  specialization: string | null;
  startDate: string;
  endDate: string | null;
  grade: string;
  userProfileId: number;
}

export interface CertificationDetails {
  id: number;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  userProfileId: number;
}

export type ProficiencyLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export interface Skill {
  id: number;
  skillName: string;
  proficiencyLevel: ProficiencyLevel;
  userProfileId: number;
}

export interface Tool {
  id: number;
  toolName: string;
  userProfileId: number;
}

export interface ProjectDetails {
  id: number;
  title: string;
  description: string;
  technologiesUsed: string;
  projectUrl: string | null;
  image: string | null;
  startDate: string;
  endDate: string | null;
  userProfileId: number;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  publishedDate: string;
  tags: string | null;
  userProfileId: number;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  sentAt: string;
  userProfileId: number | null;
}

export interface AdminUserRef {
  id: number;
  // Null for a guest member, who can't log in.
  email: string | null;
  name: string | null;
}

export interface AdminUserAccount extends AdminUserRef {
  isOwner: boolean;
  // Always true for the owner.
  isSuperAdmin: boolean;
  isActive: boolean;
  hasLogin: boolean;
  hasPortfolioAccess: boolean;
  // Digits only; an alternative to email for signing in.
  mobile: string | null;
  // Last time the welcome email was sent to them from the admin side.
  welcomeEmailSentAt: string | null;
  createdAt: string;
  // Records pointing at this person. 0 = can be deleted outright;
  // otherwise they can only be deactivated.
  linkedRecords: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  data: T;
}
