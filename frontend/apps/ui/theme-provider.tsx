import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * App theme provider (next-themes). Toggles the `.dark` class on <html> and
 * persists the choice. Pre-paint, the inline script in renderer/+onRenderHtml
 * sets the class so there is no flash. `sonner` reads this provider too.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
