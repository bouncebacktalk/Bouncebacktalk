import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError } from "../../api";
import { Notice, Spinner, TextArea, TextField } from "../../ui";
import { Button } from "@/components/ui/button";
import { contactClient } from "../contact";

interface ContactFormProps {
  source?: string;
}

export function ContactForm({ source = "homepage" }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(false);
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await contactClient.submit({
        name: name.trim() || undefined,
        email,
        company: company.trim() || undefined,
        message,
        source,
        website,
      });
      setSent(true);
      setMessage("");
    } catch (err) {
      if (err instanceof ApiError) {
        const errors = err.fieldErrors;
        setFieldErrors(errors);
        setError(
          errors.form?.join(" ") ||
            (Object.keys(errors).length
              ? "Please fix the highlighted fields."
              : err.message),
        );
        return;
      }
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {sent ? (
        <Notice tone="success">Thanks. Your message has been received.</Notice>
      ) : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          error={fieldErrors.name}
        />
        <TextField
          required
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          error={fieldErrors.email}
        />
      </div>

      <TextField
        label="Company"
        name="company"
        value={company}
        onChange={(event) => setCompany(event.target.value)}
        autoComplete="organization"
        error={fieldErrors.company}
      />

      <TextArea
        required
        label="Message"
        name="message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        error={fieldErrors.message}
      />

      <label className="hidden">
        Website
        <input
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </label>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <Spinner className="text-primary-foreground" />
        ) : (
          <Send aria-hidden="true" />
        )}
        Send message
      </Button>
    </form>
  );
}
