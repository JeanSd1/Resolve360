import "dotenv/config";
import { timingSafeEqual } from "node:crypto";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { ENV } from "./env";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { isSupabaseConfigured, sbSetAdminPassword } from "../supabase";

let passwordResetInProgress = false;
let passwordResetUsed = false;

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.post("/api/admin/password-reset", async (req, res) => {
    const expectedToken = ENV.supabasePasswordResetToken;
    if (!ENV.supabaseAdminEmail || !isSupabaseConfigured() || expectedToken.length < 32) {
      return res.status(503).json({ error: "A redefinição temporária não está configurada." });
    }
    if (passwordResetUsed || passwordResetInProgress) {
      return res.status(410).json({ error: "O token temporário já foi usado." });
    }
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const provided = Buffer.from(token);
    const expected = Buffer.from(expectedToken);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return res.status(401).json({ error: "Token inválido." });
    }
    if (password.length < 12 || password.length > 128) {
      return res.status(400).json({ error: "Use uma senha com pelo menos 12 caracteres." });
    }
    res.set("Cache-Control", "no-store");
    passwordResetInProgress = true;
    try {
      await sbSetAdminPassword(ENV.supabaseAdminEmail, password);
      passwordResetUsed = true;
      delete process.env.SUPABASE_PASSWORD_RESET_TOKEN;
      return res.json({ success: true });
    } catch (error) {
      passwordResetInProgress = false;
      console.error("Admin password reset failed:", error);
      return res.status(500).json({ error: "Não foi possível atualizar a senha." });
    }
  });
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  if (ENV.appId && ENV.cookieSecret && ENV.oAuthServerUrl && ENV.oAuthPortalUrl) {
    registerOAuthRoutes(app);
  }
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
