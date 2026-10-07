import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { getSupabaseUser } from "../supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user) {
    const authorization = opts.req.headers.authorization;
    if (authorization?.startsWith("Bearer ")) {
      const supabaseUser = await getSupabaseUser(authorization.slice("Bearer ".length));
      if (supabaseUser) {
        const isAdmin = Boolean(supabaseUser.email && ENV.supabaseAdminEmail && supabaseUser.email.toLowerCase() === ENV.supabaseAdminEmail.toLowerCase());
        user = {
          id: 0,
          openId: `supabase:${supabaseUser.id}`,
          name: supabaseUser.user_metadata?.full_name ?? supabaseUser.email ?? "Utilizador Supabase",
          email: supabaseUser.email ?? null,
          loginMethod: "supabase",
          role: isAdmin ? "admin" : "user",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        } as User;
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
