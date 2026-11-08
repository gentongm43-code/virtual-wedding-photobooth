import { Camera } from "lucide-react";

export default function PageLoading(props: Record<string, unknown> = {}) {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = props[key];
      if (typeof value === "string" && value) return value;
    }
    return undefined;
  };
  const text = (pick("label", "text", "title", "message") ?? "Menyiapkan kenangan indah").replace(/[.…]+$/, "");
  return (
    <main className="wedding-page grid min-h-[100dvh] place-items-center bg-[#f1f4f2] px-6 text-[#354857]" role="status" aria-live="polite">
      <div className="wedding-rise flex flex-col items-center text-center">
        <div className="relative grid h-28 w-28 place-items-center">
          <span className="load-ring absolute inset-0 rounded-full border border-[#93aec1]/45" />
          <span className="load-ring load-ring-2 absolute inset-0 rounded-full border border-[#93aec1]/30" />
          <span className="load-spin absolute inset-1 rounded-full border-2 border-transparent border-r-[#93aec1]/40 border-t-[#93aec1]" />
          <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#bfcfd3] to-[#93aec1] text-white shadow-lg shadow-[#688da8]/30">
            <Camera size={26} />
          </span>
        </div>
        <p className="mt-9 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#6a8fa9]">Wedding Photobooth</p>
        <div className="wedding-divider mx-auto mt-3"><span /><i>✦</i><span /></div>
        <p className="mt-4 font-serif text-xl text-[#42596c]">{text}<span className="load-dots" /></p>
        <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-[#dde5e1]">
          <div className="load-bar h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#93aec1] to-transparent" />
        </div>
      </div>
    </main>
  );
}
