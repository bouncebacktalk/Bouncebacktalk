import type { ComponentType } from "react";

declare global {
  namespace Vike {
    interface PageContext {
      Page: ComponentType;
      pageProps?: Record<string, unknown>;
    }
  }
}

export {};
