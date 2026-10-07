import { z } from "zod";
import { DEFAULT_SERVICES } from "@shared/const";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createBooking, createQuote, getDb, listBookings, listServices, listSlots, removeSlot, saveService, saveSlot, setBookingStatus } from "./db";

const serviceInput = z.object({
  id: z.number().optional(), slug: z.string().min(2).max(120), name: z.string().min(2).max(160), category: z.string().min(2).max(80), description: z.string().min(10), icon: z.string().min(2).max(40), priceFrom: z.number().nonnegative().nullable().optional(), priceMode: z.enum(["fixed", "from", "quote"]), active: z.boolean(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  services: router({
    list: publicProcedure.query(async () => {
      const rows = await listServices(false);
      if (!rows.length) return DEFAULT_SERVICES;
      return rows.map(row => ({ ...row, priceFrom: row.priceFrom == null ? null : Number(row.priceFrom), active: Boolean(row.active) }));
    }),
  }),
  availability: router({
    list: publicProcedure.input(z.object({ fromDate: z.string().optional(), toDate: z.string().optional() }).nullish()).query(async ({ input }) => {
      const rows = await listSlots(input?.fromDate, input?.toDate);
      if (rows.length || await getDb()) return rows;
      const now = new Date();
      const fallback: Array<{ id: number; date: string; time: string; status: "available" }> = [];
      for (let offset = 1; offset <= 21; offset += 1) {
        const date = new Date(now); date.setDate(now.getDate() + offset);
        if ([0, 6].includes(date.getDay())) continue;
        const iso = date.toISOString().slice(0, 10);
        for (const time of ["09:00", "11:00", "14:00", "16:00"]) fallback.push({ id: Number(`${offset}${time.slice(0, 2)}`), date: iso, time, status: "available" });
      }
      return fallback;
    }),
  }),
  quotes: router({
    create: publicProcedure.input(z.object({ customerName: z.string().max(160).optional(), customerPhone: z.string().max(40).optional(), customerEmail: z.string().email().max(320).optional().or(z.literal("")), summary: z.string().min(3).max(5000), estimate: z.number().nonnegative().optional() })).mutation(async ({ input }) => { const id = await createQuote(input); return { success: id !== null, id }; }),
  }),
  bookings: router({
    create: publicProcedure.input(z.object({ slotId: z.number(), date: z.string().min(10), time: z.string().min(4), customerName: z.string().min(2).max(160), customerPhone: z.string().min(8).max(40), customerEmail: z.string().email().max(320).optional().or(z.literal("")), serviceSummary: z.string().max(1000).optional() })).mutation(({ input }) => createBooking(input)),
  }),
  admin: router({
    dashboard: adminProcedure.query(async () => ({ services: await listServices(true), slots: await listSlots(), bookings: await listBookings() })),
    saveService: adminProcedure.input(serviceInput).mutation(({ input }) => saveService(input)),
    saveSlot: adminProcedure.input(z.object({ id: z.number().optional(), date: z.string().length(10), time: z.string().length(5), status: z.enum(["available", "blocked", "booked"]), note: z.string().max(255).optional() })).mutation(({ input }) => saveSlot(input)),
    blockSlot: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => removeSlot(input.id)),
    setBookingStatus: adminProcedure.input(z.object({ id: z.number(), status: z.enum(["pending", "confirmed", "cancelled"]) })).mutation(({ input }) => setBookingStatus(input.id, input.status)),
  }),
});

export type AppRouter = typeof appRouter;
