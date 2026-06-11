import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase, type Design } from "@/integrations/supabase/client";
import { ArrowRight, MessageCircle, ShoppingBag, Calculator, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductChat } from "@/components/ProductChat";
import { VendorWhatsAppFAB } from "@/components/VendorWhatsAppFAB";
import { useRegions, usePricing, calcTotal, buildWhatsAppUrl } from "@/lib/platform";
import { toast } from "sonner";

type ProductRow = Design & { vendor_id?: string | null };
type Vendor = { id: string; name: string | null; phone: string | null };

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { design: data as ProductRow };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.design.title ?? "منتج"} — وتر الإحساس` },
      { name: "description", content: "تصميم طباعة جدارية فاخرة" },
      { property: "og:title", content: loaderData?.design.title ?? "منتج" },
      { property: "og:image", content: loaderData?.design.image_url ?? "" },
    ],
  }),
  component: ProductPage,
  errorComponent: () => (
    <div className="p-10 text-center">
      <p>تعذّر تحميل المنتج.</p>
      <Link to="/" className="mt-4 inline-block text-primary underline">العودة للمعرض</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center">
      <p>المنتج غير موجود.</p>
      <Link to="/" className="mt-4 inline-block text-primary underline">العودة للمعرض</Link>
    </div>
  ),
});

function ProductPage() {
  const { design } = Route.useLoaderData();
  const [chatOpen, setChatOpen] = useState(false);
  const [width, setWidth] = useState(3);
  const [height, setHeight] = useState(2.5);
  const [embossed, setEmbossed] = useState(false);
  const [regionId, setRegionId] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);

  const { data: regions } = useRegions();
  const { data: pricing } = usePricing();

  useEffect(() => {
    if (!design.vendor_id) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("vendors").select("id,name,phone").eq("id", design.vendor_id).maybeSingle();
      if (active && data) setVendor(data as Vendor);
    })();
    return () => { active = false; };
  }, [design.vendor_id]);

  const total = useMemo(() => {
    if (!pricing) return 0;
    return calcTotal(width, height, embossed, pricing);
  }, [width, height, embossed, pricing]);

  const region = useMemo(
    () => regions?.find((r) => r.id === regionId),
    [regions, regionId]
  );

  async function sendOrder() {
    if (!region || !pricing) { toast.error("اختر منطقة أولاً"); return; }
    if (width <= 0 || height <= 0) { toast.error("أدخل مقاسات صحيحة"); return; }
    setSending(true);
    const url = buildWhatsAppUrl({
      number: region.whatsapp_number,
      region: region.name,
      width, height, embossed,
      designName: design.title,
      designUrl: typeof window !== "undefined" ? window.location.href : design.image_url,
      total,
      currency: pricing.currency,
    });
    await supabase.from("orders").insert({
      region_id: region.id,
      region_name: region.name,
      design_id: design.id,
      design_name: design.title,
      design_url: design.image_url,
      width, height, embossed,
      total,
    });
    setSending(false);
    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen bg-background pb-32" dir="rtl">
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            <ArrowRight className="size-4" /> المعرض
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="line-clamp-1 text-sm font-bold text-foreground">{design.title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 pt-6 space-y-6">
        <div className="overflow-hidden rounded-3xl bg-card shadow-card border border-border">
          <div className="aspect-[4/3] overflow-hidden bg-muted">
            <img src={design.image_url} alt={design.title} className="size-full object-cover" />
          </div>
          <div className="p-6">
            {design.type && (
              <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-accent-foreground">
                {design.type}
              </span>
            )}
            <h1 className="mt-3 text-2xl sm:text-3xl font-black text-foreground">{design.title}</h1>
          </div>
        </div>

        <div className="rounded-3xl bg-card p-5 sm:p-6 shadow-card border border-border">
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-primary" />
            <h2 className="text-lg font-black text-foreground">محاكي المقاسات والتكلفة</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">أدخل أبعاد الجدار لمعرفة التكلفة المقدرة فوراً.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">العرض (متر)</span>
              <input type="number" min={0} step={0.1} value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="mt-1 w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">الارتفاع (متر)</span>
              <input type="number" min={0} step={0.1} value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="mt-1 w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </label>
          </div>

          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl bg-muted px-3 py-3">
            <input type="checkbox" checked={embossed} onChange={(e) => setEmbossed(e.target.checked)} className="size-4 accent-primary" />
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">ميزة البروز (Embossed)</p>
              <p className="text-[11px] text-muted-foreground">
                +{Math.round((pricing?.embossed_premium_rate ?? 0) * 100)}% على السعر الأساسي
              </p>
            </div>
          </label>

          <div className="mt-4 rounded-2xl p-5 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
            <p className="text-xs opacity-90">التكلفة المقدرة</p>
            <p className="mt-1 text-3xl font-black">
              {total.toLocaleString("ar")} {pricing?.currency ?? "$"}
            </p>
            <p className="mt-1 text-[11px] opacity-80">
              {width}م × {height}م × {pricing?.price_per_meter ?? "—"} {pricing?.currency ?? "$"}/م²
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-card p-5 sm:p-6 shadow-card border border-border">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            <h2 className="text-lg font-black text-foreground">اختر منطقتك</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">سيتم توجيه طلبك تلقائياً لمساعد فرعك.</p>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {regions?.map((r) => (
              <button key={r.id} onClick={() => setRegionId(r.id)}
                className={`rounded-xl border-2 px-3 py-3 text-sm font-bold transition ${
                  regionId === r.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-foreground hover:border-primary/50"
                }`}>
                {r.name}
              </button>
            ))}
            {(!regions || regions.length === 0) && (
              <p className="col-span-full text-center text-xs text-muted-foreground py-4">
                لا توجد مناطق مفعّلة بعد. أضفها من لوحة التحكم.
              </p>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={() => setChatOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground transition hover:bg-muted">
              <MessageCircle className="size-4" /> اسأل المساعد الذكي
            </button>
            <button onClick={sendOrder} disabled={sending || !regionId}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-50">
              <ShoppingBag className="size-4" /> {sending ? "..." : "إرسال الطلب عبر واتساب"}
            </button>
          </div>
        </div>
      </div>

      <ProductChat open={chatOpen} onClose={() => setChatOpen(false)} design={design} />
      <VendorWhatsAppFAB phone={vendor?.phone} vendorName={vendor?.name} productTitle={design.title} />
    </div>
  );
}
