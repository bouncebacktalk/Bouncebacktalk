import { renderToString } from "react-dom/server";
import { escapeInject, dangerouslySkipEscape } from "vike/server";
import type { OnRenderHtmlAsync } from "vike/types";
import { PageContextProvider } from "./usePageContext";
import { RootLayout } from "./RootLayout";
import { ThemeProvider } from "@/apps/ui/theme-provider";
import "./styles.css";

const PROJECT_TITLE = "{{PROJECT_TITLE}}";

// Runs before first paint: applies the saved (or system) theme to <html> so
// there is no light/dark flash. Mirrors next-themes' storage key ("theme").
const NO_FLASH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||((!t||t==='system')&&m);var e=document.documentElement;if(d)e.classList.add('dark');else e.classList.remove('dark');e.style.colorScheme=d?'dark':'light';}catch(_){}})();`;

export const onRenderHtml: OnRenderHtmlAsync = async (
  pageContext,
): ReturnType<OnRenderHtmlAsync> => {
  const { Page } = pageContext;
  if (!Page) throw new Error("No Page exported in the page file");

  const pageHtml = renderToString(
    <ThemeProvider>
      <PageContextProvider pageContext={pageContext}>
        <RootLayout>
          <Page />
        </RootLayout>
      </PageContextProvider>
    </ThemeProvider>,
  );

  return escapeInject`<!DOCTYPE html>
<html lang="en" suppressHydrationWarning>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${PROJECT_TITLE}</title>
    <script>${dangerouslySkipEscape(NO_FLASH_THEME_SCRIPT)}</script>
  </head>
  <body>
    <div id="page-root">${dangerouslySkipEscape(pageHtml)}</div>
  </body>
</html>`;
};
