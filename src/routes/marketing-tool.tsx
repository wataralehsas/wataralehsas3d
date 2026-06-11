import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Upload, Download, Loader2, Image as ImageIcon, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { AiImageStudio } from "@/components/AiImageStudio";

export const Route = createFileRoute("/marketing-tool")({
  head: () => ({
    meta: [
      { title: "أداة الدمج التسويقي — وتر الإحساس" },
      {
        name: "description",
        content: "حوّل صور منتجاتك إلى تصاميم تسويقية احترافية مع إزالة الخلفية تلقائياً",
      },
    ],
  }),
  component: () => <AdminGate title="أداة التسويق — منطقة محمية"><MarketingToolPage /></AdminGate>,
});

const TEMPLATES = [
  { id: "gradient-violet", name: "بنفسجي فاخر", bg: "linear-gradient(135deg, #3b1a8a, #8a3ad6)" },
  { id: "gradient-gold", name: "ذهبي ملكي", bg: "linear-gradient(135deg, #1a1530, #d4a017)" },
  { id: "gradient-ocean", name: "بحري", bg: "linear-gradient(135deg, #0f4c81, #56b3c4)" },
  { id: "solid-cream", name: "كريمي ناعم", bg: "#f5ede0" },
  { id: "solid-dark", name: "أسود راقي", bg: "#0a0a0f" },
];

export default function MarketingToolPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [cleanUrl, setCleanUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [tagline, setTagline] = useState("جودة استثنائية");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function onPick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("الملف يجب أن يكون صورة");
      return;
    }
    setFile(f);
    setCleanUrl(null);
    const url = URL.createObjectURL(f);
    setOriginalUrl(url);
  }

  async function removeBackground() {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/remove-bg", { method: "POST", body: fd });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "فشلت معالجة الصورة");
      }
      const blob = await res.blob();
      setCleanUrl(URL.createObjectURL(blob));
      toast.success("تمت إزالة الخلفية");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "خطأ غير معروف";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Render to canvas whenever inputs change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 1080;
    canvas.height = 1080;

    // Background
    if (template.bg.startsWith("linear-gradient")) {
      const match = template.bg.match(/#[0-9a-fA-F]{6}/g) ?? ["#3b1a8a", "#8a3ad6"];
      const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
      grad.addColorStop(0, match[0]);
      grad.addColorStop(1, match[1] ?? match[0]);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = template.bg;
    }
    ctx.fillRect(0, 0, 1080, 1080);

    // Subtle radial highlight
    const radial = ctx.createRadialGradient(540, 400, 50, 540, 400, 700);
    radial.addColorStop(0, "rgba(255,255,255,0.18)");
    radial.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 1080, 1080);

    const drawText = () => {
      const dark = template.bg === "#f5ede0";
      const textColor = dark ? "#1a1530" : "#ffffff";
      const accentColor = dark ? "#3b1a8a" : "#f5c84c";

      // Brand
      ctx.fillStyle = accentColor;
      ctx.font = "bold 32px Cairo, sans-serif";
      ctx.textAlign = "right";
      ctx.direction = "rtl";
      ctx.fillText("وتر الإحساس", 1020, 80);

      // Product name
      if (productName) {
        ctx.fillStyle = textColor;
        ctx.font = "900 64px Cairo, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(productName, 540, 920);
      }

      // Tagline
      if (tagline) {
        ctx.fillStyle = textColor;
        ctx.globalAlpha = 0.8;
        ctx.font = "400 28px Cairo, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(tagline, 540, 970);
        ctx.globalAlpha = 1;
      }

      // Price badge
      if (price) {
        const badgeX = 540;
        const badgeY = 1030;
        ctx.fillStyle = accentColor;
        const text = `${price} ل.س`;
        ctx.font = "bold 38px Cairo, sans-serif";
        const w = ctx.measureText(text).width + 60;
        ctx.beginPath();
        const r = 30;
        ctx.moveTo(badgeX - w / 2 + r, badgeY - 28);
        ctx.arcTo(badgeX + w / 2, badgeY - 28, badgeX + w / 2, badgeY + 28, r);
        ctx.arcTo(badgeX + w / 2, badgeY + 28, badgeX - w / 2, badgeY + 28, r);
        ctx.arcTo(badgeX - w / 2, badgeY + 28, badgeX - w / 2, badgeY - 28, r);
        ctx.arcTo(badgeX - w / 2, badgeY - 28, badgeX + w / 2, badgeY - 28, r);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = dark ? "#ffffff" : "#1a1530";
        ctx.textAlign = "center";
        ctx.fillText(text, badgeX, badgeY + 14);
      }
    };

    const src = cleanUrl ?? originalUrl;
    if (src) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Fit image into central 720x720 area, preserve aspect
        const max = 720;
        const scale = Math.min(max / img.width, max / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (1080 - w) / 2;
        const y = (820 - h) / 2 + 40;
        // Shadow
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 20;
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
        drawText();
      };
      img.src = src;
    } else {
      drawText();
    }
  }, [originalUrl, cleanUrl, template, productName, price, tagline]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `watar-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            <ArrowRight className="size-4" />
            المعرض
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-bold text-foreground">أداة التسويق الذكية</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 pt-6">
        <div className="rounded-3xl p-6 text-primary-foreground shadow-soft" style={{ background: "var(--gradient-hero)" }}>
          <Sparkles className="size-6 text-accent" />
          <h1 className="mt-2 text-2xl font-black">حوّل صورة منتجك إلى تصميم تسويقي</h1>
          <p className="mt-1 text-sm opacity-90">
            ارفع صورة المنتج فقط — نزيل الخلفية تلقائياً ونضعها على قالب تسويقي نظيف بدون الكشف عن
            أي تفاصيل من الورشة أو الآلات.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Controls */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-card p-5 shadow-card border border-border">
              <label className="block text-sm font-bold text-foreground">1. ارفع صورة المنتج</label>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => fileInput.current?.click()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted py-8 text-sm font-bold text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <Upload className="size-5" />
                {file ? file.name : "اختر صورة من جهازك"}
              </button>

              {originalUrl && !cleanUrl && (
                <button
                  onClick={removeBackground}
                  disabled={loading}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
                  {loading ? "جاري إزالة الخلفية..." : "إزالة الخلفية بالذكاء الاصطناعي"}
                </button>
              )}
              {cleanUrl && (
                <p className="mt-3 text-center text-xs text-success">
                  ✓ تمت إزالة الخلفية — الصورة آمنة للنشر
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-card p-5 shadow-card border border-border">
              <label className="block text-sm font-bold text-foreground">2. القالب التسويقي</label>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t)}
                    className={`aspect-square rounded-xl border-2 transition ${
                      template.id === t.id ? "border-primary scale-105" : "border-transparent"
                    }`}
                    style={{ background: t.bg }}
                    title={t.name}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
              <label className="block text-sm font-bold text-foreground">3. بيانات التسويق</label>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="اسم المنتج"
                className="w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="شعار قصير (اختياري)"
                className="w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="السعر (مثال: 250,000)"
                className="w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              onClick={download}
              disabled={!originalUrl}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground shadow-soft transition hover:scale-[1.02] disabled:opacity-50"
            >
              <Download className="size-4" />
              تحميل التصميم النهائي (1080×1080)
            </button>
          </div>

          {/* Preview */}
          <div className="rounded-2xl bg-card p-3 shadow-card border border-border">
            <p className="px-2 pb-2 text-xs font-bold text-muted-foreground">معاينة مباشرة</p>
            <div className="overflow-hidden rounded-xl bg-muted">
              <canvas ref={canvasRef} className="w-full" />
            </div>
            <p className="mt-2 px-2 text-[11px] text-muted-foreground">
              💡 لخصوصية الورشة: تُحذف الخلفية تلقائياً قبل وضع المنتج على القالب.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <AiImageStudio
            section="marketing"
            title="استوديو التصاميم التسويقية AI"
            subtitle="ولّد بوستر/منشور سوشيال جاهز بهوية وتر الإحساس — اكتب الفكرة فقط."
            accent="from-accent to-primary"
            basePrompt="Premium social media marketing poster, 1:1, brand identity 'وتر الإحساس', elegant typography, soft rose-garden palette, professional product photography"
            presets={[
              { id: "rose", label: "حديقة ورود", prompt: "pink roses, golden bokeh, romantic" },
              { id: "violet", label: "بنفسجي ملكي", prompt: "royal violet gradient, gold accents" },
              { id: "minimal", label: "مينيمال كريمي", prompt: "minimal cream background, soft shadows" },
              { id: "night", label: "ليلي ذهبي", prompt: "dark night with golden light rays" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
