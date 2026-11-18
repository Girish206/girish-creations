import type { AdminUserRef } from "../../api/types";

// How a picker names someone. Two people with the same name get the hint the
// server adds ("Giri · added by Ravi"), so the right one can be picked.
export function memberLabel(member: AdminUserRef) {
  const name = member.name || member.email || "Unknown member";
  return member.hint ? `${name} · ${member.hint}` : name;
}
