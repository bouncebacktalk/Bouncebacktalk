import {
  createServer as createHttpServer,
  type ServerResponse,
} from "node:http";
import path from "node:path";
import express from "express";
import { renderPage } from "vike/server";

const PORT = Number(process.env.PORT ?? 3010);
const isDev = process.env.NODE_ENV !== "production";
const REVALIDATE_CACHE_CONTROL =
  "no-store, no-cache, must-revalidate, max-age=0";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

function setRevalidateCacheHeaders(res: ServerResponse) {
  res.setHeader("Cache-Control", REVALIDATE_CACHE_CONTROL);
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function setStaticCacheHeaders(
  res: ServerResponse,
  filePath: string,
  clientDist: string,
) {
  const relativePath = path.relative(clientDist, filePath);
  const [firstSegment] = relativePath.split(path.sep);

  if (firstSegment === "assets") {
    res.setHeader("Cache-Control", IMMUTABLE_CACHE_CONTROL);
    return;
  }

  setRevalidateCacheHeaders(res);
}

async function main() {
  const app = express();

  // Explicit HTTP server so the HMR WebSocket attaches to the same :3010 socket
  // the page is served from. In middlewareMode Vite opens no server of its own;
  // without one the HMR socket has nowhere to listen.
  const httpServer = createHttpServer(app);

  if (isDev) {
    const vite = await import("vite");
    const server = await vite.createServer({
      root: import.meta.dirname + "/..",
      server: { middlewareMode: true, hmr: { server: httpServer } },
    });
    app.use(server.middlewares);
  } else {
    const clientDist = path.resolve(import.meta.dirname, "../dist/client");
    app.use(
      express.static(clientDist, {
        index: false,
        setHeaders: (res, filePath) =>
          setStaticCacheHeaders(res, filePath, clientDist),
      }),
    );
  }

  app.get("/favicon.ico", (_req, res) => {
    setRevalidateCacheHeaders(res);
    res.status(204).end();
  });

  app.get("*", (req, res, next) => {
    renderPage({ urlOriginal: req.originalUrl })
      .then((pageContext) => {
        const { httpResponse } = pageContext;
        if (!httpResponse) {
          next();
          return;
        }
        res.status(httpResponse.statusCode);
        httpResponse.headers.forEach(([name, value]: [string, string]) =>
          res.setHeader(name, value),
        );
        setRevalidateCacheHeaders(res);
        httpResponse.pipe(res);
      })
      .catch(next);
  });

  // Listen on the wrapped server so HMR + HTTP share :3010.
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`frontend listening on :${PORT} (${isDev ? "dev" : "prod"})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
