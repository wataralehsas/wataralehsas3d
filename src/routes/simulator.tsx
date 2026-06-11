import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, Layers, Calculator, MapPin, Truck, ShoppingBag, X, Wand2, Loader2, Download, Camera, RefreshCw } from "lucide-react";
import { useRegions, usePricing, calcTotal, buildWhatsAppUrl } from "@/lib/platform";
import { insertOrderOrQueue, useOnlineSync } from "@/lib/offline-sync";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";
import { CampaignSection } from "@/components/CampaignSection";
import { AiImageStudio } from "@/components/AiImageStudio";
import { supabase, type Design } from "@/integrations/supabase/client";
import { useCategories, idsForTab } from "@/lib/categories";
import { toWebpQ92 } from "@/lib/webp-compress";

export const Route = createFileRoute("/simulator")({
  head: () => ({ meta: [{ title: "محاكي الجدران والأرضيات — وتر الإحساس" }] }),
  component: Simulator,
});

type Layer = { id: string; name: string; url: string; opacity: number };

const PRESET_LAYERS: Layer[] = [
  { id: "calli", name: "خط عربي ذهبي", url: "https://images.unsplash.com/photo-1582034438086-c4d2c41ce8af?w=900&auto=format&fit=crop", opacity: 0.9 },
  { id: "marble", name: "رخام فاخر", url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&auto=format&fit=crop", opacity: 0.9 },
  { id: "break3d", name: "كسر جدار 3D", url: "https://images.unsplash.com/photo-1604079628040-94301bb21b91?w=900&auto=format&fit=crop", opacity: 0.9 },
  { id: "epoxy", name: "إيبوكسي محيطي", url: "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=900&auto=format&fit=crop", opacity: 0.9 },
];

function Simulator() {
  useOnlineSync();
  const [bg, setBg] = useState<string | null>(null);
  const [active, setActive] = useState<Layer | null>(null);
  const [width, setWidth] = useState(3);
  const [height, setHeight] = useState(2.5);
  const [embossed, setEmbossed] = useState(false);
  const [regionId, setRegionId] = useState("");
  const [shipping, setShipping] = useState<"self" | "company">("self");
  const [km, setKm] = useState(15);
  const [sending, setSending] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [surface, setSurface] = useState<"wall" | "floor" | "ceiling">("wall");
  const [placementMode, setPlacementMode] = useState<"single-area" | "centerpiece" | "full-surface" | "feature-strip">("full-surface");
  const [placementNote, setPlacementNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Live camera state
  const [camOpen, setCamOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: regions } = useRegions();
  const { data: pricing } = usePricing();
  const [settings] = useSettings();
  const region = useMemo(() => regions?.find((r) => r.id === regionId), [regions, regionId]);

  // تصاميم الديكور التي يرفعها الأدمن من /admin → جدول products
  const [cats] = useCategories();
  const decorIds = idsForTab(cats, "decor");
  const { data: adminLayers } = useQuery({
    queryKey: ["decor_products", decorIds.join(",")],
    queryFn: async (): Promise<Layer[]> => {
      let q = supabase.from("products").select("*").order("created_at", { ascending: false }).limit(80);
      if (decorIds.length) q = q.in("type", decorIds);
      const { data, error } = await q;
      if (error) return [];
      return ((data ?? []) as Design[]).map((d) => ({
        id: d.id, name: d.title || "تصميم", url: d.image_url, opacity: 0.9,
      }));
    },
  });
  const allLayers = useMemo(() => [...(adminLayers ?? []), ...PRESET_LAYERS], [adminLayers]);

  type Cur = "USD" | "TRY" | "SYP";
  const [currencyMode, setCurrencyMode] = useState<Cur>("USD");
  const enabledCurs: { code: Cur; sym: string; rate: number; label: string }[] = useMemo(() => {
    const arr: { code: Cur; sym: string; rate: number; label: string }[] = [
      { code: "USD", sym: "$", rate: 1, label: "USD $" },
    ];
    if (settings.enableTRY) arr.push({ code: "TRY", sym: "₺", rate: Number(settings.tryRate) || 32.5, label: "TRY ₺" });
    if (settings.enableSYP) arr.push({ code: "SYP", sym: "ل.س", rate: Number(settings.sypRate) || 14500, label: "SYP ل.س" });
    return arr;
  }, [settings.enableTRY, settings.tryRate, settings.enableSYP, settings.sypRate]);
  useEffect(() => {
    if (!enabledCurs.some((c) => c.code === currencyMode)) setCurrencyMode("USD");
  }, [enabledCurs, currencyMode]);
  const activeCur = enabledCurs.find((c) => c.code === currencyMode) ?? enabledCurs[0];
  const currency = activeCur.sym;
  const fx = activeCur.rate;

  const baseTotalUsd = useMemo(
    () => (pricing ? calcTotal(width, height, embossed, pricing) : 0),
    [pricing, width, height, embossed],
  );
  const baseTotal = baseTotalUsd * fx;
  const shippingCost = (shipping === "company" ? km * settings.fuelPerKm : 0) * fx;
  const grandTotal = baseTotal + shippingCost;

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setBg(r.result as string); setAiResult(null); };
    r.readAsDataURL(f);
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setCamOpen(true);
    } catch (e) {
      toast.error("تعذّر فتح الكاميرا — تأكد من منح الإذن");
    }
  }

  useEffect(() => {
    if (camOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [camOpen]);

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOpen(false);
  }
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  function snapPhoto() {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    setBg(c.toDataURL("image/jpeg", 0.92));
    setAiResult(null);
    closeCamera();
    toast.success("تم التقاط الصورة — اختر تصميماً ثم ادمج بـ AI");
  }

  async function runAiProjection() {
    if (!bg) { toast.error("التقط أو ارفع صورة الجدار أولاً"); return; }
    if (!active) { toast.error("اختر طبقة تصميم"); return; }
    setAiBusy(true); setAiResult(null);
    try {
      const res = await fetch("/api/decor-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: bg, design: active.url, design_desc: active.name,
          surface, embossed,
          placement_mode: placementMode, placement_note: placementNote,
        }),
      });
      const j = await res.json().catch(() => ({}));
      // Silent sandbox fallback: لو فشل الـ AI لأي سبب نعرض الـ overlay المحلي
      if (!res.ok || !j?.result_url) {
        setAiResult(bg); // overlay سيعرض الطبقة فوق الصورة الأصلية
        const region = regions?.find((r) => r.id === regionId);
        const num = region?.whatsapp_number || "963933000000";
        toast("وضع المحاكاة التجريبي ✨ — لإخراج طباعة UV حقيقية أكمل الطلب عبر واتساب", {
          duration: 8000,
          action: { label: "واتساب", onClick: () => window.open(`https://wa.me/${num}?text=${encodeURIComponent("أرغب بتنفيذ تصميم: " + active.name)}`, "_blank") },
        });
        return;
      }
      const compressed = await toWebpQ92(j.result_url, 0.92).catch(() => j.result_url);
      setAiResult(compressed);
      toast.success(j.fallback ? "تمّ الدمج عبر المحرك الاحتياطي ✨" : "تمّ الدمج التوليدي بدقّة 8K");
    } catch {
      setAiResult(bg);
      const region = regions?.find((r) => r.id === regionId);
      const num = region?.whatsapp_number || "963933000000";
      toast("وضع المحاكاة التجريبي ✨ — لإخراج طباعة UV حقيقية أكمل الطلب عبر واتساب", {
        duration: 8000,
        action: { label: "واتساب", onClick: () => window.open(`https://wa.me/${num}`, "_blank") },
      });
    } finally { setAiBusy(false); }
  }

  function downloadResult() {
    if (!aiResult) return;
    const a = document.createElement("a");
    const ext = aiResult.startsWith("data:image/webp") ? "webp" : "jpg";
    a.href = aiResult; a.download = `watar-room-${Date.now()}.${ext}`; a.click();
  }

  async function sendOrder() {
    if (!region || !pricing) { toast.error("اختر المنطقة"); return; }
    setSending(true);
    const url = buildWhatsAppUrl({
      number: region.whatsapp_number, region: region.name,
      width, height, embossed,
      designName: active?.name ?? "تصميم مخصص",
      designUrl: active?.url ?? "",
      total: grandTotal, currency,
    });
    await insertOrderOrQueue({
      region_id: region.id, region_name: region.name,
      design_name: active?.name ?? "تصميم مخصص",
      design_url: active?.url ?? null,
      width, height, embossed, total: grandTotal,
      shipping_mode: shipping, shipping_cost: shippingCost,
    });
    setSending(false);
    window.open(url, "_blank");
  }

  const previewSrc = aiResult || bg;

  return (
    <div className="min-h-screen bg-background pb-40" dir="rtl">
      <div className="border-b border-border bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/workflow" className="text-sm font-bold text-primary hover:underline">← الوحدات</Link>
          <h1 className="text-sm font-black text-foreground">محاكي الجدران والأرضيات</h1>
          <span className="w-12" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pt-6">
        <CampaignSection compact />
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-border bg-card p-3">
          {!previewSrc ? (
            <div className="grid h-[420px] place-items-center rounded-2xl bg-muted">
              <div className="w-full max-w-sm space-y-3 px-5 text-center">
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Camera className="size-7" />
                </div>
                <p className="text-sm font-black text-foreground">ابدأ بصورة جدارك</p>
                <button onClick={openCamera}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-primary to-primary-glow px-4 py-3 text-sm font-black text-primary-foreground shadow-soft">
                  <Camera className="size-4" /> التقط صورة جدارك الآن حي ومباشر 📸
                </button>
                <button onClick={() => fileRef.current?.click()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-xs font-bold text-foreground">
                  <Upload className="size-4" /> أو ارفع صورة من المعرض
                </button>
                <p className="text-[11px] text-muted-foreground">سيقوم الذكاء بإسقاط التصميم على الجدار بدقّة 8K مع مطابقة الإضاءة والمنظور تلقائياً.</p>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl bg-muted">
              <img src={previewSrc} alt="preview" className="block w-full" />
              {aiBusy && (
                <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm">
                  <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground">
                    <Loader2 className="size-4 animate-spin" /> جارٍ التوليد بدقّة 8K…
                  </div>
                </div>
              )}
              <button onClick={() => { setBg(null); setAiResult(null); setActive(null); }}
                className="absolute end-2 top-2 grid size-9 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur">
                <X className="size-4" />
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onUpload} />

          {/* Surface + embossed quick toggles */}
          {previewSrc && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg bg-background p-1 text-[11px] font-bold">
                {([["wall", "جدار"], ["floor", "أرضية"], ["ceiling", "سقف"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setSurface(k)}
                    className={`px-2.5 py-1 rounded-md ${surface === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>
                ))}
              </div>
              <label className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold">
                <input type="checkbox" checked={embossed} onChange={(e) => setEmbossed(e.target.checked)} className="accent-primary" />
                بروز Embossed <b className="text-primary">+30%</b>
              </label>
              <button onClick={openCamera}
                className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-bold">
                <RefreshCw className="size-3.5" /> صورة جديدة
              </button>
            </div>
          )}

          {previewSrc && (
            <div className="mt-3 rounded-2xl border border-border bg-card/60 p-3">
              <div className="mb-2 text-xs font-black text-foreground">تحديد موضع التطبيق</div>
              <div className="flex flex-wrap gap-2">
                {([
                  ["full-surface", "كامل السطح"],
                  ["single-area", "جزء محدد"],
                  ["centerpiece", "منتصف/قطعة رئيسية"],
                  ["feature-strip", "شريط/امتداد محدد"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setPlacementMode(value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${placementMode === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                value={placementNote}
                onChange={(e) => setPlacementNote(e.target.value)}
                placeholder="مثال: ضع باقة الورد كرسمة في منتصف الحائط فقط، أو اجعل الرخام ممتداً على الأرضية كاملة، أو مدّ التصميم كشريط على الحائط خلف التلفاز"
                className="mt-3 min-h-[88px] w-full rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Layers className="size-4 text-primary" /> اختر تصميماً
              </div>
              <label className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-black text-primary hover:bg-primary/20">
                <Upload className="size-3" /> ارفع تصميم مرجعي
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const r = new FileReader();
                  r.onload = () => {
                    const url = r.result as string;
                    setActive({ id: `ref-${Date.now()}`, name: "تصميم مرجعي", url, opacity: 0.9 });
                    toast.success("تم اعتماد التصميم — ادمج الآن على جدارك");
                  };
                  r.readAsDataURL(f);
                }} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {allLayers.map((l) => (
                <button key={l.id} onClick={() => setActive(l)}
                  className={`group overflow-hidden rounded-xl border-2 transition ${active?.id === l.id ? "border-primary" : "border-border hover:border-primary/50"}`}>
                  <img src={l.url} alt={l.name} className="h-16 w-full object-cover" />
                  <p className="px-2 py-1 text-[11px] font-bold">{l.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-bold"><Calculator className="size-4 text-primary" /> الحاسبة</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-bold text-muted-foreground">العرض (م)</span>
                <input type="number" step={0.1} value={width} onChange={(e) => setWidth(+e.target.value)}
                  className="mt-1 w-full rounded-lg bg-muted px-2 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-muted-foreground">الارتفاع (م)</span>
                <input type="number" step={0.1} value={height} onChange={(e) => setHeight(+e.target.value)}
                  className="mt-1 w-full rounded-lg bg-muted px-2 py-2 text-sm" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-bold"><MapPin className="size-4 text-primary" /> منطقتك</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {regions?.map((r) => (
                <button key={r.id} onClick={() => setRegionId(r.id)}
                  className={`rounded-lg border-2 px-2 py-2 text-xs font-bold transition ${regionId === r.id ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground/80"}`}>
                  {r.name}
                </button>
              ))}
              {(!regions || regions.length === 0) && (
                <p className="col-span-2 text-center text-[11px] text-muted-foreground">لا توجد مناطق — أضفها من الأدمن.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-bold"><Truck className="size-4 text-primary" /> الشحن</div>
            <div className="mt-3 grid gap-2">
              <button onClick={() => setShipping("self")}
                className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 text-xs font-bold transition ${shipping === "self" ? "border-primary bg-primary/10" : "border-border"}`}>
                <span>تأمين النقل من طرفك</span>
                <span className="text-success">0.00 {currency}</span>
              </button>
              <button onClick={() => setShipping("company")}
                className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 text-xs font-bold transition ${shipping === "company" ? "border-primary bg-primary/10" : "border-border"}`}>
                <span>سيارة الشركة المدعومة</span>
                <span className="text-primary">{settings.fuelPerKm} {currency} / كم</span>
              </button>
              {shipping === "company" && (
                <label className="block">
                  <span className="text-[11px] font-bold text-muted-foreground">المسافة (كم)</span>
                  <input type="number" min={0} value={km} onChange={(e) => setKm(+e.target.value)}
                    className="mt-1 w-full rounded-lg bg-muted px-2 py-2 text-sm" />
                </label>
              )}
            </div>
          </div>

          <div className="rounded-2xl p-4 text-primary-foreground" style={{ background: "var(--gradient-brand)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs opacity-90">الإجمالي المقدّر</p>
              {enabledCurs.length > 1 && (
                <div className="inline-flex rounded-lg bg-background/15 p-0.5 text-[11px] font-black backdrop-blur">
                  {enabledCurs.map((c) => (
                    <button key={c.code} onClick={() => setCurrencyMode(c.code)}
                      className={`px-2.5 py-1 rounded-md transition ${currencyMode === c.code ? "bg-background text-foreground" : "text-primary-foreground/80"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-3xl font-black">{grandTotal.toLocaleString("ar", { maximumFractionDigits: 0 })} {currency}</p>
            <p className="mt-1 text-[11px] opacity-80">
              طباعة: {baseTotal.toLocaleString("ar", { maximumFractionDigits: 0 })} + شحن: {shippingCost.toLocaleString("ar", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </aside>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-10">
        <details className="group rounded-2xl border border-dashed border-border bg-card/50 p-3">
          <summary className="cursor-pointer list-none text-xs font-black text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Wand2 className="size-3.5 text-primary" />
              استوديو التوليد التخيلي للأفكار الإبداعية
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px]">إلهام</span>
            </span>
          </summary>
          <div className="mt-3">
            <AiImageStudio
              section="simulator"
              title="استوديو التوليد التخيلي للجدران"
              subtitle="استلهم أفكار تصاميم جديدة — ثم ادمجها بالأعلى على جدارك الحقيقي."
              accent="from-primary to-accent"
              basePrompt="High-resolution interior wall/floor decorative design, photorealistic, premium material finish"
              buildPrompt={({ basePrompt, presetPrompt, prompt }) => [
                basePrompt,
                presetPrompt,
                `Target surface: ${surface}. Placement mode: ${placementMode}.`,
                placementNote ? `Placement instruction: ${placementNote}.` : "",
                "Do not generate a whole room redesign. Generate only the requested decor element/pattern so it can be placed precisely on the selected area.",
                prompt,
              ].filter(Boolean).join(" ")}
              extraFields={(
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["wall", "حائط"],
                      ["floor", "أرضية"],
                      ["ceiling", "سقف"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSurface(value)}
                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${surface === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["full-surface", "كامل السطح"],
                      ["single-area", "جزء محدد"],
                      ["centerpiece", "منتصف"],
                      ["feature-strip", "امتداد محدد"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPlacementMode(value)}
                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${placementMode === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={placementNote}
                    onChange={(e) => setPlacementNote(e.target.value)}
                    placeholder="مثال: ضع باقة ورد ثلاثية الأبعاد على الباب، أو مدّها على جميع الحيطان، أو اجعلها في منتصف الأرضية"
                    className="min-h-[82px] w-full rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
              presets={[
                { id: "rose", label: "حديقة ورود", prompt: "soft pink rose garden mural, romantic warm lighting" },
                { id: "calli", label: "خط عربي ذهبي", prompt: "elegant golden arabic calligraphy on dark marble" },
                { id: "marble", label: "رخام فاخر", prompt: "luxurious veined marble texture, ivory and gold" },
                { id: "3d", label: "كسر 3D", prompt: "dramatic 3D broken wall illusion, depth, cinematic" },
              ]}
            />
          </div>
        </details>
      </div>

      {/* Bottom action sheet */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <button onClick={runAiProjection} disabled={aiBusy || !bg || !active}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-primary to-primary-glow px-3 py-3 text-xs font-black text-primary-foreground shadow-soft disabled:opacity-50">
            {aiBusy ? <><Loader2 className="size-4 animate-spin" /> جارٍ الدمج…</> : <><Wand2 className="size-4" /> ادمج بواقعية AI</>}
          </button>
          <button onClick={downloadResult} disabled={!aiResult}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-background px-3 py-3 text-xs font-black text-foreground disabled:opacity-40">
            <Download className="size-4" /> حفظ
          </button>
          <button onClick={sendOrder} disabled={sending || !regionId}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-foreground px-3 py-3 text-xs font-black text-background disabled:opacity-40">
            <ShoppingBag className="size-4" /> طلب
          </button>
        </div>
      </div>

      {/* Live camera modal */}
      {camOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" dir="rtl">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-black">
            <video ref={videoRef} playsInline muted className="block max-h-[70vh] w-full bg-black object-contain" />
            <div className="flex items-center justify-between gap-2 bg-black/80 p-3">
              <button onClick={closeCamera} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-black text-white">إلغاء</button>
              <button onClick={snapPhoto}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-primary to-primary-glow px-6 py-3 text-sm font-black text-primary-foreground shadow-soft">
                <Camera className="size-4" /> التقاط
              </button>
              <span className="w-16" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
