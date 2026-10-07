import { afterEach, describe, expect, it, vi } from "vitest";
import { sendReceipt, type ReceiptInput } from "./receipts";

const receiptInput: ReceiptInput = {
  customerName: "Cliente Exemplo",
  customerEmail: "cliente@example.com",
  customerCpf: "529.982.247-25",
  serviceDescription: "Formatação, limpeza interna e troca de pasta térmica.",
  amount: 180,
  paidAt: "2026-10-07",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("receipt email delivery", () => {
  it("creates a PDF and sends it as an attachment through Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-resend-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "JeanTech <receipts@example.com>");
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: "email-id" }), { status: 200 }));
    vi.stubGlobal("fetch", request);

    const result = await sendReceipt(receiptInput);

    expect(result.receiptNumber).toMatch(/^2026-[A-F0-9]{12}$/);
    expect(request).toHaveBeenCalledOnce();
    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({ to: [receiptInput.customerEmail], reply_to: "jean.d.serres@gmail.com" });
    const pdf = Buffer.from(body.attachments[0].content, "base64");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(body.attachments[0].filename).toBe(`recibo-${result.receiptNumber}.pdf`);
  });

  it("refuses to send when the sender credentials are not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    const request = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", request);

    await expect(sendReceipt(receiptInput)).rejects.toThrow("Configure RESEND_API_KEY e RESEND_FROM_EMAIL");
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects invalid CPF values without contacting Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-resend-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "JeanTech <receipts@example.com>");
    const request = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", request);

    await expect(sendReceipt({ ...receiptInput, customerCpf: "111.111.111-11" })).rejects.toThrow("CPF válido");
    expect(request).not.toHaveBeenCalled();
  });

  it("reports provider errors instead of showing a successful send", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-resend-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "JeanTech <receipts@example.com>");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 422 })));

    await expect(sendReceipt(receiptInput)).rejects.toThrow("O e-mail do recibo não foi enviado");
  });
});
