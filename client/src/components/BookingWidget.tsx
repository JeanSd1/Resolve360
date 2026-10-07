import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, MessageCircle, ShieldCheck } from "lucide-react";
import { CONTACT } from "@shared/const";
import { trpc } from "@/lib/trpc";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`)); }

export default function BookingWidget() {
  const availabilityQuery = trpc.availability.list.useQuery(undefined, { staleTime: 30_000 });
  const bookingMutation = trpc.bookings.create.useMutation();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<{ id: number; date: string; time: string } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase.channel("public-availability-live").on("postgres_changes", { event: "*", schema: "public", table: "availability_slots" }, () => availabilityQuery.refetch()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [availabilityQuery]);
  const slots = availabilityQuery.data ?? [];
  const dates = useMemo(() => Array.from(new Set(slots.filter(slot => slot.status === "available").map(slot => slot.date))), [slots]);
  const date = selectedDate || dates[0] || "";
  const daySlots = slots.filter(slot => slot.date === date && slot.status === "available");
  const confirm = async () => {
    if (!selectedSlot || !name.trim() || phone.trim().length < 8) return;
    const result = await bookingMutation.mutateAsync({ slotId: selectedSlot.id, date: selectedSlot.date, time: selectedSlot.time, customerName: name.trim(), customerPhone: phone.trim() });
    if (result.success) setDone(true);
    else { setSelectedSlot(null); await availabilityQuery.refetch(); }
  };
  const whatsappMessage = `Olá, Jean! Acabei de solicitar uma visita para ${selectedSlot?.date.split("-").reverse().join("/")} às ${selectedSlot?.time}. Meu nome é ${name} e meu WhatsApp é ${phone}.`;
  if (done && selectedSlot) return <div className="booking-success"><div className="success-icon"><CheckCircle2 size={30} /></div><p className="eyebrow text-blue-600">solicitação enviada</p><h3 className="mt-3 font-display text-2xl font-semibold text-slate-950">Visita pré-agendada.</h3><p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Recebi o seu pedido para <strong>{formatDate(selectedSlot.date)}</strong>, às <strong>{selectedSlot.time}</strong>. Vou confirmar os detalhes pelo WhatsApp.</p><a className="button-outline mt-6" href={`https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Abrir WhatsApp</a></div>;
  return <div className="booking-shell"><div className="booking-calendar"><div className="mb-6 flex items-start justify-between"><div><p className="eyebrow text-blue-600">01 / dia</p><h3 className="mt-2 font-display text-2xl font-semibold text-slate-950">Escolha uma data</h3></div><CalendarDays className="text-blue-500" size={24} /></div><div className="date-scroller">{dates.slice(0, 10).map(value => <button key={value} type="button" className={`date-chip ${value === date ? "date-chip-active" : ""}`} onClick={() => { setSelectedDate(value); setSelectedSlot(null); }}><span>{formatDate(value).split(",")[0]}</span><strong>{value.slice(-2)}</strong><small>{formatDate(value).split(" de ")[1] ?? ""}</small></button>)}</div><div className="mt-8"><p className="eyebrow text-blue-600">02 / horário</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{daySlots.map(slot => <button key={slot.id} type="button" className={`time-chip ${selectedSlot?.id === slot.id ? "time-chip-active" : ""}`} onClick={() => setSelectedSlot(slot)}><Clock3 size={15} />{slot.time}</button>)}{!daySlots.length && <p className="col-span-full text-sm text-slate-500">Nenhum horário disponível neste dia.</p>}</div></div></div><aside className="booking-form"><div className="flex items-center gap-3"><span className="icon-orb icon-orb-dark"><ShieldCheck size={19} /></span><div><p className="eyebrow text-blue-200">03 / confirmação</p><h3 className="mt-1 font-display text-xl font-semibold text-white">Reserve seu atendimento</h3></div></div><div className="mt-7 space-y-3"><input className="dark-input" placeholder="Seu nome" value={name} onChange={event => setName(event.target.value)} /><input className="dark-input" placeholder="WhatsApp para confirmar" value={phone} onChange={event => setPhone(event.target.value)} /><div className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm text-slate-300">{selectedSlot ? <><span className="text-slate-500">Selecionado</span><br /><strong>{formatDate(selectedSlot.date)} · {selectedSlot.time}</strong></> : <span className="text-slate-500">Selecione um horário para continuar.</span>}</div><button type="button" className="button-primary w-full justify-center" disabled={!selectedSlot || name.trim().length < 2 || phone.trim().length < 8 || bookingMutation.isPending} onClick={confirm}>{bookingMutation.isPending ? "A confirmar…" : "Solicitar este horário"}</button><p className="text-center text-xs leading-5 text-slate-500">O horário fica bloqueado no momento da confirmação para evitar conflito de agenda.</p></div></aside></div>;
}
