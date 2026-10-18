import type { CSSProperties } from "react";
import { uploadUrl } from "../../../api/client";
import type { CategoryIconType } from "../../../api/types";
import { avatarColorFor } from "../avatarColor";

export interface CategoryIconProps {
  name: string;
  type: CategoryIconType;
  value: string;
  className?: string;
}

// A category's badge: a Font Awesome glyph or short text on the name's
// avatar colour, or the uploaded image filling the circle.
export function CategoryIcon({ name, type, value, className = "" }: CategoryIconProps) {
  const style: CSSProperties = type === "image" ? {} : { background: avatarColorFor(name) };
  return (
    <span className={`admin-category-icon admin-category-icon-${type} ${className}`.trim()} style={style}>
      {type === "image" ? (
        <img src={uploadUrl(value) ?? value} alt="" />
      ) : type === "text" ? (
        <span className="admin-category-icon-text">{value}</span>
      ) : (
        <i className={`fa-solid ${value}`} aria-hidden="true"></i>
      )}
    </span>
  );
}
