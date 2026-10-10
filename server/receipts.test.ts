import { afterEach, describe, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => ({ createTransport: vi.fn() }));

vi.mock("nodemailer", () => ({ default: { createTransport: mocked.createTransport } }));

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
  mocked.createTransport.mockReset();
});

describe("receipt email delivery", () => {
  it("sends a PDF directly to the customer's email through Gmail SMTP", async () => {
    vi.stubEnv("GMAIL_SMTP_USER", "jean.d.serres@gmail.com");
    vi.stubEnv("GMAIL_SMTP_APP_PASSWORD", "test-app-password");
    vi.stubEnv("RECEIPT_ISSUER_CPF", "01295755009");
    const sendMail = vi.fn().mockResolvedValue({ messageId: "email-id" });
    mocked.createTransport.mockReturnValue({ sendMail });

    const result = await sendReceipt(receiptInput);

    expect(result.receiptNumber).toMatch(/^2026-[A-F0-9]{12}$/);
    expect(mocked.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: "jean.d.serres@gmail.com", pass: "test-app-password" },
    }));
    expect(sendMail).toHaveBeenCalledOnce();
    const message = sendMail.mock.calls[0]?.[0];
    expect(message).toMatchObject({ to: receiptInput.customerEmail, replyTo: "jean.d.serres@gmail.com" });
    const pdf = message.attachments[0].content as Buffer;
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(message.attachments[0].filename).toBe(`recibo-${result.receiptNumber}.pdf`);
  });

  it("refuses to send when Gmail credentials are not configured", async () => {
    vi.stubEnv("GMAIL_SMTP_USER", "");
    vi.stubEnv("GMAIL_SMTP_APP_PASSWORD", "");
    vi.stubEnv("RECEIPT_ISSUER_CPF", "01295755009");

    await expect(sendReceipt(receiptInput)).rejects.toThrow("Configure GMAIL_SMTP_USER e GMAIL_SMTP_APP_PASSWORD");
    expect(mocked.createTransport).not.toHaveBeenCalled();
  });

  it("rejects invalid CPF values without contacting Gmail SMTP", async () => {
    vi.stubEnv("GMAIL_SMTP_USER", "jean.d.serres@gmail.com");
    vi.stubEnv("GMAIL_SMTP_APP_PASSWORD", "test-app-password");
    vi.stubEnv("RECEIPT_ISSUER_CPF", "01295755009");

    await expect(sendReceipt({ ...receiptInput, customerCpf: "111.111.111-11" })).rejects.toThrow("CPF válido");
    expect(mocked.createTransport).not.toHaveBeenCalled();
  });

  it("reports Gmail SMTP errors instead of showing a successful send", async () => {
    vi.stubEnv("GMAIL_SMTP_USER", "jean.d.serres@gmail.com");
    vi.stubEnv("GMAIL_SMTP_APP_PASSWORD", "test-app-password");
    vi.stubEnv("RECEIPT_ISSUER_CPF", "01295755009");
    mocked.createTransport.mockReturnValue({ sendMail: vi.fn().mockRejectedValue(new Error("Invalid login")) });

    await expect(sendReceipt(receiptInput)).rejects.toThrow("Falha ao enviar recibo pelo Gmail: Invalid login");
  });

  it("refuses to send when the provider CPF has not been configured", async () => {
    vi.stubEnv("GMAIL_SMTP_USER", "jean.d.serres@gmail.com");
    vi.stubEnv("GMAIL_SMTP_APP_PASSWORD", "test-app-password");
    vi.stubEnv("RECEIPT_ISSUER_CPF", "");

    await expect(sendReceipt(receiptInput)).rejects.toThrow("Configure RECEIPT_ISSUER_CPF");
    expect(mocked.createTransport).not.toHaveBeenCalled();
  });
});
