import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, MessageCircle, ShieldCheck } from "lucide-react";
import { CONTACT } from "@shared/const";
import { trpc } from "@/lib/trpc";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`)); }
function getLocalDateTime() {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

export default function BookingWidget() {
  const today = getLocalDateTime();
  const availabilityQuery = trpc.availability.list.useQuery({ fromDate: today.date }, { staleTime: 30_000 });
  const bookingMutation = trpc.bookings.create.useMutation();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<{ id: number; date: string; time: string } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [bookingError, setBookingError] = useState("");
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase.channel("public-availability-live").on("postgres_changes", { event: "*", schema: "public", table: "availability_slots" }, () => availabilityQuery.refetch()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [availabilityQuery]);
  const slots = availabilityQuery.data ?? [];
  const availableSlots = useMemo(() => slots.filter(slot => slot.status === "available" && (slot.date > today.date || (slot.date === today.date && slot.time > today.time))), [slots, today.date, today.time]);
  const dates = useMemo(() => Array.from(new Set(availableSlots.map(slot => slot.date))), [availableSlots]);
  const date = dates.includes(selectedDate) ? selectedDate : dates[0] || "";
  const daySlots = availableSlots.filter(slot => slot.date === date);
  const confirm = async () => {
    if (!selectedSlot || !name.trim() || phone.trim().length < 8) return;
    setBookingError("");
    try {
      const result = await bookingMutation.mutateAsync({ slotId: selectedSlot.id, date: selectedSlot.date, time: selectedSlot.time, customerName: name.trim(), customerPhone: phone.trim() });
      if (result.success) setDone(true);
      else {
        setBookingError("Esse horário acabou de ser reservado. Escolha outro horário disponível.");
        setSelectedSlot(null);
        await availabilityQuery.refetch();
      }
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Não foi possível registrar a marcação. Tente novamente.");
    }
  };
  const whatsappMessage = `Olá, Jean! Acabei de solicitar uma visita para ${selectedSlot?.date.split("-").reverse().join("/")} às ${selectedSlot?.time}. Meu nome é ${name} e meu WhatsApp é ${phone}.`;
  if (done && selectedSlot) return <div className="booking-success"><div className="success-icon"><CheckCircle2 size={30} /></div><p className="eyebrow text-blue-600">solicitação enviada</p><h3 className="mt-3 font-display text-2xl font-semibold text-slate-950">Visita pré-agendada.</h3><p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Recebi o seu pedido para <strong>{formatDate(selectedSlot.date)}</strong>, às <strong>{selectedSlot.time}</strong>. Vou confirmar os detalhes pelo WhatsApp.</p><a className="button-outline mt-6" href={`https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Abrir WhatsApp</a></div>;
  return <div className="booking-shell"><div className="booking-calendar"><div className="mb-6 flex items-start justify-between"><div><p className="eyebrow text-blue-600">01 / dia</p><h3 className="mt-2 font-display text-2xl font-semibold text-slate-950">Escolha uma data</h3></div><CalendarDays className="text-blue-500" size={24} /></div>{availabilityQuery.isLoading ? <p className="text-sm text-slate-500">Carregando horários disponíveis…</p> : availabilityQuery.isError ? <p className="text-sm text-rose-600" role="alert">Não foi possível carregar a agenda. Tente novamente mais tarde.</p> : dates.length ? <div className="date-scroller">{dates.slice(0, 10).map(value => <button key={value} type="button" className={`date-chip ${value === date ? "date-chip-active" : ""}`} onClick={() => { setSelectedDate(value); setSelectedSlot(null); setBookingError(""); }}><span>{formatDate(value).split(",")[0]}</span><strong>{value.slice(-2)}</strong><small>{formatDate(value).split(" de ")[1] ?? ""}</small></button>)}</div> : <p className="text-sm leading-6 text-slate-500">A agenda ainda não tem horários disponíveis. Entre em contato pelo WhatsApp para combinar um atendimento.</p>}<div className="mt-8"><p className="eyebrow text-blue-600">02 / horário</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{daySlots.map(slot => <button key={slot.id} type="button" className={`time-chip ${selectedSlot?.id === slot.id ? "time-chip-active" : ""}`} onClick={() => { setSelectedSlot(slot); setBookingError(""); }}><Clock3 size={15} />{slot.time}</button>)}{dates.length > 0 && !daySlots.length && <p className="col-span-full text-sm text-slate-500">Nenhum horário disponível neste dia.</p>}</div></div></div><aside className="booking-form"><div className="flex items-center gap-3"><span className="icon-orb icon-orb-dark"><ShieldCheck size={19} /></span><div><p className="eyebrow text-blue-200">03 / confirmação</p><h3 className="mt-1 font-display text-xl font-semibold text-white">Reserve seu atendimento</h3></div></div><div className="mt-7 space-y-3"><input className="dark-input" placeholder="Seu nome" value={name} onChange={event => setName(event.target.value)} /><input className="dark-input" placeholder="WhatsApp para confirmar" value={phone} onChange={event => setPhone(event.target.value)} /><div className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm text-slate-300">{selectedSlot ? <><span className="text-slate-500">Selecionado</span><br /><strong>{formatDate(selectedSlot.date)} · {selectedSlot.time}</strong></> : <span className="text-slate-500">Selecione um horário para continuar.</span>}</div><button type="button" className="button-primary w-full justify-center" disabled={!selectedSlot || name.trim().length < 2 || phone.trim().length < 8 || bookingMutation.isPending} onClick={confirm}>{bookingMutation.isPending ? "A confirmar…" : "Solicitar este horário"}</button>{bookingError && <p className="text-center text-xs leading-5 text-rose-300" role="alert">{bookingError}</p>}<p className="text-center text-xs leading-5 text-slate-500">O horário fica bloqueado no momento da confirmação para evitar conflito de agenda.</p></div></aside></div>;
}
