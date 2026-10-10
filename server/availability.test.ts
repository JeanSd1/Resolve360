import { afterEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  createBooking: vi.fn(),
  listSlots: vi.fn(),
  listBookings: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, createBooking: mocked.createBooking, listSlots: mocked.listSlots, listBookings: mocked.listBookings };
});

import { appRouter } from "./routers";

const caller = appRouter.createCaller({
  user: null,
  req: { protocol: "https", headers: {} } as never,
  res: {} as never,
});
const adminCaller = appRouter.createCaller({
  user: { id: 1, openId: "admin", role: "admin" } as never,
  req: { protocol: "https", headers: {} } as never,
  res: {} as never,
});

afterEach(() => {
  mocked.createBooking.mockReset();
  mocked.listSlots.mockReset();
  mocked.listBookings.mockReset();
});

describe("public availability and booking", () => {
  it("does not invent appointment times when no slots are configured", async () => {
    mocked.listSlots.mockResolvedValue([]);

    await expect(caller.availability.list()).resolves.toEqual([]);
    expect(mocked.listSlots).toHaveBeenCalledOnce();
  });

  it("passes the requested start date to the availability query", async () => {
    mocked.listSlots.mockResolvedValue([]);

    await expect(caller.availability.list({ fromDate: "2026-10-10" })).resolves.toEqual([]);
    expect(mocked.listSlots).toHaveBeenCalledWith("2026-10-10", undefined);
  });

  it("filters the completed-booking history by the selected day", async () => {
    mocked.listBookings.mockResolvedValue([]);

    await expect(adminCaller.admin.bookingHistory({ date: "2026-10-10" })).resolves.toEqual([]);
    expect(mocked.listBookings).toHaveBeenCalledWith("2026-10-10");
  });

  it("reports unavailable persistence instead of accepting a lost booking", async () => {
    mocked.createBooking.mockResolvedValue({ success: false, reason: "database_unavailable" });

    await expect(caller.bookings.create({
      slotId: 42,
      date: "2026-10-08",
      time: "09:00",
      customerName: "Cliente",
      customerPhone: "5551999999999",
    })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("agenda não está conectada"),
    });
  });

  it("returns a successful booking result for the confirmation screen", async () => {
    mocked.createBooking.mockResolvedValue({ success: true, id: 7 });

    await expect(caller.bookings.create({
      slotId: 42,
      date: "2026-10-08",
      time: "09:00",
      customerName: "Cliente",
      customerPhone: "5551999999999",
    })).resolves.toEqual({ success: true, id: 7 });
  });
});
