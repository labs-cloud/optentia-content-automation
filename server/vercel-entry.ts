/**
 * Vercel serverless entry point.
 * Exports the Express app as the default handler instead of calling listen().
 */
import "dotenv/config";
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import {
  checkAndRunHandler,
  generateContentHandler,
  publishPostsHandler,
} from "./cronHandlers";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(clerkMiddleware());

registerStorageProxy(app);

app.post("/api/scheduled/check-and-run", checkAndRunHandler);
app.post("/api/scheduled/generate-content", generateContentHandler);
app.post("/api/scheduled/publish-posts", publishPostsHandler);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
