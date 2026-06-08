import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vike from "vike/plugin";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Matches `playcode.network.frontendPort` default in nixos/modules/options.nix
// and the PORT systemd writes into /etc/playcode-app/playcode-frontend.env.
const PORT = Number(process.env.PORT ?? 3010);

export default defineConfig({
  plugins: [react(), vike(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  server: {
    host: "0.0.0.0",
    port: PORT,
    // Fail loud if the configured port is taken. Vite's default
    // strictPort=false silently falls back to the next free port,
    // which leaves Traefik dialing the wrong upstream and returning
    // 502 with no obvious cause in the deploy log.
    strictPort: true,
    allowedHosts: true,
    // HMR over the cloud edge. The page is served from
    // https://<port>--<app>.playcode.ai (:443) -> Traefik (:3000) -> frontend (:3010).
    // Vite defaults dial port 24678, then localhost:3010. Both are unreachable
    // through the edge, so the client hangs on "[vite] connecting...". Pinning
    // wss + clientPort 443 makes the browser open wss://<page-host>/, which
    // rides the already-proxied / route.
    hmr: {
      protocol: "wss",
      clientPort: 443,
    },
  },
});
