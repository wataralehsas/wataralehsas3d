import { useRef, useState, type ReactNode } from "react";
import { Sparkles, Loader2, Camera, Upload, Download, Share2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { consumeQuota, useQuota } from "@/lib/quota";
import { QuotaModal } from "./QuotaModal";
import { saveImageToDevice, shareImageWhatsApp } from "@/lib/save-image";
import { useSettings, type DesignSection } from "@/lib/settings";
import { AiLoungeBanner } from "./AiLoungeBanner";

type Preset = { id: string; label: string; prompt: string; preview?: string };

export function AiImageStudio({
  title,
  subtitle,
  accent = "from-primary to-primary-glow",
  presets = [],
  basePrompt = "",
  allowImageInput = true,
  section,
  extraFields,
  buildPrompt,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  presets?: Preset[];
  basePrompt?: string;
  allowImageInput?: boolean;
  section?: DesignSection;
  extraFields?: ReactNode;
  buildPrompt?: (args: { basePrompt: string; presetPrompt?: string; prompt: string }) => string;
}) {
  const [s] = useSettings();
  const customForSection: Preset[] = section
    ? s.customDesigns.filter((d) => d.section === section).map((d) => ({ id: d.id, label: d.label, prompt: d.prompt, preview: d.preview }))
    : [];
  const allPresets = [...presets, ...customForSection];

  const [prompt, setPrompt] = useState("");
  const [preset, setPreset] = useState<Preset | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const remaining = useQuota();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setImage(r.result as string);
    r.readAsDataURL(f);
  }

  async function generate() {
    const finalPrompt = buildPrompt
      ? buildPrompt({ basePrompt, presetPrompt: preset?.prompt, prompt })
      : [basePrompt, preset?.prompt, prompt].filter(Boolean).join(". ");
    if (finalPrompt.trim().length < 5) { toast.error("اكتب وصفاً أو اختر نمطاً"); return; }
    if (!consumeQuota()) { setQuotaOpen(true); return; }
    setBusy(true); setResult(null);
    try {
      const res = await fetch("/api/ai-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, image }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "فشل التوليد");
      if (!j.image_url) {
        toast.message(j.error || "خدمة التوليد مشغولة حالياً");
        return;
      }
      setResult(j.image_url);
      if (j.fallback === "hf") toast.success("تم التوليد عبر المحرك الاحتياطي ✨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-soft" dir="rtl">
      <div className={`mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-l ${accent} px-3 py-1 text-xs font-black text-primary-foreground`}>
        <Sparkles className="size-3.5" /> {title}
      </div>
      {subtitle && <p className="mb-3 text-xs text-muted-foreground leading-relaxed">{subtitle}</p>}

      {allPresets.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {allPresets.map((p) => (
            <button key={p.id} onClick={() => setPreset(preset?.id === p.id ? null : p)}
              className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition ${preset?.id === p.id ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground/80 hover:border-primary/50"}`}>
              {p.preview && <img src={p.preview} alt="" className="size-5 rounded-full object-cover" />}
              {p.label}
            </button>
          ))}
        </div>
      )}

      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
        placeholder="صِف ما تريد توليده… مثال: خلفية ورود وردية ناعمة بإضاءة دافئة"
        className="w-full rounded-2xl bg-muted px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary min-h-[88px]" />

      {extraFields && <div className="mt-3">{extraFields}</div>}

      {allowImageInput && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => camRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary/40 px-3 py-2.5 text-xs font-bold text-primary">
            <Camera className="size-4" /> التقط الآن
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border px-3 py-2.5 text-xs font-bold">
            <Upload className="size-4" /> من المعرض
          </button>
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickFile} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
        </div>
      )}

      {image && (
        <div className="relative mt-3">
          <img src={image} alt="" className="h-28 w-full rounded-xl object-cover" />
          <button onClick={() => setImage(null)}
            className="absolute top-1.5 left-1.5 grid size-7 place-items-center rounded-full bg-background/80 backdrop-blur">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <button onClick={generate} disabled={busy}
        className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l ${accent} px-4 py-3.5 text-sm font-black text-primary-foreground shadow-soft disabled:opacity-50`}>
        {busy ? <><Loader2 className="size-5 animate-spin" /> جارٍ التوليد…</> : <><Wand2 className="size-5" /> ولّد التصميم بالذكاء الاصطناعي</>}
      </button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">المحاولات المتبقية: {isFinite(remaining) ? remaining : "∞"}</p>

      {busy && <AiLoungeBanner className="mt-4" />}

      {result && (
        <div className="mt-5 rounded-2xl border-2 border-primary/40 bg-card p-3">
          <img src={result} alt="result" className="w-full rounded-xl" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => saveImageToDevice(result)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-black text-primary-foreground">
              <Download className="size-4" /> احفظ في الجهاز
            </button>
            <button onClick={() => shareImageWhatsApp(result)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary px-3 py-2.5 text-xs font-black text-primary">
              <Share2 className="size-4" /> مشاركة
            </button>
          </div>
        </div>
      )}

      <QuotaModal open={quotaOpen} onClose={() => setQuotaOpen(false)} />
    </div>
  );
}
