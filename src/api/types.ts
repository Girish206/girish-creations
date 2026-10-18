export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  bio: string | null;
  objective: string | null;
  profilePicture: string | null;
  signature: string | null;
  contactNumber: string | null;
  address: string | null;
  totalExperience: string;
  formattedExperience: string;
  formattedExperienceInYears: number;
  facebookId: string | null;
  instaId: string | null;
  linkedinId: string | null;
  twitterId: string | null;
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
