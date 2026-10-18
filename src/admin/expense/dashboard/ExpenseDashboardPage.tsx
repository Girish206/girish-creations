import { Link } from "react-router-dom";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useExpenses } from "../../../api/hooks/expense/useExpenses";
import { useSavingsGoals } from "../../../api/hooks/expense/useSavingsGoals";
import { useExpenseCategories } from "../../../api/hooks/expense/useExpenseCategories";
import { formatCurrency } from "../currency";
import "../../dms/css/adminDisplays.css";
import "../../admin.css";

export function ExpenseDashboardPage() {
  const { admin } = useAdminAuth();
  const hasExpenses = Boolean(admin?.hasExpensesAccess);
  const hasSavings = Boolean(admin?.hasSavingsAccess);

  const { data: expenses } = useExpenses(hasExpenses);
  const { data: savingsGoals } = useSavingsGoals(hasSavings);
  const { data: categories } = useExpenseCategories(hasExpenses);

  const totalExpenses = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
  const totalSaved = (savingsGoals ?? []).reduce(
    (sum, g) => sum + g.contributions.reduce((s, c) => s + Number(c.amount), 0),
    0,
  );

  // Each stat is only shown if the account actually has that section's
  // access — otherwise its query above is disabled and would show nothing
  // useful anyway (and would just 403 in the background).
  const stats = [
    hasExpenses && {
      label: "Total Expenses",
      value: expenses ? formatCurrency(totalExpenses) : "–",
      icon: "fa-solid fa-receipt",
      link: "/admin/expense/expenses",
    },
    hasExpenses && {
      label: "Categories",
      value: categories?.length ?? "–",
      icon: "fa-solid fa-tags",
      link: "/admin/expense/categories",
    },
    hasSavings && {
      label: "Total Saved",
      value: savingsGoals ? formatCurrency(totalSaved) : "–",
      icon: "fa-solid fa-piggy-bank",
      link: "/admin/expense/savings",
    },
  ].filter((stat): stat is Exclude<typeof stat, false> => stat !== false);

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
          <span className="admin-dashboard-hero-badge">Group Finances</span>
          <h1>Welcome back{admin?.name ? `, ${admin.name}` : ""}</h1>
          <p>Here's a snapshot of the group's expenses and savings.</p>
        </div>
        <span className="admin-dashboard-hero-date">
          <i className="fa-solid fa-calendar-days"></i> {today}
        </span>
      </div>

      {stats.length === 0 ? (
        <div className="admin-empty-state">No sections enabled for your account yet.</div>
      ) : (
        <div className="admin-card-grid">
          {stats.map((stat) => (
            <Link to={stat.link} className="card admin-item-card admin-dashboard-stat-card" key={stat.label}>
              <div className="admin-item-card-header">
                <div className="admin-item-card-heading">
                  <div className="admin-item-card-icon">
                    <i className={stat.icon}></i>
                  </div>
                  <div>
                    <div className="admin-dashboard-stat-value">{stat.value}</div>
                    <p className="admin-item-card-subtitle">{stat.label}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
