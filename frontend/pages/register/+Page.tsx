import { UserPlus } from "lucide-react";
import { AuthCard, AuthForm, Shell } from "../../apps/auth";

export { Page };

function Page() {
  return (
    <Shell>
      <AuthCard
        icon={UserPlus}
        title="Create your account"
        subtitle="Start in seconds - just an email and a password."
        footer={
          <>
            Already have an account?{" "}
            <a
              className="font-medium text-primary hover:underline"
              href="/login"
            >
              Sign in
            </a>
          </>
        }
      >
        <AuthForm mode="register" />
      </AuthCard>
    </Shell>
  );
}
