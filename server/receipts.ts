import { randomUUID } from "node:crypto";
import PDFDocument from "pdfkit";
import { TRPCError } from "@trpc/server";
import { CONTACT } from "@shared/const";
import { ENV } from "./_core/env";

export type ReceiptInput = {
  customerName: string;
  customerEmail: string;
  customerCpf?: string;
  serviceDescription: string;
  amount: number;
  paidAt: string;
};

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Informe um CPF válido ou deixe o campo em branco." });
  }
  const calculateDigit = (length: number) => {
    const sum = digits.slice(0, length).split("").reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  if (calculateDigit(9) !== Number(digits[9]) || calculateDigit(10) !== Number(digits[10])) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Informe um CPF válido ou deixe o campo em branco." });
  }
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function createReceiptPdf(receipt: ReceiptInput & { receiptNumber: string; issuerCpf: string }) {
  const document = new PDFDocument({ size: "A4", margin: 56 });
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    document.on("data", chunk => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.fillColor("#14213d").font("Helvetica-Bold").fontSize(18).text("RECIBO DE PRESTAÇÃO DE SERVIÇOS");
    document.moveDown(0.6).font("Helvetica").fontSize(10).fillColor("#526178")
      .text(`Recibo Nº: ${receipt.receiptNumber}`)
      .text(`Data do pagamento: ${formatDate(receipt.paidAt)}`);
    document.moveDown(1.2).strokeColor("#dce4ef").moveTo(56, document.y).lineTo(539, document.y).stroke();

    document.moveDown(1.2).font("Helvetica-Bold").fontSize(11).fillColor("#14213d").text("RECEBI DE");
    document.moveDown(0.4).font("Helvetica").fontSize(12).text(receipt.customerName);
    if (receipt.customerCpf) document.fontSize(10).fillColor("#526178").text(`CPF: ${formatCpf(receipt.customerCpf)}`);
    document.fontSize(10).fillColor("#526178").text(`E-mail: ${receipt.customerEmail}`);

    document.moveDown(1.3).font("Helvetica-Bold").fontSize(11).fillColor("#14213d").text("VALOR PAGO");
    document.moveDown(0.4).fontSize(19).text(formatAmount(receipt.amount));

    document.moveDown(1.3).fontSize(11).text("SERVIÇO REALIZADO");
    document.moveDown(0.5).font("Helvetica").fontSize(11).fillColor("#334155").text(receipt.serviceDescription, { lineGap: 4 });

    document.moveDown(1.5).strokeColor("#dce4ef").moveTo(56, document.y).lineTo(539, document.y).stroke();
    document.moveDown(1.2).font("Helvetica-Bold").fontSize(11).fillColor("#14213d").text(`Emitido por: ${CONTACT.name}`);
    document.font("Helvetica").fontSize(10).fillColor("#526178")
      .text(`CPF: ${receipt.issuerCpf}`)
      .text(`Contato: ${CONTACT.whatsappDisplay} · ${CONTACT.email}`);
    document.moveDown(1.2).fontSize(10).fillColor("#334155")
      .text("Este documento serve como comprovante de quitação do serviço descrito e do valor informado.");

    document.end();
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function sendReceipt(input: ReceiptInput) {
  if (!ENV.resendApiKey || !ENV.resendFromEmail) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Configure RESEND_API_KEY e RESEND_FROM_EMAIL no Render para enviar recibos.",
    });
  }
  if (!ENV.receiptIssuerCpf) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Configure RECEIPT_ISSUER_CPF no Render para incluir o CPF do prestador no recibo.",
    });
  }

  const issuerCpf = formatCpf(ENV.receiptIssuerCpf);
  const receiptNumber = `${input.paidAt.slice(0, 4)}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const pdf = await createReceiptPdf({
    ...input,
    customerCpf: input.customerCpf ? formatCpf(input.customerCpf) : undefined,
    issuerCpf,
    receiptNumber,
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ENV.resendFromEmail,
      to: [input.customerEmail],
      reply_to: CONTACT.email,
      subject: `Recibo de prestação de serviços ${receiptNumber}`,
      html: `<p>Olá, ${escapeHtml(input.customerName)}.</p><p>Segue em anexo o recibo do serviço realizado em ${formatDate(input.paidAt)}.</p><p>Atenciosamente,<br />${escapeHtml(CONTACT.name)}</p>`,
      attachments: [{ filename: `recibo-${receiptNumber}.pdf`, content: pdf.toString("base64") }],
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(error => {
    console.error("[Receipts] Failed to contact Resend", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível conectar ao serviço de e-mail. Tente novamente." });
  });

  if (!response.ok) {
    console.error(`[Receipts] Resend returned HTTP ${response.status}`);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "O e-mail do recibo não foi enviado. Verifique a configuração do Resend." });
  }

  return { receiptNumber };
}
