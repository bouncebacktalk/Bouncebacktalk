import { Logo } from "../ui/Logo";

// Substituted at provision time. The shell/auth wordmark.
const PROJECT_TITLE = "{{PROJECT_TITLE}}";

/** Brand logo mark + wordmark, reused across the shell and profile. */
export function Brand() {
  return (
    <>
      <Logo />
      <span className="text-sm font-semibold tracking-tight text-foreground">
        {PROJECT_TITLE}
      </span>
    </>
  );
}
