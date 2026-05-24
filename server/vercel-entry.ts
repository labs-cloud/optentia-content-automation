/**
 * Vercel serverless entry point.
 * Exports the Express app as the default handler instead of calling listen().
 */
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { serveStatic } from "./_core/vite";
import { generateContentHandler, publishPostsHandler } from "./cronHandlers";

const app = express();

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

// Cron / Heartbeat handlers
app.post("/api/scheduled/generate-content", generateContentHandler);
app.post("/api/scheduled/publish-posts", publishPostsHandler);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Serve static frontend files (dist/public)
serveStatic(app);

export default app;
