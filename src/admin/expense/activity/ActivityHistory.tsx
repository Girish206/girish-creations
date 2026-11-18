import { useMemo, useState } from "react";
import { useExpenseActivity, type ActivityFilter } from "../../../api/hooks/expense/useExpenseActivity";
import type { ActivityEntry } from "../../../api/types";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { Button } from "../../components/Button";
import DefaultModal from "../../dms/components/DefaultModal";
import "./activity.css";
import { SearchBox } from "../../components/SearchBox";

// What each kind of change looks like in the list.
function iconFor(action: string) {
  if (action.startsWith("settlement")) return "fa-solid fa-hand-holding-dollar";
  if (action.startsWith("contribution") || action.startsWith("goal")) return "fa-solid fa-piggy-bank";
  if (action.startsWith("group")) return "fa-solid fa-suitcase-rolling";
  if (action === "expense.disputed" || action === "expense.dispute-withdrawn") return "fa-solid fa-flag";
  return "fa-solid fa-receipt";
}

// Removals and objections stand out, since they're what people ask about.
const isWarning = (action: string) =>
  action.endsWith(".deleted") ||
  action.endsWith(".removed") ||
  action === "expense.disputed" ||
  action === "group.reopened";

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// Summaries start with a verb ("Closed Goa Trip"); after a name it reads as
// "Asha closed Goa Trip".
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  const { admin } = useAdminAuth();
  const myId = admin?.sub ? Number(admin.sub) : null;
  const days: { key: string; label: string; items: ActivityEntry[] }[] = [];
  for (const entry of entries) {
    const key = new Date(entry.createdAt).toDateString();
    const last = days[days.length - 1];
    if (last?.key === key) last.items.push(entry);
    else days.push({ key, label: dayLabel(entry.createdAt), items: [entry] });
  }
  return (
    <>
      {days.map((day) => (
        <section key={day.key}>
          <h4 className="admin-activity-day">{day.label}</h4>
          <ul className="admin-activity-list">
            {day.items.map((entry) => (
              <li className="admin-activity-item" key={entry.id}>
                <span className={`admin-activity-icon ${isWarning(entry.action) ? "is-warning" : ""}`}>
                  <i className={iconFor(entry.action)} aria-hidden="true"></i>
                </span>
                <span className="admin-activity-text">
                  <strong>{entry.actor.id === myId ? "You" : entry.actor.name}</strong> {lowerFirst(entry.summary)}
                </span>
                <span className="admin-activity-time">{timeOf(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

// A page's whole history (Expenses or Savings), with a search box.
function ActivityHistory({ filter }: { filter: ActivityFilter }) {
  const { data: entries, isLoading } = useExpenseActivity(filter);
  const [search, setSearch] = useState("");
  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (entries ?? []).filter(
      (entry) => !term || `${entry.actor.name} ${entry.summary}`.toLowerCase().includes(term),
    );
  }, [entries, search]);

  return (
    <div>
      <SearchBox
        className="admin-activity-search"
        placeholder="Search a name, group or goal…"
        label="Search history"
        value={search}
        onChange={setSearch}
      />
      {isLoading ? (
        <p>Loading...</p>
      ) : !entries?.length ? (
        <div className="admin-empty-state">Nothing yet. Changes show up here as people make them.</div>
      ) : shown.length === 0 ? (
        <div className="admin-empty-state">Nothing matches that search.</div>
      ) : (
        <ActivityList entries={shown} />
      )}
    </div>
  );
}

// The "History" button in a page's header, opening that page's history.
// iconClassName: render a bare icon button with that class instead of the
// labelled outline button (for compact headers).
export function HistoryButton({
  filter,
  title,
  iconClassName,
}: {
  filter: ActivityFilter;
  title: string;
  iconClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {iconClassName ? (
        <button type="button" className={iconClassName} onClick={() => setOpen(true)} title={title} aria-label={title}>
          <i className="fa-solid fa-clock-rotate-left"></i>
        </button>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <i className="fa-solid fa-clock-rotate-left"></i> History
        </Button>
      )}
      {open && (
        <DefaultModal
          title={title}
          onClose={() => setOpen(false)}
          showFooter={false}
          size="lg"
          component={<ActivityHistory filter={filter} />}
        />
      )}
    </>
  );
}

// One record's history (an expense, a group, a goal, daily splits), folded
// away under its details until asked for.
export function HistorySection({ filter }: { filter: ActivityFilter }) {
  const [open, setOpen] = useState(false);
  const { data: entries, isLoading } = useExpenseActivity(filter, open);
  return (
    <div className="admin-history-section">
      <button
        type="button"
        className="admin-history-toggle"
        aria-expanded={open}
        onClick={() => setOpen((shown) => !shown)}
      >
        <i className="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> History
        <i
          className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"} admin-history-chevron`}
          aria-hidden="true"
        ></i>
      </button>
      {open &&
        (isLoading ? (
          <p className="admin-history-empty">Loading...</p>
        ) : !entries?.length ? (
          <p className="admin-history-empty">No changes recorded yet.</p>
        ) : (
          <ActivityList entries={entries} />
        ))}
    </div>
  );
}
