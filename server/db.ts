import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { DEFAULT_SERVICES } from "@shared/const";
import { availabilitySlots, bookings, InsertUser, quotes, services, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { sbCreateBooking, sbCreateQuote, sbListBookings, sbListServices, sbListSlots, sbRemoveSlot, sbSaveService, sbSaveSlot, sbSetBookingStatus } from "./supabase";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listServices(includeInactive = false) {
  const supabaseRows = await sbListServices(includeInactive);
  if (supabaseRows !== null) {
    if (!includeInactive && supabaseRows.length === 0) {
      for (const service of DEFAULT_SERVICES) await sbSaveService({ ...service, active: true });
      return (await sbListServices(false)) ?? [];
    }
    return supabaseRows;
  }
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(services);
  const rows = includeInactive
    ? query.orderBy(asc(services.category), asc(services.name))
    : query.where(eq(services.active, 1)).orderBy(asc(services.category), asc(services.name));
  const result = await rows;
  if (includeInactive || result.length > 0) return result;
  await db.insert(services).values(DEFAULT_SERVICES.map(service => ({
    slug: service.slug,
    name: service.name,
    category: service.category,
    description: service.description,
    icon: service.icon,
    priceFrom: service.priceFrom == null ? null : String(service.priceFrom),
    priceMode: service.priceMode,
    active: 1,
  })));
  return db.select().from(services).where(eq(services.active, 1)).orderBy(asc(services.category), asc(services.name));
}

export async function saveService(input: {
  id?: number; slug: string; name: string; category: string; description: string;
  icon: string; priceFrom?: number | null; priceMode: "fixed" | "from" | "quote"; active: boolean;
}) {
  const supabaseId = await sbSaveService(input);
  if (supabaseId !== null) return supabaseId;
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values = { slug: input.slug, name: input.name, category: input.category, description: input.description, icon: input.icon, priceFrom: input.priceFrom == null ? null : String(input.priceFrom), priceMode: input.priceMode, active: input.active ? 1 : 0 };
  if (input.id) {
    await db.update(services).set(values).where(eq(services.id, input.id));
    return input.id;
  }
  const result = await db.insert(services).values(values);
  return Number(result[0].insertId);
}

export async function listSlots(fromDate?: string, toDate?: string) {
  const supabaseRows = await sbListSlots(fromDate, toDate);
  if (supabaseRows !== null) return supabaseRows;
  const db = await getDb();
  if (!db) return [];
  const filters = [];
  if (fromDate) filters.push(gte(availabilitySlots.date, fromDate));
  if (toDate) filters.push(lte(availabilitySlots.date, toDate));
  const query = db.select().from(availabilitySlots);
  return filters.length ? query.where(and(...filters)).orderBy(asc(availabilitySlots.date), asc(availabilitySlots.time)) : query.orderBy(asc(availabilitySlots.date), asc(availabilitySlots.time));
}

export async function saveSlot(input: { id?: number; date: string; time: string; status: "available" | "blocked" | "booked"; note?: string }) {
  const supabaseId = await sbSaveSlot(input);
  if (supabaseId !== null) return supabaseId;
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values = { date: input.date, time: input.time, status: input.status, note: input.note || null };
  if (input.id) { await db.update(availabilitySlots).set(values).where(eq(availabilitySlots.id, input.id)); return input.id; }
  const result = await db.insert(availabilitySlots).values(values);
  return Number(result[0].insertId);
}

export async function removeSlot(id: number) {
  const removedInSupabase = await sbRemoveSlot(id);
  if (removedInSupabase) return;
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(availabilitySlots).set({ status: "blocked" }).where(eq(availabilitySlots.id, id));
}

export async function createQuote(input: { customerName?: string; customerPhone?: string; customerEmail?: string; summary: string; estimate?: number }) {
  const supabaseId = await sbCreateQuote(input);
  if (supabaseId !== null) return supabaseId;
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(quotes).values({ customerName: input.customerName || null, customerPhone: input.customerPhone || null, customerEmail: input.customerEmail || null, summary: input.summary, estimate: input.estimate == null ? null : String(input.estimate) });
  return Number(result[0].insertId);
}

export async function createBooking(input: { slotId: number; date: string; time: string; customerName: string; customerPhone: string; customerEmail?: string; serviceSummary?: string }) {
  const supabaseBooking = await sbCreateBooking(input);
  if (supabaseBooking !== null) return supabaseBooking;
  const db = await getDb();
  if (!db) return { success: false as const, reason: "database_unavailable" as const };
  return db.transaction(async tx => {
    const result = await tx.update(availabilitySlots).set({ status: "booked" }).where(and(eq(availabilitySlots.id, input.slotId), eq(availabilitySlots.status, "available")));
    const affectedRows = Number((result as unknown as { affectedRows?: number }).affectedRows ?? 0);
    if (affectedRows !== 1) return { success: false as const, reason: "slot_unavailable" as const };
    const inserted = await tx.insert(bookings).values({ slotId: input.slotId, date: input.date, time: input.time, customerName: input.customerName, customerPhone: input.customerPhone, customerEmail: input.customerEmail || null, serviceSummary: input.serviceSummary || null });
    return { success: true as const, id: Number(inserted[0].insertId) };
  });
}

export async function listBookings() {
  const supabaseRows = await sbListBookings();
  if (supabaseRows !== null) return supabaseRows;
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings).orderBy(desc(bookings.date), desc(bookings.time)).limit(40);
}

export async function setBookingStatus(id: number, status: "pending" | "confirmed" | "cancelled") {
  const updatedInSupabase = await sbSetBookingStatus(id, status);
  if (updatedInSupabase) return;
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const current = await db.select({ slotId: bookings.slotId }).from(bookings).where(eq(bookings.id, id)).limit(1);
  await db.update(bookings).set({ status }).where(eq(bookings.id, id));
  if (current[0]) {
    await db.update(availabilitySlots).set({ status: status === "cancelled" ? "available" : "booked" }).where(eq(availabilitySlots.id, current[0].slotId));
  }
}
