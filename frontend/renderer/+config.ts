import type { Config } from "vike/types";

export default {
  // routeParams is read on the client via usePageContext() (the /leads/@id
  // detail page). urlPathname is intentionally NOT listed: some Vike versions
  // expose it on the client automatically (listing it then emits a "no effect"
  // warning) and others do not (listing it is unreliable across the range), so
  // RootLayout reads it defensively with a window.location fallback instead.
  passToClient: ["pageProps", "routeParams"],
  clientRouting: true,
  hydrationCanBeAborted: true,
} satisfies Config;
