import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { clerkMiddleware } from "@clerk/express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { checkAndRunHandler, generateContentHandler, migrateHandler, publishPostsHandler } from "../cronHandlers";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.use(clerkMiddleware());
  registerStorageProxy(app);

  // Vercel Cron invokes with GET (Authorization: Bearer CRON_SECRET); keep
  // POST for manual/curl use.
  app.get("/api/scheduled/check-and-run", checkAndRunHandler);
  app.post("/api/scheduled/check-and-run", checkAndRunHandler);
  app.get("/api/scheduled/generate-content", generateContentHandler);
  app.post("/api/scheduled/generate-content", generateContentHandler);
  app.get("/api/scheduled/publish-posts", publishPostsHandler);
  app.post("/api/scheduled/publish-posts", publishPostsHandler);
  // GET also works from a browser address bar with ?secret=
  app.get("/api/scheduled/migrate", migrateHandler);
  app.post("/api/scheduled/migrate", migrateHandler);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
