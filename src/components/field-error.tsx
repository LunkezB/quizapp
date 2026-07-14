import type { FieldErrors } from "@/lib/action-state";

type FieldErrorProps = {
  fieldErrors: FieldErrors | undefined;
  name: string;
};

export function FieldError({ fieldErrors, name }: FieldErrorProps) {
  const errors = fieldErrors?.[name];

  if (!errors?.length) {
    return null;
  }

  return <p className="mt-1 text-sm text-red-700">{errors[0]}</p>;
}
