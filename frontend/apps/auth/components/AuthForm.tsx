import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../../api";
import { Notice, TextField } from "../../ui";
import { Button } from "@/components/ui/button";
import { authClient, type CurrentUser } from "../auth";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
  onAuthenticated?: (user: CurrentUser) => void;
  /** Where to go after auth. Defaults to role-based: admins -> /dashboard, members -> /profile. */
  redirectTo?: string;
}

export function AuthForm({ mode, onAuthenticated, redirectTo }: AuthFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const user = isRegister
        ? await authClient.register({
            email,
            password,
            name: name.trim() || undefined,
          })
        : await authClient.login({ email, password });
      onAuthenticated?.(user);
      // Role-based home: admins land in the console, members on their profile.
      window.location.href =
        redirectTo ?? (user.isAdmin ? "/dashboard" : "/profile");
    } catch (err) {
      if (err instanceof ApiError) {
        const errors = err.fieldErrors;
        setFieldErrors(errors);
        const formError = errors.form?.join(" ") || fieldErrorFallback(errors);
        setError(formError || err.message);
        return;
      }
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {isRegister && (
        <TextField
          label="Name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          error={fieldErrors.name}
        />
      )}

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

      <TextField
        required
        label="Password"
        name="password"
        type="password"
        minLength={isRegister ? 8 : 1}
        maxLength={128}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete={isRegister ? "new-password" : "current-password"}
        error={fieldErrors.password}
      />

      {error && <Notice tone="danger">{error}</Notice>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Working..." : isRegister ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}

function fieldErrorFallback(errors: Record<string, string[]>): string {
  const fields = Object.keys(errors).filter((key) => key !== "form");
  return fields.length ? "Please fix the highlighted fields." : "";
}
