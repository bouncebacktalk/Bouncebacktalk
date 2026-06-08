import { LogIn } from "lucide-react";
import { AuthCard, AuthForm, Shell } from "../../apps/auth";

export { Page };

function Page() {
  return (
    <Shell>
      <AuthCard
        icon={LogIn}
        title="Welcome back"
        subtitle="Sign in to pick up where you left off."
        footer={
          <>
            New here?{" "}
            <a
              className="font-medium text-primary hover:underline"
              href="/register"
            >
              Create an account
            </a>
          </>
        }
      >
        <AuthForm mode="login" />
      </AuthCard>
    </Shell>
  );
}
