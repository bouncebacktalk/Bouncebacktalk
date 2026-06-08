import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ShieldCheck, User } from "lucide-react";
import { ApiError } from "../../api";
import { Notice, TextField } from "../../ui";
import { usersClient } from "../../users";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient, type CurrentUser } from "../auth";

interface AccountSettingsProps {
  user: CurrentUser;
}

/**
 * Account surface shared by the admin console (/settings) and the member
 * profile page (/profile): edit your display name and change your password.
 */
export function AccountSettings({ user }: AccountSettingsProps) {
  return (
    <div className="grid gap-6">
      <ProfileCard user={user} />
      <PasswordCard />
    </div>
  );
}

function ProfileCard({ user }: { user: CurrentUser }) {
  const [name, setName] = useState(user.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setSaving(true);
    try {
      await usersClient.updateOwnName(name.trim());
      toast.success("Profile updated");
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setError(err.fieldErrors.form?.join(" ") || err.message);
        return;
      }
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your account details.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <TextField
            label="Display name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
            error={fieldErrors.name}
          />
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-foreground">Email</span>
            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
              {user.email}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              Role
              {user.isAdmin ? (
                <Badge>
                  <ShieldCheck /> Admin
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <User /> Member
                </Badge>
              )}
            </span>
            <span>Member since {memberSince}</span>
          </div>
        </CardContent>
        <CardFooter className="mt-6 border-t [.border-t]:pt-6">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    if (newPassword !== confirm) {
      setFieldErrors({ confirm: ["Passwords do not match."] });
      return;
    }

    setSaving(true);
    try {
      await authClient.changePassword({ currentPassword, newPassword });
      toast.success("Password changed", {
        description: "Other devices have been signed out.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setError(err.fieldErrors.form?.join(" ") || err.message);
        return;
      }
      setError(
        err instanceof Error ? err.message : "Could not change password",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Change your password. This signs out your other devices.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <TextField
            required
            label="Current password"
            name="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            error={fieldErrors.currentPassword}
          />
          <TextField
            required
            label="New password"
            name="newPassword"
            type="password"
            minLength={8}
            maxLength={128}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            error={fieldErrors.newPassword}
          />
          <TextField
            required
            label="Confirm new password"
            name="confirm"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            error={fieldErrors.confirm}
          />
        </CardContent>
        <CardFooter className="mt-6 border-t [.border-t]:pt-6">
          <Button type="submit" disabled={saving}>
            {saving ? "Updating..." : "Change password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
