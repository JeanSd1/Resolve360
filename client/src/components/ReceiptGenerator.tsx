import { useState } from "react";
import { Mail, Receipt } from "lucide-react";
import { trpc } from "@/lib/trpc";

function getLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function ReceiptGenerator() {
  const mutation = trpc.admin.sendReceipt.useMutation();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(getLocalDate);
  const [receiptNumber, setReceiptNumber] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setReceiptNumber("");
    const result = await mutation.mutateAsync({
      customerName,
      customerEmail,
      customerCpf: customerCpf || undefined,
      serviceDescription,
      amount: Number(amount),
      paidAt,
    });
    setReceiptNumber(result.receiptNumber);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerCpf("");
    setServiceDescription("");
    setAmount("");
  };

  return <section className="admin-card mt-6">
    <div className="admin-card-title">
      <div><p className="eyebrow text-blue-600">comprovante</p><h2>Gerar recibo e enviar por e-mail</h2></div>
      <Receipt className="text-blue-500" size={20} />
    </div>
    <p className="mt-3 text-sm leading-6 text-slate-500">O recibo será enviado em PDF ao cliente. O CPF é opcional; o e-mail é necessário para a entrega. O recibo não fica salvo em uma lista no painel.</p>
    <form className="admin-form" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input required minLength={2} maxLength={160} placeholder="Nome do cliente" value={customerName} onChange={event => setCustomerName(event.target.value)} />
        <input required type="email" maxLength={320} placeholder="E-mail do cliente" value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} />
        <input inputMode="numeric" maxLength={18} placeholder="CPF do cliente (opcional)" value={customerCpf} onChange={event => setCustomerCpf(event.target.value)} />
        <input required type="date" value={paidAt} onChange={event => setPaidAt(event.target.value)} />
      </div>
      <textarea required minLength={5} maxLength={1500} placeholder="Descrição detalhada do serviço realizado" value={serviceDescription} onChange={event => setServiceDescription(event.target.value)} />
      <input required type="number" min="0.01" max="10000000" step="0.01" placeholder="Valor total pago (R$)" value={amount} onChange={event => setAmount(event.target.value)} />
      <button className="button-primary" type="submit" disabled={mutation.isPending}>
        <Mail size={16} /> {mutation.isPending ? "Gerando e enviando…" : "Gerar recibo e enviar"}
      </button>
    </form>
    {receiptNumber && <p className="receipt-notice receipt-notice-success" role="status">Recibo {receiptNumber} enviado para {customerEmail}.</p>}
    {mutation.error && <p className="receipt-notice receipt-notice-error" role="alert">{mutation.error.message}</p>}
  </section>;
}
