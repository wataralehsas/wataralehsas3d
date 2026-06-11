import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Sparkles, Layers, Shirt, Scissors, Sofa, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BatchImageUploader, type BatchItem } from "@/components/BatchImageUploader";
import { useCategories } from "@/lib/categories";

export const Route = createFileRoute("/bulk-upload-studio")({
  head: () => ({
    meta: [
      { title: "الاستوديو الذكي للرفع الجماعي — وتر الإحساس" },
      { name: "description", content: "ارفع حتى 100 صورة دفعة واحدة، تُضغط فوراً إلى WebP وتُصنّف تلقائياً." },
    ],
  }),
  component: BulkUploadStudio,
});

const TAG_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  fashion: Shirt,
  haircut: Scissors,
  sofa: Sofa,
  furniture: Sofa,
  curtains: Layers,
  other: Sparkles,
};

function BulkUploadStudio() {
  const qc = useQueryClient();
  const [cats] = useCategories();
  const [selected, setSelected] = useState<string>(cats[0]?.id ?? "other");
  const [savedCount, setSavedCount] = useState(0);
  const [storageMode, setStorageMode] = useState<"storage" | "inline">("storage");

  async function uploadOneToStorage(dataUrl: string, name: string): Promise<string> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const safe = (name || "design").replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40);
    const path = `${selected}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}.webp`;
    const { error } = await supabase.storage
      .from("design-layers")
      .upload(path, blob, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
    if (error) throw error;
    const { data } = supabase.storage.from("design-layers").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handle(items: BatchItem[]) {
    if (!items.length) return;
    const rows: { title: string; image_url: string; price: number | null; type: string }[] = [];
    let useStorage = storageMode === "storage";
    for (const it of items) {
      let url = it.dataUrl;
      if (useStorage) {
        try {
          url = await uploadOneToStorage(it.dataUrl, it.name);
        } catch {
          useStorage = false;
          setStorageMode("inline");
          toast.message("سطل التخزين design-layers غير مفعّل — حفظ مضمّن مؤقتاً. شغّل 006_design_layers_bucket.sql لتفعيل مكتبة الـ ٥٠٠٠ صورة.");
        }
      }
      rows.push({ title: it.name || "تصميم", image_url: url, price: null, type: selected });
    }
    const { error } = await supabase.from("products").insert(rows);
    if (error) throw error;
    setSavedCount((n) => n + items.length);
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["vendor-items"] });
    toast.success(`أُضيفت ${items.length} صورة إلى «${cats.find((c) => c.id === selected)?.label ?? selected}»`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 px-4 py-6 pb-20" dir="rtl">
      <div className="mx-auto max-w-5xl">
        <Link to="/workflow" className="text-sm font-bold text-primary hover:underline">← الوحدات</Link>

        <div className="mt-3 rounded-3xl border border-primary/20 bg-gradient-to-tr from-primary/10 via-background to-accent/5 p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Wand2 className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">
                الاستوديو الذكي <span className="text-primary">للرفع الجماعي</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                حتى ١٠٠ صورة دفعة واحدة — ضغط فوري إلى WebP خفيف، قص واقتطاع، وتصنيف تلقائي للفئة.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-bold text-emerald-600">
              <CheckCircle2 className="size-3.5" /> WebP تلقائي
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-bold text-primary">
              <CheckCircle2 className="size-3.5" /> قص + تدوير + نسب
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 font-bold text-accent">
              <CheckCircle2 className="size-3.5" /> توجيه آلي إلى الفئات العربية
            </span>
            {savedCount > 0 && (
              <span className="ms-auto rounded-full bg-primary px-3 py-1 font-black text-primary-foreground">
                ✓ تم حفظ {savedCount.toLocaleString("ar")} صورة
              </span>
            )}
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-black text-foreground">١) اختر الفئة المستهدفة</h2>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const Icon = TAG_ICONS[c.id] ?? Sparkles;
              const active = selected === c.id;
              return (
                <button key={c.id} type="button" onClick={() => setSelected(c.id)}
                  className={`group inline-flex items-center gap-2 rounded-2xl border-2 px-4 py-2 text-xs font-black transition ${
                    active
                      ? "border-primary bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-soft scale-[1.03]"
                      : "border-border bg-background text-foreground/80 hover:border-primary/50 hover:bg-primary/5"
                  }`}>
                  <Icon className={`size-4 ${active ? "" : "text-primary"}`} />
                  {c.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] tracking-widest ${active ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                    {c.tab === "fashion" ? "أزياء" : "ديكور"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-black text-foreground">٢) ارفع الصور — اسحبها وأفلتها</h2>
          <BatchImageUploader
            onUploaded={handle}
            maxFiles={500}
            maxWidthPx={1400}
            maxSizeMB={0.45}
            hint="حتى ٥٠٠ صورة بالدفعة الواحدة — كرّر العملية للوصول إلى ٥٠٠٠+ صورة. الصور تُرفع كطبقات جاهزة لتجربة الزبائن."
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold ${storageMode === "storage" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
              {storageMode === "storage" ? "✓ التخزين السحابي مفعّل (design-layers)" : "⚠ شغّل 006_design_layers_bucket.sql لتفعيل التخزين الكبير"}
            </span>
            <span className="text-muted-foreground">الإجمالي المحفوظ في الجلسة: {savedCount.toLocaleString("ar")}</span>
          </div>
        </section>

        <p className="mt-5 rounded-2xl bg-accent/10 px-4 py-3 text-xs text-accent leading-relaxed">
          💡 لإطلاق مكتبة ٥٠٠٠ صورة من الشركة المصنّعة: نفّذ مرة واحدة ملف <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono">supabase-migrations/006_design_layers_bucket.sql</code> ثم ارفع هنا على دفعات ٥٠٠. كل صورة تظهر فوراً كطبقة قابلة للدمج الواقعي في المحاكي/غرفة الأزياء/استوديو القصّات.
        </p>
      </div>
    </div>
  );
}
