// Type-only re-export of the server's tRPC router. Types are erased at build
// time, so consuming this in the mobile bundle never pulls server runtime code
// into the app — it only shares the API contract between web and native.
export type { AppRouter } from "../../../../server/routers";
