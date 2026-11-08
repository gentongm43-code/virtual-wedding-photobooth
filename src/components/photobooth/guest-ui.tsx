import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowLeft, Check, Heart } from "lucide-react";

export function GuestBackButton({ onClick, label = "Kembali" }: { onClick: () => void; label?: string }) {
  return <button type="button" onClick={onClick} aria-label={label} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition active:scale-95">
    <ArrowLeft size={18} />
  </button>;
}

export function GuestHeader({ title, subtitle, onBack, dark = false }: { title: string; subtitle?: string; onBack: () => void; dark?: boolean }) {
  return <header className={`flex items-center gap-4 ${dark ? "text-white" : "text-[#2d3c49]"}`}>
    <GuestBackButton onClick={onBack} />
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold">{title}</p>
      {subtitle && <p className={`mt-1 truncate text-xs ${dark ? "text-white/55" : "text-[#8ba8bc]"}`}>{subtitle}</p>}
    </div>
  </header>;
}

export function GuestButton({ children, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  return <button {...props} className={`min-h-12 rounded-2xl px-5 py-3.5 text-sm font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45 ${variant === "primary" ? "bg-[#2d3c49] text-white shadow-lg shadow-[#2d3c49]/15" : "border border-[#cddadd] bg-white text-[#2d3c49]"} ${props.className ?? ""}`}>{children}</button>;
}

export function ProgressIndicator({ value, label }: { value: number; label: string }) {
  return <div className="rounded-2xl border border-[#cedadd] bg-white/75 p-4">
    <div className="flex justify-between text-xs font-semibold text-[#5b839f]"><span>{label}</span><span>{value}%</span></div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#cedadd]"><div className="h-full rounded-full bg-[#5b839f] transition-all" style={{ width: `${value}%` }} /></div>
  </div>;
}

export function ReviewCard({ title, icon, children, status }: { title: string; icon: ReactNode; children: ReactNode; status?: string }) {
  return <section className="rounded-[1.5rem] border border-[#cedadd] bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf2f0] text-[#5b839f]">{icon}</span><div><h3 className="text-sm font-semibold">{title}</h3>{status && <p className="text-xs text-[#8ba8bc]">{status}</p>}</div></div>
    {children}
  </section>;
}

export function SuccessMark() {
  return <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#2d3c49] text-[#dee6e2] shadow-xl"><Heart size={28} fill="currentColor" /></span>;
}

export function SelectedMark() {
  return <span className="grid h-6 w-6 place-items-center rounded-full bg-[#dee6e2] text-[#2d3c49]"><Check size={15} strokeWidth={3} /></span>;
}
