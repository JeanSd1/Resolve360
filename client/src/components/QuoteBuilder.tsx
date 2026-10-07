import { useMemo, useState } from "react";
import { ArrowRight, Check, MessageCircle, Minus, Plus, RotateCcw, Sparkles } from "lucide-react";
import { CONTACT } from "@shared/const";
import { trpc } from "@/lib/trpc";
import ServiceCard, { formatBRL, type ServiceLike } from "./ServiceCard";

export default function QuoteBuilder({ services }: { services: ServiceLike[] }) {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const quoteMutation = trpc.quotes.create.useMutation();
  const selected = useMemo(() => services.filter(service => (quantities[service.id] ?? 0) > 0).map(service => ({ service, quantity: quantities[service.id] ?? 0 })), [quantities, services]);
  const estimate = selected.reduce((sum, item) => sum + (item.service.priceMode === "quote" ? 0 : (item.service.priceFrom ?? 0) * item.quantity), 0);
  const hasEvaluation = selected.some(item => item.service.priceMode === "quote");
  const toggle = (id: number) => setQuantities(current => ({ ...current, [id]: current[id] ? 0 : 1 }));
  const changeQuantity = (id: number, delta: number) => setQuantities(current => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + delta) }));
  const summary = selected.map(item => `${item.quantity}x ${item.service.name}`).join("; ");
  const message = ["Olá, Jean! Montei um orçamento pelo seu site.", "", `Serviços: ${summary || "Ainda vou escolher os serviços"}`, `Estimativa: ${estimate ? formatBRL(estimate) : "a combinar"}`, customerName ? `Meu nome: ${customerName}` : "", customerPhone ? `Meu telefone: ${customerPhone}` : ""].filter(Boolean).join("\n");
  const sendToWhatsApp = async () => {
    if (!selected.length) return;
    window.open(`https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    try {
      const result = await quoteMutation.mutateAsync({ customerName: customerName || undefined, customerPhone: customerPhone || undefined, summary, estimate: estimate || undefined });
      setQuoteNote(result.success ? "Resumo guardado no painel. Agora é só confirmar o envio." : "WhatsApp aberto. O resumo não foi guardado porque a persistência está indisponível.");
    } catch {
      setQuoteNote("WhatsApp aberto. O resumo não pôde ser guardado agora.");
    }
  };
  return (
    <div className="quote-shell">
      <div className="quote-list">
        <div className="mb-7 flex items-start justify-between gap-5">
          <div><p className="eyebrow text-blue-600">01 / seleção rápida</p><h3 className="mt-2 font-display text-2xl font-semibold text-slate-950">O que precisa resolver?</h3><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Selecione um ou mais serviços. O valor é uma referência inicial — cada atendimento é confirmado com você.</p></div>
          <Sparkles className="hidden text-blue-500 sm:block" size={23} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((service, index) => <ServiceCard key={service.id} service={service} index={index} selected={Boolean(quantities[service.id])} onSelect={() => toggle(service.id)} />)}
        </div>
      </div>
      <aside className="quote-summary">
        <div className="flex items-center justify-between"><span className="eyebrow text-blue-200">02 / resumo</span><button type="button" className="text-slate-400 transition hover:text-white" onClick={() => setQuantities({})} aria-label="Limpar seleção"><RotateCcw size={16} /></button></div>
        <h3 className="mt-4 font-display text-2xl font-semibold text-white">Seu orçamento</h3>
        <div className="mt-6 space-y-3">
          {selected.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 bg-white/[.03] p-5 text-sm leading-6 text-slate-400">Escolha um serviço ao lado para começar. O resumo aparece aqui em tempo real.</div>}
          {selected.map(({ service, quantity }) => <div key={service.id} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 text-sm"><div className="min-w-0"><p className="truncate font-medium text-slate-100">{service.name}</p><p className="mt-1 text-xs text-slate-500">{service.priceMode === "quote" ? "valor sob avaliação" : `${quantity} × ${formatBRL(service.priceFrom ?? 0)}`}</p></div><div className="flex shrink-0 items-center gap-2"><button type="button" className="qty-button" onClick={() => changeQuantity(service.id, -1)}><Minus size={13} /></button><span className="w-4 text-center text-xs text-slate-200">{quantity}</span><button type="button" className="qty-button" onClick={() => changeQuantity(service.id, 1)}><Plus size={13} /></button></div></div>)}
        </div>
        <div className="mt-7 border-t border-white/10 pt-5"><div className="flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.16em] text-slate-500">estimativa inicial</p><p className="mt-1 font-display text-3xl font-semibold text-white">{estimate ? formatBRL(estimate) : "R$ —"}</p></div><span className="status-dot">ao vivo</span></div>{hasEvaluation && <p className="mt-3 text-xs leading-5 text-slate-500">Inclui item que depende de avaliação técnica. O valor final é combinado antes do serviço.</p>}</div>
        <div className="mt-7 space-y-3"><input className="dark-input" placeholder="Seu nome (opcional)" value={customerName} onChange={event => setCustomerName(event.target.value)} /><input className="dark-input" placeholder="WhatsApp (opcional)" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} /><button type="button" className="button-primary w-full justify-center" disabled={!selected.length || quoteMutation.isPending} onClick={sendToWhatsApp}><MessageCircle size={18} />{quoteMutation.isPending ? "A preparar…" : "Enviar pelo WhatsApp"}<ArrowRight size={17} /></button></div>
        {quoteNote && <p className="mt-4 flex items-center gap-2 text-xs text-lime-300"><Check size={15} />{quoteNote}</p>}
      </aside>
    </div>
  );
}
