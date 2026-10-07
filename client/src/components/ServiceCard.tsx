import { ArrowUpRight, Camera, Cpu, Gamepad2, TimerReset, Trees, Workflow, type LucideIcon } from "lucide-react";

export type ServiceLike = {
  id: number;
  name: string;
  category: string;
  description: string;
  icon: string;
  priceFrom?: number | null;
  priceMode: "fixed" | "from" | "quote";
};

const icons: Record<string, LucideIcon> = { cpu: Cpu, "gamepad-2": Gamepad2, "timer-reset": TimerReset, workflow: Workflow, camera: Camera, trees: Trees };

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export default function ServiceCard({ service, index = 0, selected = false, onSelect }: { service: ServiceLike; index?: number; selected?: boolean; onSelect?: () => void }) {
  const Icon = icons[service.icon] ?? Cpu;
  const price = service.priceMode === "quote" ? "sob consulta" : service.priceFrom ? (service.priceMode === "fixed" ? formatBRL(service.priceFrom) : `a partir de ${formatBRL(service.priceFrom)}`) : "sob consulta";
  return (
    <button type="button" onClick={onSelect} className={`service-card group text-left ${selected ? "service-card-selected" : ""}`} style={{ animationDelay: `${index * 70}ms` }}>
      <div className="flex items-start justify-between gap-4">
        <span className="icon-orb"><Icon size={21} strokeWidth={1.8} /></span>
        <ArrowUpRight size={18} className="text-slate-400 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
      </div>
      <div className="mt-6">
        <p className="eyebrow text-blue-600">{service.category}</p>
        <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-slate-950">{service.name}</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{service.description}</p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-200/80 pt-4 text-xs font-semibold text-slate-500">
        <span>{price}</span>
        {onSelect && <span className={selected ? "text-blue-700" : "text-slate-400"}>{selected ? "adicionado" : "adicionar"}</span>}
      </div>
    </button>
  );
}
