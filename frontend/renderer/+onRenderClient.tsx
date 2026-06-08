import { hydrateRoot, createRoot, type Root } from "react-dom/client";
import type { OnRenderClientAsync } from "vike/types";
import { PageContextProvider } from "./usePageContext";
import { RootLayout } from "./RootLayout";
import { ThemeProvider } from "@/apps/ui/theme-provider";

let root: Root | undefined;

export const onRenderClient: OnRenderClientAsync = async (
  pageContext,
): ReturnType<OnRenderClientAsync> => {
  const { Page } = pageContext;
  if (!Page) throw new Error("No Page exported in the page file");

  const container = document.getElementById("page-root");
  if (!container) throw new Error("#page-root not found");

  // Rebuilt on every client-side navigation so the provider always carries the
  // current route params / URL. RootLayout (and the shell it picks) is a stable
  // component, so React keeps it mounted across navigation and only swaps Page.
  const page = (
    <ThemeProvider>
      <PageContextProvider pageContext={pageContext}>
        <RootLayout>
          <Page />
        </RootLayout>
      </PageContextProvider>
    </ThemeProvider>
  );

  if (!root) {
    root = pageContext.isHydration
      ? (hydrateRoot(container, page) as unknown as Root)
      : createRoot(container);
  }
  if (!pageContext.isHydration) root.render(page);
};
