import { afterEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  createBooking: vi.fn(),
  listSlots: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, createBooking: mocked.createBooking, listSlots: mocked.listSlots };
});

import { appRouter } from "./routers";

const caller = appRouter.createCaller({
  user: null,
  req: { protocol: "https", headers: {} } as never,
  res: {} as never,
});

afterEach(() => {
  mocked.createBooking.mockReset();
  mocked.listSlots.mockReset();
});

describe("public availability and booking", () => {
  it("does not invent appointment times when no slots are configured", async () => {
    mocked.listSlots.mockResolvedValue([]);

    await expect(caller.availability.list()).resolves.toEqual([]);
    expect(mocked.listSlots).toHaveBeenCalledOnce();
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
