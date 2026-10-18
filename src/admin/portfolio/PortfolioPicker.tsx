import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { ApiEnvelope } from "../../api/types";
import "./portfolioPicker.css";

interface ManageablePortfolio {
  id: number;
  name: string | null;
  email: string | null;
  isActive: boolean;
  fullName: string | null;
  username: string | null;
}

function label(account: ManageablePortfolio) {
  const name = account.fullName || account.name || account.email || `Account ${account.id}`;
  return account.isActive ? name : `${name} (deactivated)`;
}

// Super admins only: switches every admin portfolio page (profile,
// experience, projects, contact messages, ...) to another account's portfolio.
export function PortfolioPicker({
  adminId,
  target,
  onChange,
}: {
  adminId: string;
  target: string | null;
  onChange: (adminUserId: string | null) => void;
}) {
  const { data: accounts } = useQuery({
    queryKey: ["portfolio-accounts"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<ManageablePortfolio[]>>("/admin/portfolio-accounts");
      return data.data;
    },
  });

  const others = accounts?.filter((account) => String(account.id) !== adminId) ?? [];
  const selected = target ? accounts?.find((account) => String(account.id) === target) : undefined;
  const viewingOther = Boolean(target && target !== adminId);

  return (
    <div className={`admin-portfolio-picker${viewingOther ? " is-other" : ""}`}>
      <i className="fa-solid fa-user-shield" aria-hidden="true"></i>
      <label htmlFor="admin-portfolio-picker">Managing portfolio of</label>
      <select
        id="admin-portfolio-picker"
        value={viewingOther ? target! : ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Myself</option>
        {others.map((account) => (
          <option key={account.id} value={account.id}>
            {label(account)}
          </option>
        ))}
      </select>
      {viewingOther && selected && (
        <span className="admin-portfolio-picker-note">
          Changes you make here are saved to {label(selected)}'s portfolio.
          {selected.username && (
            <>
              {" "}
              <a href={`/${selected.username}`} target="_blank" rel="noreferrer">
                View it <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
              </a>
            </>
          )}
        </span>
      )}
    </div>
  );
}
