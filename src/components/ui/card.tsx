import type { HTMLAttributes } from "react";

export const cardClassName = "rounded-[12px] border border-line bg-surface shadow-soft";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "article" | "section" | "aside";
};

export function Card({ as: Tag = "div", className = "", ...props }: CardProps) {
  return <Tag className={`${cardClassName} ${className}`.trim()} {...props} />;
}
