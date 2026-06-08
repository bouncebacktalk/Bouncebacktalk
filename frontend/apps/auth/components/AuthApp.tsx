import {
  ArrowRight,
  Database,
  Inbox,
  LogOut,
  Plus,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ContactForm } from "../../contact";
import { Logo, SilkRibbons, ThemeToggle } from "../../ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentUser, type SessionUser } from "../useCurrentUser";

// Substituted at provision time. Used as the brand/wordmark, NOT as the hero
// headline - a starter should greet you with a tagline you can make your own.
const PROJECT_TITLE = "{{PROJECT_TITLE}}";

interface Session {
  user: SessionUser;
  signOut: () => void | Promise<void>;
}

/** Where a signed-in visitor goes: admins to the console, members to /profile. */
function homeLink(user: SessionUser) {
  if (!user) return null;
  return user.isAdmin
    ? { href: "/dashboard", label: "Go to dashboard" }
    : { href: "/profile", label: "Your account" };
}

/**
 * Public landing. Stripe-inspired: a framed content column (vertical rails +
 * horizontal dividers with corner marks) over an animated WebGL silk-ribbon
 * backdrop, with a floating frosted header that frosts up on scroll.
 * Product-agnostic on purpose - edit the copy and ship.
 */
export function AuthApp() {
  const { user, signOut } = useCurrentUser();
  const session: Session = { user, signOut };

  return (
    <Shell session={session} ribbon>
      <div className="relative mx-auto max-w-6xl border-x border-border/60">
        <FramePlus className="-left-[7px] -top-[7px]" />
        <FramePlus className="-right-[7px] -top-[7px]" />
        <Hero session={session} />
        <Features />
        <ContactSection />
        <FramePlus className="-bottom-[7px] -left-[7px]" />
        <FramePlus className="-bottom-[7px] -right-[7px]" />
      </div>
    </Shell>
  );
}

/** Small "+" mark on the frame rails, the Stripe touch at rail/divider crossings. */
function FramePlus({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        // Hidden on mobile: at narrow widths the framed column is full-bleed,
        // so the marks (offset -7px past the edges) would overflow and cause a
        // sideways scroll.
        "pointer-events-none absolute z-10 hidden text-muted-foreground/40 sm:block",
        className,
      )}
    >
      <Plus className="size-3.5" strokeWidth={1.5} />
    </span>
  );
}

const STACK = [
  "TypeScript",
  "NestJS",
  "Postgres",
  "Tailwind",
  "shadcn/ui",
  "Vike",
];

function Hero({ session }: { session: Session }) {
  const home = homeLink(session.user);

  return (
    <section className="relative px-6 py-20 sm:px-10 sm:py-28">
      <div className="max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
          <span className="size-1.5 rounded-full bg-primary" />
          Full-stack starter, batteries included
        </span>

        <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.04] tracking-tight text-foreground sm:text-6xl">
          Launch your product,{" "}
          <span className="bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
            faster.
          </span>
        </h1>

        <p className="mt-6 max-w-md text-pretty text-lg leading-8 text-muted-foreground">
          A polished foundation for SaaS products and internal tools: accounts
          and roles, a dashboard with data tables, a leads CRM, and one-click
          deploys. Make it yours.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          {home ? (
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl px-6 text-base"
            >
              <a href={home.href}>
                {home.label}
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <>
              <Button
                asChild
                size="lg"
                className="group h-12 rounded-xl px-6 text-base shadow-lg shadow-primary/25 hover:shadow-primary/35"
              >
                <a href="/register">
                  Get started
                  <ArrowRight
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-xl border-border bg-card/70 px-6 text-base backdrop-blur"
              >
                <a href="/login">Sign in</a>
              </Button>
            </>
          )}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
          <span className="text-muted-foreground/70">Built on</span>
          {STACK.map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Auth & roles",
    text: "Sign-in, sessions, and admin roles wired end to end - cookies plus a preview-safe bearer fallback.",
  },
  {
    icon: Inbox,
    title: "Data & tables",
    text: "Stat cards, sortable data tables, bulk actions, and a CRM. Clone the pattern for any view.",
  },
  {
    icon: Database,
    title: "Deploy-ready",
    text: "Postgres, Prisma, Redis queues, and a one-command deploy already configured on a NixOS VM.",
  },
] as const;

function Features() {
  return (
    <section className="border-t border-border/60 px-6 py-16 sm:px-10 sm:py-20">
      <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Everything wired on day one.{" "}
        <span className="text-muted-foreground">
          Build product instead of plumbing - the foundation is already in
          place.
        </span>
      </h2>

      <div className="mt-10 grid overflow-hidden rounded-2xl border border-border/60 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }, i) => (
          <div
            key={title}
            className={cn(
              "group p-6 transition-colors hover:bg-muted/40 sm:p-7",
              i > 0 && "border-t border-border/60 sm:border-l sm:border-t-0",
            )}
          >
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon aria-hidden="true" className="size-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section className="border-t border-border/60 px-6 py-16 sm:px-10 sm:py-20">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <div className="lg:py-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            See the stack work.{" "}
            <span className="text-muted-foreground">
              This form is live - every submission becomes a lead in your
              dashboard.
            </span>
          </h2>
          <ul className="mt-6 grid gap-2.5 text-sm text-muted-foreground">
            {[
              "Validated on the server",
              "Saved to your database",
              "Optional email alerts to admins",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary">
                  <Rocket aria-hidden="true" className="size-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
          <ContactForm source="homepage" />
        </div>
      </div>
    </section>
  );
}

export function Shell({
  children,
  session,
  ribbon = true,
}: {
  children: ReactNode;
  session?: Session;
  /** Animated silk-ribbon background + floating island header. On by default so
   *  every public page (landing, login, register) shares the same chrome; pass
   *  `ribbon={false}` for a plain full-width header. */
  ribbon?: boolean;
}) {
  const home = homeLink(session?.user);

  // Scroll-aware header: a light frosted island over the ribbon at the top,
  // frosting up once you scroll past the hero. Only when the ribbon is shown.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!ribbon) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ribbon]);

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {ribbon ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[760px] overflow-hidden sm:h-[860px]">
          <SilkRibbons />
          {/* Hero text is left-aligned: fade the band back to the page bg on the
              left/center so copy stays legible, and let the ribbon stay vivid on
              the right. Stronger on mobile where text spans full width. */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-transparent sm:via-background/45" />
          {/* Blend the band into the page below the hero. */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
        </div>
      ) : null}
      <header
        className={cn(
          "sticky top-0 z-40",
          // Ribbon pages: a floating island (padding around it). Plain pages:
          // a full-width frosted bar with a divider, as before.
          ribbon
            ? "px-3 pt-3 sm:px-4 sm:pt-4"
            : "border-b border-border/60 bg-background/80 backdrop-blur",
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full items-center justify-between transition-[background-color,border-color,box-shadow] duration-300",
            ribbon
              ? cn(
                  "h-14 max-w-5xl rounded-2xl border px-4 backdrop-blur-md sm:px-5",
                  // Frosted glass over the ribbon; frosts up + lifts on scroll.
                  scrolled
                    ? "border-border/60 bg-background/75 shadow-lg shadow-black/5"
                    : "border-border/40 bg-background/40",
                )
              : "h-16 max-w-6xl px-4 sm:px-6 lg:px-8",
          )}
        >
          <a href="/" className="flex min-w-0 items-center gap-2.5">
            <Logo />
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              {PROJECT_TITLE}
            </span>
          </a>
          <nav className="flex shrink-0 items-center gap-1.5 text-sm">
            <ThemeToggle />
            {home ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void Promise.resolve(session?.signOut?.()).then(() => {
                      window.location.href = "/";
                    });
                  }}
                >
                  <LogOut aria-hidden="true" />
                  Sign out
                </Button>
                <Button asChild size="sm">
                  <a href={home.href}>{home.label}</a>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <a href="/login">Sign in</a>
                </Button>
                <Button asChild size="sm">
                  <a href="/register">
                    Get started
                    <ArrowRight aria-hidden="true" />
                  </a>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1">{children}</main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-7 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>&copy; {PROJECT_TITLE}. Built with your new starter.</span>
          <nav className="flex items-center gap-5">
            <a className="transition hover:text-foreground" href="/">
              Home
            </a>
            <a className="transition hover:text-foreground" href="/dashboard">
              Dashboard
            </a>
            <a className="transition hover:text-foreground" href="/login">
              Sign in
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
