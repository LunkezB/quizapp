import type { HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "green" | "blue" | "yellow" | "red";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-muted",
  green: "bg-pale-green text-pale-green-ink",
  blue: "bg-pale-blue text-pale-blue-ink",
  yellow: "bg-pale-yellow text-pale-yellow-ink",
  red: "bg-pale-red text-pale-red-ink",
};

export function badgeClassName(tone: BadgeTone = "neutral", extra = ""): string {
  return `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-[0.06em] ${tones[tone]} ${extra}`.trim();
}

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return <span className={badgeClassName(tone, className)} {...props} />;
}
