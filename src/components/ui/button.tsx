import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[6px] font-medium transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15";

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-soft",
  secondary: "border border-line bg-surface text-ink-soft hover:bg-surface-muted",
  danger: "border border-pale-red-ink/25 bg-surface text-pale-red-ink hover:bg-pale-red",
  ghost: "text-muted hover:text-ink",
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
): string {
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, size, className)} {...props} />;
}
