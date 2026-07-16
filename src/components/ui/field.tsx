import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const labelClassName = "block text-sm font-medium text-ink-soft";

export const controlClassName =
  "w-full rounded-[8px] border border-line bg-surface px-3 text-ink outline-none transition placeholder:text-faint focus:border-ink/40 focus:ring-2 focus:ring-ink/10";

export const inputClassName = `mt-2 h-11 ${controlClassName}`;
export const selectClassName = `mt-2 h-11 ${controlClassName}`;
export const textareaClassName = `mt-2 py-2.5 ${controlClassName}`;

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`${labelClassName} ${className}`.trim()} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClassName} ${className}`.trim()} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${textareaClassName} ${className}`.trim()} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${selectClassName} ${className}`.trim()} {...props} />;
}
