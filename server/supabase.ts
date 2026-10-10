import { createClient, type SupabaseClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

type ServiceInput = { id?: number; slug: string; name: string; category: string; description: string; icon: string; priceFrom?: number | null; priceMode: "fixed" | "from" | "quote"; active: boolean };
type SlotInput = { id?: number; date: string; time: string; status: "available" | "blocked" | "booked"; note?: string };
let adminClient: SupabaseClient | null = null;

export function isSupabaseConfigured() { return Boolean(ENV.supabaseUrl && ENV.supabaseServiceRoleKey); }
export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) return null;
  if (!adminClient) adminClient = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  return adminClient;
}
export async function getSupabaseUser(accessToken: string): Promise<SupabaseUser | null> {
  const client = getSupabaseAdmin();
  if (!client) return null;
  const { data, error } = await client.auth.getUser(accessToken);
  if (error) return null;
  return data.user;
}

export async function sbSetAdminPassword(email: string, password: string) {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase admin is not configured");
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = data.users.find(candidate => candidate.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error("Admin user was not found");
  const { error: updateError } = await client.auth.admin.updateUserById(user.id, { password });
  if (updateError) throw updateError;
}

function mapService(row: any) {
  return { id: Number(row.id), slug: row.slug, name: row.name, category: row.category, description: row.description, icon: row.icon, priceFrom: row.price_from == null ? null : Number(row.price_from), priceMode: row.price_mode as "fixed" | "from" | "quote", active: Boolean(row.active) };
}
function mapSlot(row: any) { return { id: Number(row.id), date: String(row.date).slice(0, 10), time: row.time, status: row.status as "available" | "blocked" | "booked", note: row.note ?? null }; }

export async function sbListServices(includeInactive: boolean) {
  const client = getSupabaseAdmin(); if (!client) return null;
  let query = client.from("services").select("*").order("category").order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapService);
}
export async function sbSaveService(input: ServiceInput) {
  const client = getSupabaseAdmin(); if (!client) return null;
  const values = { slug: input.slug, name: input.name, category: input.category, description: input.description, icon: input.icon, price_from: input.priceFrom == null ? null : input.priceFrom, price_mode: input.priceMode, active: input.active };
  const query = input.id ? client.from("services").update(values).eq("id", input.id).select("id").single() : client.from("services").insert(values).select("id").single();
  const { data, error } = await query;
  if (error) throw error;
  return Number(data.id);
}
export async function sbListSlots(fromDate?: string, toDate?: string) {
  const client = getSupabaseAdmin(); if (!client) return null;
  let query = client.from("availability_slots").select("*").order("date").order("time");
  if (fromDate) query = query.gte("date", fromDate);
  if (toDate) query = query.lte("date", toDate);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapSlot);
}
export async function sbSaveSlot(input: SlotInput) {
  const client = getSupabaseAdmin(); if (!client) return null;
  const values = { date: input.date, time: input.time, status: input.status, note: input.note || null };
  const query = input.id ? client.from("availability_slots").update(values).eq("id", input.id).select("id").single() : client.from("availability_slots").insert(values).select("id").single();
  const { data, error } = await query;
  if (error) throw error;
  return Number(data.id);
}
export async function sbRemoveSlot(id: number) {
  const client = getSupabaseAdmin(); if (!client) return false;
  const { error } = await client.from("availability_slots").update({ status: "blocked" }).eq("id", id);
  if (error) throw error;
  return true;
}
export async function sbCreateQuote(input: { customerName?: string; customerPhone?: string; customerEmail?: string; summary: string; estimate?: number }) {
  const client = getSupabaseAdmin(); if (!client) return null;
  const { data, error } = await client.from("quotes").insert({ customer_name: input.customerName || null, customer_phone: input.customerPhone || null, customer_email: input.customerEmail || null, summary: input.summary, estimate: input.estimate == null ? null : input.estimate }).select("id").single();
  if (error) throw error;
  return Number(data.id);
}
export async function sbCreateBooking(input: { slotId: number; date: string; time: string; customerName: string; customerPhone: string; customerEmail?: string; serviceSummary?: string }) {
  const client = getSupabaseAdmin(); if (!client) return null;
  const { data: locked, error: lockError } = await client.from("availability_slots").update({ status: "booked" }).eq("id", input.slotId).eq("status", "available").select("id");
  if (lockError) throw lockError;
  if (!locked?.length) return { success: false as const, reason: "slot_unavailable" as const };
  const { data, error } = await client.from("bookings").insert({ slot_id: input.slotId, date: input.date, time: input.time, customer_name: input.customerName, customer_phone: input.customerPhone, customer_email: input.customerEmail || null, service_summary: input.serviceSummary || null }).select("id").single();
  if (error) { await client.from("availability_slots").update({ status: "available" }).eq("id", input.slotId); throw error; }
  return { success: true as const, id: Number(data.id) };
}
export async function sbListBookings() {
  const client = getSupabaseAdmin(); if (!client) return null;
  const { data, error } = await client.from("bookings").select("*").order("date", { ascending: false }).order("time", { ascending: false }).limit(40);
  if (error) throw error;
  return (data ?? []).map(row => ({ id: Number(row.id), slotId: Number(row.slot_id), date: String(row.date).slice(0, 10), time: row.time, customerName: row.customer_name, customerPhone: row.customer_phone, customerEmail: row.customer_email, serviceSummary: row.service_summary, status: row.status, createdAt: row.created_at }));
}
export async function sbSetBookingStatus(id: number, status: "pending" | "confirmed" | "cancelled") {
  const client = getSupabaseAdmin(); if (!client) return false;
  const { data: current, error: lookupError } = await client.from("bookings").select("slot_id").eq("id", id).single();
  if (lookupError) throw lookupError;
  const { error } = await client.from("bookings").update({ status }).eq("id", id);
  if (error) throw error;
  await client.from("availability_slots").update({ status: status === "cancelled" ? "available" : "booked" }).eq("id", current.slot_id);
  return true;
}
