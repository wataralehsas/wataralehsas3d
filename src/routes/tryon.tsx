import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, type Design } from "@/integrations/supabase/client";
import { useState } from "react";
import { Upload, Shirt, Sparkles, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { consumeQuota, useQuota, DAILY_LIMIT } from "@/lib/quota";
import { QuotaModal } from "@/components/QuotaModal";
import { AiImageStudio } from "@/components/AiImageStudio";
import { AiLoungeBanner } from "@/components/AiLoungeBanner";
import { useCategories, idsForTab } from "@/lib/categories";

type FashionItem = {
  id: string; item_name: string; image_url: string;
  price: number | null; type: string | null;
  vendor_whatsapp?: string | null;
};

export const Route = createFileRoute("/tryon")({
  head: () => ({ meta: [{ title: "غرفة تجربة الأزياء AI — وتر الإحساس" }] }),
  component: TryOn,
});

function TryOn() {
  const [person, setPerson] = useState<string | null>(null);
  const [garment, setGarment] = useState<FashionItem | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const remaining = useQuota();
  const [cats] = useCategories();
  const fashionIds = idsForTab(cats, "fashion").filter((id) => id !== "haircut");

  const { data: items } = useQuery({
    queryKey: ["fashion_products", fashionIds.join(",")],
    queryFn: async (): Promise<FashionItem[]> => {
      // المصدر الموحَّد: جدول products الذي يرفع إليه الأدمن من /admin
      let q = supabase.from("products").select("*").order("created_at", { ascending: false }).limit(60);
      if (fashionIds.length) q = q.in("type", fashionIds);
      const { data, error } = await q;
      if (error) return [];
      return ((data ?? []) as Design[]).map((d) => ({
        id: d.id, item_name: d.title, image_url: d.image_url,
        price: d.price, type: d.type,
      }));
    },
  });

  function onPerson(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setPerson(r.result as string);
    r.readAsDataURL(f);
  }

  async function runTryOn() {
    if (!person || !garment) { toast.error("ارفع صورتك واختر قطعة"); return; }
    if (!consumeQuota()) { setQuotaOpen(true); return; }
    setBusy(true); setResult(null);
    try {
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person, garment_url: garment.image_url }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "فشل التجهيز");
      setResult(j.result_url);
      await supabase.from("tryon_logs").insert({
        person_url: null, garment_id: null, result_url: j.result_url,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("تعذّر التجهيز حالياً — حاول مرة أخرى بعد قليل." + (msg ? "" : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-5 py-8" dir="rtl">
      <div className="mx-auto max-w-5xl">
        <Link to="/workflow" className="text-sm font-bold text-primary hover:underline">← الوحدات</Link>
        <h1 className="mt-3 text-3xl font-black">دمج <span className="text-primary">واقعي للأزياء AI</span></h1>
        <p className="mt-2 text-muted-foreground">صورتك + قطعة الكتالوج = إطلالة حقيقية بثنيات طبيعية وحفاظ كامل على وجهك.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-black text-primary">صورتك</p>
            <label className="relative block h-64 cursor-pointer overflow-hidden rounded-2xl bg-muted">
              {person ? <img src={person} className="size-full object-cover" alt="" /> : (
                <div className="grid size-full place-items-center text-center">
                  <div>
                    <Upload className="mx-auto size-8 text-primary" />
                    <p className="mt-2 text-sm font-bold">ارفع صورة كاملة لجسمك</p>
                  </div>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={onPerson} />
            </label>
          </div>

          <div className="rounded-3xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-black text-primary">اختر القطعة</p>
            <div className="grid h-64 grid-cols-3 gap-2 overflow-y-auto">
              {items?.length ? items.map((it) => (
                <button key={it.id} onClick={() => setGarment(it)}
                  className={`relative overflow-hidden rounded-xl border-2 transition ${garment?.id === it.id ? "border-primary" : "border-border"}`}>
                  <img src={it.image_url} alt={it.item_name} className="h-24 w-full object-cover" />
                  <p className="truncate px-1 py-1 text-[10px] font-bold">{it.item_name}</p>
                </button>
              )) : (
                <p className="col-span-3 grid place-items-center text-center text-xs text-muted-foreground">
                  لا توجد قطع — أضفها من الأدمن.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
          <Sparkles className="size-3.5" /> محاولات AI المتبقّية اليوم: {remaining}/{DAILY_LIMIT}
        </div>

        <button onClick={runTryOn} disabled={busy || !person || !garment}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-primary to-primary-glow px-6 py-4 text-base font-black text-primary-foreground shadow-soft disabled:opacity-50">
          {busy ? <><Loader2 className="size-5 animate-spin" /> جاري الدمج الواقعي…</> : <><Sparkles className="size-5" /> ادمج بواقعية على جسمي</>}
        </button>
        {busy && <AiLoungeBanner className="mt-4" />}

        {result && (
          <div className="mt-6 rounded-3xl border border-primary/30 bg-card p-4">
            <p className="mb-2 text-sm font-bold text-primary">النتيجة</p>
            <img src={result} alt="result" className="w-full rounded-2xl" />
            {garment?.vendor_whatsapp && (
              <a href={`https://wa.me/${garment.vendor_whatsapp}?text=${encodeURIComponent(`أرغب بحجز: ${garment.item_name}`)}`}
                target="_blank" rel="noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">
                <MessageCircle className="size-4" /> احجز القطعة الآن عبر واتساب المحل
              </a>
            )}
          </div>
        )}

        <div className="mt-8">
          <details className="group rounded-2xl border border-dashed border-border bg-card/50 p-3">
            <summary className="cursor-pointer list-none text-xs font-black text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Shirt className="size-3.5 text-primary" />
                استوديو توليد قطع ملابس إبداعية
                <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px]">إلهام</span>
                <span className="text-primary group-open:hidden">▾ افتح</span>
                <span className="hidden text-primary group-open:inline">▴ أغلق</span>
              </span>
            </summary>
            <div className="mt-3">
              <AiImageStudio
                section="tryon"
                title="استوديو توليد قطع ملابس تخيلية"
                subtitle="استلهم قطع جديدة بالذكاء الاصطناعي — ثم اعرضها على جسمك بالأعلى."
                accent="from-primary to-accent"
                basePrompt="Photorealistic fashion lookbook image, studio lighting, premium fabric details"
                presets={[
                  { id: "abaya", label: "عباية فاخرة", prompt: "elegant embroidered black abaya" },
                  { id: "suit", label: "بدلة رسمية", prompt: "tailored modern suit, soft beige" },
                  { id: "dress", label: "فستان ورود", prompt: "floral rose pink evening dress, flowing" },
                  { id: "casual", label: "كاجوال شبابي", prompt: "trendy streetwear outfit" },
                ]}
              />
            </div>
          </details>
        </div>
      </div>
      <QuotaModal open={quotaOpen} onClose={() => setQuotaOpen(false)} />
    </div>
  );
}
