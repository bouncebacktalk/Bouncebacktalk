import { cn } from "@/lib/utils";

/**
 * Brand mark - a modern, abstract "island" glyph (layered landforms + sun) in a
 * gradient squircle. It's a placeholder identity for the starter: swap this SVG
 * for your own and the whole app (sidebar, landing, profile) updates.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm shadow-primary/30",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-[18px]"
      >
        {/* sun */}
        <circle cx="16.8" cy="7.4" r="2.3" fill="currentColor" />
        {/* back landform */}
        <path
          d="M2.4 16.6c2-4.9 4.7-6.3 6.9-6.3s4.9 1.4 6.9 6.3c.5 1.2-.4 2.5-1.7 2.5H4.1c-1.3 0-2.2-1.3-1.7-2.5Z"
          fill="currentColor"
          opacity="0.5"
        />
        {/* front landform */}
        <path
          d="M8.2 17.1c1.6-3.7 3.7-4.8 5.3-4.8s3.7 1.1 5.3 4.8c.5 1.2-.4 2.4-1.6 2.4H9.8c-1.2 0-2.1-1.2-1.6-2.4Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
