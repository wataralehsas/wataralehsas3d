import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { Upload, Loader2, Scissors, Sparkles, Download, RotateCcw, Move, Camera, Share2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useStr } from "@/lib/cms-strings";
import { supabase } from "@/integrations/supabase/client";
import { readSettings } from "@/lib/settings";
import { consumeQuota, useQuota, isUnlimited } from "@/lib/quota";
import { QuotaModal } from "@/components/QuotaModal";
import { PaymentModal } from "@/components/PaymentModal";
import { saveImageToDevice, shareImageWhatsApp } from "@/lib/save-image";
import { AiLoungeBanner } from "@/components/AiLoungeBanner";

export const Route = createFileRoute("/haircut")({
  head: () => ({ meta: [{ title: "تجربة قصات الشعر AI — وتر الإحساس" }] }),
  component: HaircutStudio,
});

type Style = { id: string; label: string; preview: string; gender: "m" | "f" | "u" };

const STYLES: Style[] = [
  { id: "bob", label: "Bob كلاسيك", gender: "f", preview: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400" },
  { id: "long_wavy", label: "طويل متموّج", gender: "f", preview: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400" },
  { id: "pixie", label: "Pixie قصير", gender: "f", preview: "https://images.unsplash.com/photo-1595944237005-a07368e3fd9d?w=400" },
  { id: "fade", label: "Fade رياضي", gender: "m", preview: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400" },
  { id: "undercut", label: "Undercut", gender: "m", preview: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400" },
  { id: "buzz", label: "Buzz قصير جداً", gender: "m", preview: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400" },
  { id: "curly", label: "كيرلي طبيعي", gender: "u", preview: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400" },
  { id: "side_part", label: "Side Part أنيق", gender: "u", preview: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400" },
];

const COLORS = [
  { id: "natural", label: "طبيعي", hex: "#3b2a1e" },
  { id: "black", label: "أسود", hex: "#0c0c0e" },
  { id: "brown", label: "بني", hex: "#6b3f1a" },
  { id: "blonde", label: "أشقر", hex: "#e0b66b" },
  { id: "auburn", label: "أحمر نحاسي", hex: "#9a3b1b" },
  { id: "ash", label: "رمادي بارد", hex: "#9a9a9a" },
];

type Tx = { x: number; y: number; scale: number; rotate: number };
const INIT_TX: Tx = { x: 0, y: -40, scale: 1, rotate: 0 };

function HaircutStudio() {
  const tTitle1 = useStr("haircut.title_1");
  const tTitle2 = useStr("haircut.title_2");
  const tUploadHint = useStr("haircut.upload_hint");
  const tColor = useStr("haircut.color");
  const [person, setPerson] = useState<string | null>(null);
  const [style, setStyle] = useState<Style | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [gender, setGender] = useState<"m" | "f" | "u">("u");
  const [tx, setTx] = useState<Tx>(INIT_TX);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const remaining = useQuota();
  const unlimited = isUnlimited();
  const remLabel = mounted ? (unlimited ? "∞" : String(remaining)) : "…";
  // قصّات الأدمن المخصّصة
  const [customs, setCustoms] = useState<Style[]>([]);
  useEffect(() => {
    const sync = () => {
      const ch = readSettings().customHaircuts ?? [];
      setCustoms(ch.map((c) => ({ id: c.id, label: c.label, preview: c.preview, gender: c.gender })));
    };
    sync();
    window.addEventListener("watar:settings", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("watar:settings", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const startDist = useRef(0);
  const startTx = useRef<Tx>(INIT_TX);
  const startMid = useRef({ x: 0, y: 0 });

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { setPerson(r.result as string); setTx(INIT_TX); setResult(null); };
    r.readAsDataURL(f);
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startTx.current = tx;
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      startDist.current = Math.hypot(a.x - b.x, a.y - b.y);
      startMid.current = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    } else {
      startMid.current = { x: e.clientX, y: e.clientY };
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = startDist.current ? d / startDist.current : 1;
      setTx({
        ...startTx.current,
        scale: Math.max(0.3, Math.min(3, startTx.current.scale * s)),
        x: startTx.current.x + (mid.x - startMid.current.x),
        y: startTx.current.y + (mid.y - startMid.current.y),
      });
    } else if (pointers.current.size === 1) {
      setTx({
        ...startTx.current,
        x: startTx.current.x + (e.clientX - startMid.current.x),
        y: startTx.current.y + (e.clientY - startMid.current.y),
      });
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setTx((p) => ({ ...p, scale: Math.max(0.3, Math.min(3, p.scale * (e.deltaY < 0 ? 1.08 : 0.93))) }));
  }

  async function renderLocalComposite(autoDownload = false): Promise<string | null> {
    if (!person || !style) { toast.error("ارفع صورة واختر قصّة"); return null; }
    const stage = stageRef.current!;
    const W = stage.clientWidth, H = stage.clientHeight;
    const canvas = document.createElement("canvas");
    canvas.width = W * 2; canvas.height = H * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);

    const personImg = await loadImg(person);
    drawCover(ctx, personImg, 0, 0, W, H);

    const hairImg = await loadImg(style.preview);
    const hw = 280 * tx.scale, hh = 280 * tx.scale;
    ctx.save();
    ctx.translate(W / 2 + tx.x, H / 2 + tx.y);
    ctx.rotate((tx.rotate * Math.PI) / 180);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(hairImg, -hw / 2, -hh / 2, hw, hh);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = color.hex;
    ctx.fillRect(-hw / 2, -hh / 2, hw, hh);
    ctx.restore();

    const url = canvas.toDataURL("image/jpeg", 0.92);
    setResult(url);
    if (autoDownload) {
      const a = document.createElement("a");
      a.href = url; a.download = `watar-haircut-${Date.now()}.jpg`; a.click();
    }
    return url;
  }

  async function exportCanvas() {
    setBusy(true);
    try {
      await renderLocalComposite(true);
      toast.success("تم الحفظ — بدون أي استهلاك للسيرفر");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function runAI() {
    if (!person || !style) { toast.error("ارفع صورة واختر قصّة"); return; }
    if (readSettings().aiSimulationOnly) {
      setBusy(true);
      try {
        await renderLocalComposite(false);
        toast.success("تمت المعاينة الفورية بنجاح عبر الجوال!");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally { setBusy(false); }
      return;
    }
    if (!consumeQuota()) { setQuotaOpen(true); return; }
    setBusy(true); setResult(null);
    let resultUrl: string | null = null;
    let usedFallback = false;
    try {
      const res = await fetch("/api/haircut", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person, style: style.label, color: color.id, hairstyle_url: style.preview }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && !j?.fallback && j?.result_url) {
        resultUrl = j.result_url;
        setResult(j.result_url);
        toast.success("تمّ الدمج الواقعي بالذكاء الاصطناعي ✨");
      } else {
        usedFallback = true;
        resultUrl = await renderLocalComposite(false);
        // Luxury Light-Mode toast with WhatsApp CTA
        toast("وضع المحاكاة التجريبي ✨ — لإطلالة بقصّة شعر حقيقية احجز جلسة عبر واتساب", {
          duration: 8000,
          action: {
            label: "واتساب",
            onClick: () => window.open(
              `https://wa.me/963933000000?text=${encodeURIComponent("أرغب بحجز جلسة قصّة شعر: " + style.label)}`,
              "_blank",
            ),
          },
        });
      }
    } catch {
      usedFallback = true;
      try { resultUrl = await renderLocalComposite(false); } catch { /* noop */ }
      toast("وضع المحاكاة التجريبي ✨ — لإطلالة بقصّة شعر حقيقية احجز جلسة عبر واتساب", {
        duration: 8000,
        action: { label: "واتساب", onClick: () => window.open(`https://wa.me/963933000000`, "_blank") },
      });
    } finally { setBusy(false); }

    // Log every trial in tryon_logs (success or sandbox fallback)
    try {
      await supabase.from("tryon_logs").insert({
        person_url: null,
        garment_id: null,
        result_url: resultUrl,
      });
    } catch { /* logging best-effort */ }
    void usedFallback;
  }


  const allStyles = [...STYLES, ...customs];
  const visible = allStyles.filter((s) => gender === "u" || s.gender === gender || s.gender === "u");

  return (
    <div className="min-h-screen bg-background px-4 py-5 pb-8" dir="rtl">
      <div className="mx-auto max-w-5xl">
        <Link to="/workflow" className="text-sm font-bold text-primary hover:underline">← الوحدات</Link>
        <h1 className="mt-3 text-3xl font-black">
          <Scissors className="inline size-7 text-primary" /> {tTitle1}{" "}
          <span className="text-primary">{tTitle2}</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          صورتك الحقيقية + القصّة المختارة = دمج واقعي بـ AI مع قفل كامل لملامح الوجه.
        </p>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
          <Sparkles className="size-3.5" />
          {mounted && unlimited ? "وصول بلا حدود ✨" : <>محاولات AI المتبقّية: {remLabel}</>}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {/* Stage */}
          <div className="rounded-3xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-black text-primary">معاينة فورية — اسحب ودبّس بإصبعين</p>
            <div
              ref={stageRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
              className="relative h-80 touch-none select-none overflow-hidden rounded-2xl bg-muted"
              style={{ touchAction: "none" }}
            >
              {person ? (
                <>
                  <img src={person} alt="" className="size-full object-cover pointer-events-none" />
                  {style && (
                    <img
                      src={style.preview}
                      alt=""
                      draggable={false}
                      className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 object-contain"
                      style={{
                        transform: `translate(-50%, -50%) translate(${tx.x}px, ${tx.y}px) scale(${tx.scale}) rotate(${tx.rotate}deg)`,
                        mixBlendMode: "multiply",
                        filter: `drop-shadow(0 0 0 ${color.hex})`,
                        opacity: 0.92,
                      }}
                    />
                  )}
                  {style && (
                    <div
                      className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 mix-blend-color"
                      style={{
                        transform: `translate(-50%, -50%) translate(${tx.x}px, ${tx.y}px) scale(${tx.scale}) rotate(${tx.rotate}deg)`,
                        background: color.hex, opacity: 0.7,
                        WebkitMaskImage: `url(${style.preview})`,
                        WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat", WebkitMaskPosition: "center",
                        maskImage: `url(${style.preview})`,
                        maskSize: "contain", maskRepeat: "no-repeat", maskPosition: "center",
                      }}
                    />
                  )}
                  {!style && (
                    <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
                      <span className="rounded-full bg-background/80 px-3 py-1.5 font-bold">اختر قصّة من اليسار</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="grid size-full place-items-center text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="size-8 text-primary" />
                    <p className="text-sm font-bold">{tUploadHint}</p>
                    <div className="flex gap-2">
                      <label className="cursor-pointer rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground inline-flex items-center gap-1.5">
                        <Upload className="size-3.5" /> من الاستوديو
                        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                      </label>
                      <label className="cursor-pointer rounded-xl border-2 border-primary px-3 py-2 text-xs font-bold text-primary inline-flex items-center gap-1.5">
                        <Camera className="size-3.5" /> التقط الآن
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {person && (
              <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-bold">
                <button onClick={() => setTx((p) => ({ ...p, scale: p.scale * 1.1 }))} className="rounded-lg border border-border py-1.5">+ تكبير</button>
                <button onClick={() => setTx((p) => ({ ...p, scale: p.scale * 0.9 }))} className="rounded-lg border border-border py-1.5">− تصغير</button>
                <button onClick={() => setTx((p) => ({ ...p, rotate: p.rotate + 10 }))} className="rounded-lg border border-border py-1.5">↻ دوران</button>
                <button onClick={() => setTx(INIT_TX)} className="rounded-lg border border-border py-1.5 inline-flex items-center justify-center gap-1">
                  <RotateCcw className="size-3" /> صفر
                </button>
              </div>
            )}
            {person && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-primary">
                <label className="inline-flex cursor-pointer items-center gap-1.5">
                  <Move className="size-3.5" /> تغيير الصورة
                  <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5">
                  <Camera className="size-3.5" /> التقط جديدة
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
                </label>
              </div>
            )}
          </div>

          {/* Styles + Colors */}
          <div className="rounded-3xl border border-border bg-card p-4">
            <div className="inline-flex rounded-xl border border-border bg-background p-1 text-xs font-bold">
              {([["u","الكل"],["m","رجال"],["f","نساء"]] as const).map(([g, l]) => (
                <button key={g} onClick={() => setGender(g)}
                  className={`px-3 py-1.5 rounded-lg ${gender === g ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>

            <p className="mt-3 mb-2 text-xs font-black text-primary">القصّات الترند + معرض الإدارة</p>
            <div className="grid h-56 grid-cols-3 gap-2 overflow-y-auto">
              {visible.map((s) => (
                <button key={s.id} onClick={() => setStyle(s)}
                  className={`relative overflow-hidden rounded-xl border-2 transition ${style?.id === s.id ? "border-primary" : "border-border"}`}>
                  <img src={s.preview} alt={s.label} className="h-24 w-full object-cover" />
                  <p className="truncate px-1 py-1 text-[10px] font-bold bg-background/80">{s.label}</p>
                </button>
              ))}
            </div>

            <p className="mt-4 mb-2 text-xs font-black text-primary">{tColor}</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c.id} onClick={() => setColor(c)}
                  className={`flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[11px] font-bold transition ${color.id === c.id ? "border-primary" : "border-border"}`}>
                  <span className="size-3.5 rounded-full" style={{ background: c.hex }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button onClick={exportCanvas} disabled={busy || !person || !style}
            className="inline-flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-primary/40 bg-card px-6 py-4 text-base font-black text-primary disabled:opacity-50">
            <span className="inline-flex items-center gap-2"><Download className="size-5" /> معاينة فورية (ملصق)</span>
            <span className="text-[10px] font-bold text-muted-foreground">عرض سريع لضبط الحجم والموضع — بدون استهلاك</span>
          </button>
          <button onClick={runAI} disabled={busy || !person || !style}
            className="relative inline-flex flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-l from-primary via-primary to-accent px-6 py-4 text-base font-black text-primary-foreground shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)] disabled:opacity-50">
            {busy ? (
              <span className="inline-flex items-center gap-2"><Loader2 className="size-5 animate-spin" /> جاري الدمج الواقعي…</span>
            ) : (
              <>
                <span className="inline-flex items-center gap-2"><Sparkles className="size-5" /> توليد بالذكاء الاصطناعي ✨</span>
                <span className="text-[10px] font-bold opacity-90">دمج حقيقي مع قفل الوجه والبشرة ({remLabel})</span>
              </>
            )}
          </button>
        </div>
        {busy && <AiLoungeBanner className="mt-4" />}

        {readSettings().paidEnabled && !unlimited && (
          <button onClick={() => setPayOpen(true)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs font-black text-primary">
            <Wallet className="size-4" /> احصل على محاولات إضافية عبر شام كاش
          </button>
        )}

        {result && (
          <div className="mt-4 rounded-3xl border border-primary/30 bg-card p-4">
            <p className="mb-3 text-sm font-bold text-primary">النتيجة</p>
            <img src={result} alt="result" className="w-full rounded-2xl" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button onClick={() => saveImageToDevice(result, `watar-haircut-${Date.now()}.jpg`)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground">
                <Download className="size-4" /> حفظ على الهاتف
              </button>
              <button onClick={() => shareImageWhatsApp(result, "إطلالتي الجديدة من وتر الإحساس ✨")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary px-4 py-2.5 text-sm font-black text-primary">
                <Share2 className="size-4" /> مشاركة
              </button>
            </div>
          </div>
        )}

      </div>
      <QuotaModal open={quotaOpen} onClose={() => setQuotaOpen(false)} />
      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} />
    </div>
  );
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image(); i.crossOrigin = "anonymous";
    i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height, br = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (ir > br) { sw = img.height * br; sx = (img.width - sw) / 2; }
  else { sh = img.width / br; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
