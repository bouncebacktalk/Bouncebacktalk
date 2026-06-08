import { createContext, useContext, type ReactNode } from "react";
import type { PageContext } from "vike/types";

// Vike's pageContext (route params, current URL, anything in passToClient) is
// not a React thing by default. This thin provider makes it readable from any
// component via a hook - the standard Vike + React pattern. Add fields to
// `passToClient` in +config.ts to expose more of pageContext on the client.

const Context = createContext<PageContext | undefined>(undefined);

export function PageContextProvider({
  pageContext,
  children,
}: {
  pageContext: PageContext;
  children: ReactNode;
}) {
  return <Context.Provider value={pageContext}>{children}</Context.Provider>;
}

/**
 * Read the current Vike pageContext from any component.
 *
 *   const { routeParams } = usePageContext()
 *   const id = Number(routeParams.id)   // for a /pages/leads/@id route
 */
export function usePageContext(): PageContext {
  const pageContext = useContext(Context);
  if (!pageContext) {
    throw new Error(
      "usePageContext() must be used inside <PageContextProvider> (it is wired in renderer/+onRenderClient and +onRenderHtml).",
    );
  }
  return pageContext;
}
