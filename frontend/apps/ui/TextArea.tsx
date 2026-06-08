import type { ReactNode, TextareaHTMLAttributes } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldError } from "./FieldError";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: ReactNode;
  error?: string | string[];
}

/** Labeled multi-line input on top of shadcn Textarea. */
export function TextArea({
  label,
  hint,
  error,
  id,
  className,
  rows = 4,
  ...props
}: TextAreaProps) {
  const fieldId =
    id ?? (typeof props.name === "string" ? `${props.name}-field` : undefined);
  const errorId = fieldId ? `${fieldId}-error` : undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <Textarea
        id={fieldId}
        rows={rows}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        className={className}
        {...props}
      />
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <FieldError id={errorId} error={error} />
    </div>
  );
}
