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
  // Null for a guest member — added purely to appear in pickers, no login.
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
  hasExpensesAccess: boolean;
  hasSavingsAccess: boolean;
  createdAt: string;
  // Expenses, savings etc. pointing at this person. 0 = can be deleted
  // outright; otherwise they can only be deactivated.
  linkedRecords: number;
}

export type CategoryIconType = "icon" | "text" | "image";

export interface ExpenseCategory {
  id: number;
  name: string;
  // Null on categories saved before icons existed — see categoryIcons.ts.
  iconType: CategoryIconType | null;
  // Font Awesome class, short text/emoji, or an uploaded image path.
  icon: string | null;
  createdAt: string;
}

// A repayment between two members that settles part of a group's split
// balances ("Ravi paid Girish back ₹1,200").
export interface ExpenseGroupSettlement {
  id: number;
  amount: string;
  date: string;
  createdAt: string;
  expenseGroupId: number;
  fromAdminUserId: number;
  fromAdminUser: AdminUserRef;
  toAdminUserId: number;
  toAdminUser: AdminUserRef;
}

// Ad-hoc bucket for related expenses, e.g. "Goa Trip 2026".
export interface ExpenseGroup {
  id: number;
  name: string;
  // Optional trip window — when set, its expenses must be dated inside it.
  startDate: string | null;
  endDate: string | null;
  // Non-null = settled and closed; its expenses are frozen until reopened.
  closedAt: string | null;
  createdAt: string;
  settlements: ExpenseGroupSettlement[];
  // The people on the trip/event — any of them can be marked as having paid
  // one of its expenses. Empty on groups created before members existed.
  members: ExpenseGroupMember[];
}

export interface ExpenseGroupMember {
  id: number;
  adminUserId: number;
  adminUser: AdminUserRef;
}

export interface ExpenseGroupRef {
  id: number;
  name: string;
}

export interface SavingsGoalRef {
  id: number;
  name: string;
}

export interface ExpenseSplitParticipant {
  id: number;
  shareAmount: string;
  adminUserId: number;
  adminUser: AdminUserRef;
}

export interface Expense {
  id: number;
  amount: string;
  date: string;
  description: string | null;
  createdAt: string;
  categoryId: number;
  category: ExpenseCategory;
  paidByAdminUserId: number;
  paidBy: AdminUserRef;
  // Who logged it; null on expenses from before this was recorded.
  createdByAdminUserId: number | null;
  savingsGoalId: number | null;
  savingsGoal: SavingsGoalRef | null;
  expenseGroupId: number | null;
  expenseGroup: ExpenseGroupRef | null;
  splitParticipants: ExpenseSplitParticipant[];
}

export interface SavingsContribution {
  id: number;
  amount: string;
  date: string;
  createdAt: string;
  goalId: number;
  contributedByAdminUserId: number;
  contributedBy: AdminUserRef;
}

export interface SavingsGoalMember {
  id: number;
  adminUserId: number;
  adminUser: AdminUserRef;
}

export interface SavingsGoal {
  id: number;
  name: string;
  targetAmount: string | null;
  targetDate: string | null;
  bankName: string | null;
  accountHolderAdminUserId: number | null;
  accountHolder: AdminUserRef | null;
  // Non-null = closed: no more contributions, hidden from "Spent From".
  closedAt: string | null;
  createdAt: string;
  // Null for legacy goals created before per-goal ownership existed.
  createdBy: AdminUserRef | null;
  contributions: SavingsContribution[];
  // Empty = visible to everyone with Savings access. Non-empty = restricted
  // to just these people (plus the owner).
  members: SavingsGoalMember[];
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
