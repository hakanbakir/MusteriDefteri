import { ReactNode, useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";

export const para = (deger: number) =>
  new Intl.NumberFormat("tr-TR", { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(deger || 0) + "\u20BA";

export function Panel({ baslik, aksiyon, children }: { baslik: ReactNode; aksiyon?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-gradient-to-br from-slate-100 via-white to-blue-100/60 shadow-sm dark:border-[var(--ui-dark-border)] dark:from-slate-900 dark:via-slate-800 dark:to-blue-950/40" style={{ borderColor: "var(--ui-border)" as string }}>
      <div className="flex min-h-16 items-center justify-between px-5 py-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{baslik}</h2>
        {aksiyon}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function BirincilButon({ children, onClick, type = "button" }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick} className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--renk-marka-600)] px-4 text-sm font-semibold text-[var(--renk-marka-yazi)] border border-[var(--renk-marka-border)] transition hover:bg-[var(--renk-marka-700)]">
      <Plus size={16} />
      {children}
    </button>
  );
}

export function IkonButon({ title, onClick, tur = "duzenle" }: { title: string; onClick: () => void; tur?: "duzenle" | "sil" }) {
  const Icon = tur === "sil" ? Trash2 : Pencil;
  return (
    <button
      title={title}
      onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 ${
        tur === "sil"
          ? "hover:text-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
          : "hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
      }`}
    >
      <Icon size={13} />
    </button>
  );
}

export function AramaKutusu({ value, onChange, placeholder = "Ara" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="relative block">
      <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 w-80 rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950" />
    </label>
  );
}

export function SiralamaBaslik({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
      {children}
      <ArrowDownUp size={13} />
    </button>
  );
}

export function Sayfalama({ sayfa, toplam, limit, onSayfa }: { sayfa: number; toplam: number; limit: number; onSayfa: (sayfa: number) => void }) {
  const son = Math.max(1, Math.ceil(toplam / limit));
  return (
    <div className="flex items-center justify-between px-1 pt-4 text-sm" style={{ borderTop: "1px solid var(--ui-border)" }}>
      <span className="text-[var(--ui-text-muted)] dark:text-[var(--ui-dark-text-muted)]">{toplam} kayıt</span>
      <div className="flex items-center gap-2">
        <button disabled={sayfa <= 1} onClick={() => onSayfa(sayfa - 1)} className="rounded-md border p-2 disabled:opacity-40" style={{ borderColor: "var(--ui-border)" }}>
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-16 text-center text-[var(--ui-text-muted)] dark:text-[var(--ui-dark-text-muted)]">{sayfa} / {son}</span>
        <button disabled={sayfa >= son} onClick={() => onSayfa(sayfa + 1)} className="rounded-md border p-2 disabled:opacity-40" style={{ borderColor: "var(--ui-border)" }}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function GizliTutar({ deger, gizle }: { deger: number; gizle: boolean }) {
  if (gizle) return <span>*,**</span>;
  return <>{para(deger)}</>;
}
