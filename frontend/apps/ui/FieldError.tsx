interface FieldErrorProps {
  id?: string;
  error?: string | string[];
}

export function FieldError({ id, error }: FieldErrorProps) {
  const messages = Array.isArray(error) ? error : error ? [error] : [];
  if (messages.length === 0) return null;

  return (
    <p id={id} className="text-sm text-destructive">
      {messages.join(" ")}
    </p>
  );
}
