import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowRight, Plus, Trash2, LogOut, Edit3, Save, X, Package, MapPin, DollarSign, ShoppingBag, Store, Download, Upload, Settings as SettingsIcon, SlidersHorizontal, Type, ToggleLeft, Sparkles, Wallet, Scissors, Check, Bell, Image as ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Design } from "@/integrations/supabase/client";
import { AdminGate } from "@/components/AdminGate";
import { logoutAdmin } from "@/lib/admin-gate";
import { useRegions, usePricing, type Region, type Order } from "@/lib/platform";
import { exportPlatformSnapshot } from "@/lib/export-snapshot";
import { parseCSV } from "@/lib/csv-import";
import { useSettings, DEFAULT_SETTINGS, SYRIAN_PROVINCES, CURRENCY_OPTIONS, SECTION_LABELS, type PlatformSettings, type DesignSection } from "@/lib/settings";
import { useCmsStrings, DEFAULT_STRINGS } from "@/lib/cms-strings";
import { useVendorStore, DEFAULT_VENDOR_STATE, generateLoginToken, STATUS_LABELS, type VendorState, type VendorStatus } from "@/lib/vendor-config";
import { usePaymentRequests, approveRequest, rejectRequest, grantCreditsByDevice, type PaymentPackage, type PaymentRequest } from "@/lib/payments";
import { BatchImageUploader, type BatchItem } from "@/components/BatchImageUploader";
import { useCategories, labelOf, type Category, type CategoryTab } from "@/lib/categories";


export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "لوحة التحكم — وتر الإحساس" }] }),
  component: () => <AdminGate title="لوحة تحكم المعرض"><AdminPage /></AdminGate>,
});

type Tab = "products" | "regions" | "pricing" | "orders" | "vendors" | "settings" | "schema" | "cms" | "quota" | "payments" | "haircuts" | "categories" | "media";

function AdminPage() {
  const [tab, setTab] = useState<Tab>("products");

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            <ArrowRight className="size-4" /> المعرض
          </Link>
          <div className="flex items-center gap-3">
            <CurrencyQuickSwitch />
            <button onClick={async () => { try { await exportPlatformSnapshot(); toast.success("تم تصدير لقطة المنصة"); } catch (e) { toast.error("فشل التصدير"); } }}
              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20">
              <Download className="size-3.5" /> تصدير
            </button>
            <button onClick={() => { logoutAdmin(); location.reload(); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
              <LogOut className="size-4" /> خروج
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 pt-6 space-y-6">
        <div className="rounded-3xl p-6 text-primary-foreground shadow-soft" style={{ background: "var(--gradient-hero)" }}>
          <h1 className="text-2xl font-black">لوحة إدارة المنصة</h1>
          <p className="mt-1 text-sm opacity-90">أدر المنتجات، المناطق، الأسعار، والطلبات من مكان واحد.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          <TabBtn icon={<Package className="size-4" />} label="المنتجات" active={tab === "products"} onClick={() => setTab("products")} />
          <TabBtn icon={<MapPin className="size-4" />} label="المناطق" active={tab === "regions"} onClick={() => setTab("regions")} />
          <TabBtn icon={<DollarSign className="size-4" />} label="الأسعار" active={tab === "pricing"} onClick={() => setTab("pricing")} />
          <TabBtn icon={<Store className="size-4" />} label="السوق" active={tab === "vendors"} onClick={() => setTab("vendors")} />
          <TabBtn icon={<ShoppingBag className="size-4" />} label="الطلبات" active={tab === "orders"} onClick={() => setTab("orders")} />
          <TabBtn icon={<SettingsIcon className="size-4" />} label="إعدادات شاملة" active={tab === "settings"} onClick={() => setTab("settings")} />
          <TabBtn icon={<SlidersHorizontal className="size-4" />} label="إعدادات متقدّمة" active={tab === "schema"} onClick={() => setTab("schema")} />
          <TabBtn icon={<Type className="size-4" />} label="نصوص الموقع (CMS)" active={tab === "cms"} onClick={() => setTab("cms")} />
          <TabBtn icon={<Sparkles className="size-4" />} label="المحاولات والإعلانات" active={tab === "quota"} onClick={() => setTab("quota")} />
          <TabBtn icon={<Wallet className="size-4" />} label="الاشتراكات والدفع" active={tab === "payments"} onClick={() => setTab("payments")} />
          <TabBtn icon={<Scissors className="size-4" />} label="معرض التصاميم AI" active={tab === "haircuts"} onClick={() => setTab("haircuts")} />
          <TabBtn icon={<Type className="size-4" />} label="الفئات" active={tab === "categories"} onClick={() => setTab("categories")} />
          <TabBtn icon={<ImageIcon className="size-4" />} label="خلفية وفيديوهات الواجهة" active={tab === "media"} onClick={() => setTab("media")} />
        </div>

        {tab === "products" && <ProductsTab />}
        {tab === "regions" && <RegionsTab />}
        {tab === "pricing" && <PricingTab />}
        {tab === "vendors" && <VendorsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "settings" && <GlobalSettingsTab />}
        {tab === "schema" && <SchemaControllerTab />}
        {tab === "cms" && <CmsStringsTab />}
        {tab === "quota" && <QuotaSettingsTab />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "haircuts" && <DesignsTab />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "media" && <MediaTab />}
      </div>
    </div>
  );
}

function TabBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${
        active ? "bg-primary text-primary-foreground shadow-soft" : "bg-card text-foreground hover:bg-muted"
      }`}>
      {icon} {label}
    </button>
  );
}

/* ============ المنتجات / التصاميم ============ */
type ProdForm = { title: string; image_url: string; type: string; price: string };
const EMPTY_P: ProdForm = { title: "", image_url: "", type: "", price: "" };

function ProductsTab() {
  const qc = useQueryClient();
  const [cats] = useCategories();
  const [form, setForm] = useState<ProdForm>(EMPTY_P);
  const [editing, setEditing] = useState<string | null>(null);

  const { data: designs } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Design[];
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.image_url) { toast.error("الصورة مطلوبة"); return; }
    const payload = {
      title: form.title || "تصميم", image_url: form.image_url,
      type: form.type || null, price: form.price ? Number(form.price) : null,
    };
    const res = editing
      ? await supabase.from("products").update(payload).eq("id", editing)
      : await supabase.from("products").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "تم التحديث" : "تمت الإضافة");
    setForm(EMPTY_P); setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا التصميم؟")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
        <h2 className="text-sm font-black">رفع جماعي للتصاميم — حتى 100 صورة</h2>
        <p className="text-[11px] text-muted-foreground">اختر الفئة (بالعربية) ثم ارفع — تُضاف بدون أسعار وتظهر شارة "للتجربة والمعاينة الافتراضية".</p>
        <BulkProductsUploader onDone={() => { qc.invalidateQueries({ queryKey: ["admin-products"] }); qc.invalidateQueries({ queryKey: ["products"] }); }} />
      </div>

      <form onSubmit={save} className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black">{editing ? "تعديل تصميم" : "إضافة تصميم منفرد (اختياري)"}</h2>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_P); }}
              className="text-xs text-muted-foreground inline-flex items-center gap-1"><X className="size-3" /> إلغاء</button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="اسم التصميم (اختياري)" />
          <Input value={form.type} onChange={(v) => setForm({ ...form, type: v })} placeholder="النوع (ستائر/كنب/أزياء…)" />
          <Input value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} placeholder="رابط الصورة *" full />
          <Input value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="السعر (اختياري)" type="number" />
        </div>
        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft hover:opacity-90">
          {editing ? <Save className="size-4" /> : <Plus className="size-4" />}
          {editing ? "حفظ التعديلات" : "إضافة"}
        </button>
      </form>

      <div className="rounded-2xl bg-card p-5 shadow-card border border-border">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-black">التصاميم ({designs?.length ?? 0})</h2>
          <CSVImportButton
            table="products"
            sample="title,image_url,type,price"
            map={(row) => ({
              title: row.title || "تصميم", image_url: row.image_url,
              type: row.type || null, price: row.price ? Number(row.price) : null,
            })}
            onDone={() => { qc.invalidateQueries({ queryKey: ["admin-products"] }); qc.invalidateQueries({ queryKey: ["products"] }); }}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {designs?.map((d) => (
            <div key={d.id} className="flex gap-3 rounded-xl border border-border bg-background p-3">
              <img src={d.image_url} alt={d.title} className="size-16 rounded-lg object-cover bg-muted" />
              <div className="flex-1 min-w-0">
                <p className="line-clamp-1 text-sm font-bold">{d.title}</p>
                {d.type && <p className="text-[11px] text-muted-foreground">{labelOf(cats, d.type)}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => { setEditing(d.id); setForm({ title: d.title, image_url: d.image_url, type: d.type ?? "", price: d.price != null ? String(d.price) : "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="rounded-lg bg-muted p-2"><Edit3 className="size-3.5" /></button>
                <button onClick={() => remove(d.id)} className="rounded-lg bg-destructive/10 p-2 text-destructive"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ المناطق ============ */
type RegForm = { name: string; whatsapp_number: string; assistant_name: string; distance_km: string };
const EMPTY_R: RegForm = { name: "", whatsapp_number: "", assistant_name: "", distance_km: "15" };

function RegionsTab() {
  const qc = useQueryClient();
  const { data: regions } = useRegions();
  const [form, setForm] = useState<RegForm>(EMPTY_R);
  const [editing, setEditing] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.whatsapp_number) { toast.error("الاسم والرقم مطلوبان"); return; }
    const payload = { name: form.name, whatsapp_number: form.whatsapp_number.replace(/\D/g, ""), assistant_name: form.assistant_name || null, distance_km: form.distance_km ? Number(form.distance_km) : null };
    const res = editing
      ? await supabase.from("regions").update(payload).eq("id", editing)
      : await supabase.from("regions").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("تم الحفظ");
    setForm(EMPTY_R); setEditing(null);
    qc.invalidateQueries({ queryKey: ["regions"] });
  }

  async function toggleActive(r: Region) {
    await supabase.from("regions").update({ is_active: !r.is_active }).eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["regions"] });
  }

  async function remove(id: string) {
    if (!confirm("حذف هذه المنطقة؟")) return;
    await supabase.from("regions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["regions"] });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
        <h2 className="text-sm font-black">{editing ? "تعديل منطقة" : "إضافة منطقة جديدة"}</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="اسم المنطقة (الدانا)" />
          <Input value={form.whatsapp_number} onChange={(v) => setForm({ ...form, whatsapp_number: v })} placeholder="واتساب 963xxx" />
          <Input value={form.assistant_name} onChange={(v) => setForm({ ...form, assistant_name: v })} placeholder="اسم المساعد" />
          <Input value={form.distance_km} onChange={(v) => setForm({ ...form, distance_km: v })} placeholder="المسافة كم" type="number" />
        </div>
        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft hover:opacity-90">
          {editing ? <Save className="size-4" /> : <Plus className="size-4" />} {editing ? "حفظ" : "إضافة منطقة"}
        </button>
        {editing && <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_R); }} className="text-xs text-muted-foreground">إلغاء</button>}
      </form>

      <div className="rounded-2xl bg-card p-5 shadow-card border border-border">
        <h2 className="mb-3 text-sm font-black">المناطق ({regions?.length ?? 0})</h2>
        <div className="space-y-2">
          {regions?.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
              <div className="flex-1">
                <p className="text-sm font-bold">{r.name} {!r.is_active && <span className="text-xs text-muted-foreground">(معطّلة)</span>}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">{r.whatsapp_number} · {r.assistant_name ?? "—"} · {r.distance_km ?? "—"}km</p>
              </div>
              <button onClick={() => toggleActive(r)} className="text-xs rounded-lg bg-muted px-2 py-1">{r.is_active ? "تعطيل" : "تفعيل"}</button>
              <button onClick={() => { setEditing(r.id); setForm({ name: r.name, whatsapp_number: r.whatsapp_number, assistant_name: r.assistant_name ?? "", distance_km: r.distance_km != null ? String(r.distance_km) : "" }); }}
                className="rounded-lg bg-muted p-2"><Edit3 className="size-3.5" /></button>
              <button onClick={() => remove(r.id)} className="rounded-lg bg-destructive/10 p-2 text-destructive"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ الأسعار ============ */
function PricingTab() {
  const qc = useQueryClient();
  const { data: pricing } = usePricing();
  const [settings, setSettings] = useSettings();
  const [ppm, setPpm] = useState<string>("");
  const [emb, setEmb] = useState<string>("");
  const [cur, setCur] = useState<string>("");

  function init() {
    setPpm(String(pricing?.price_per_meter ?? settings.pricePerMeter));
    setEmb(String((pricing?.embossed_premium_rate ?? settings.embossedRate) * 100));
    setCur(pricing?.currency ?? settings.currency);
  }
  if (pricing && ppm === "") init();

  async function save() {
    // 1) العملة وأسعار افتراضية → إعدادات محلية (لتجاوز schema cache)
    setSettings({ ...settings, currency: cur, pricePerMeter: Number(ppm), embossedRate: Number(emb) / 100 });

    // 2) محاولة المزامنة إلى Supabase دون عمود currency غير الموجود
    const payload: Record<string, unknown> = {
      price_per_meter: Number(ppm),
      embossed_premium_rate: Number(emb) / 100,
      updated_at: new Date().toISOString(),
    };
    const rowId = pricing?._rowId ?? null;
    const res = rowId
      ? await supabase.from("pricing_config").update(payload).eq("id", rowId as string)
      : await supabase.from("pricing_config").insert(payload);

    if (res.error) toast.warning(`حُفظ محلياً — تعذر المزامنة: ${res.error.message}`);
    else toast.success("تم تحديث الأسعار");
    qc.invalidateQueries({ queryKey: ["pricing"] });
  }

  return (
    <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
      <h2 className="text-sm font-black">إعدادات التسعير</h2>
      <p className="text-xs text-muted-foreground">يطبق فوراً على المحاكي في كل المنتجات. العملة تُحفظ ضمن إعدادات المنصة الشاملة.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-bold">السعر/متر²</span>
          <input type="number" step="0.5" value={ppm} onChange={(e) => setPpm(e.target.value)}
            className="mt-1 w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="block">
          <span className="text-xs font-bold">نسبة البروز %</span>
          <input type="number" step="1" value={emb} onChange={(e) => setEmb(e.target.value)}
            className="mt-1 w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="block">
          <span className="text-xs font-bold">العملة</span>
          <select value={cur} onChange={(e) => setCur(e.target.value)}
            className="mt-1 w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
            {CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
      </div>
      <button onClick={save} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft hover:opacity-90">
        <Save className="size-4" /> حفظ
      </button>
    </div>
  );
}

/* ============ إعدادات المنصة الشاملة ============ */
function GlobalSettingsTab() {
  const [s, setS] = useSettings();
  const [draft, setDraft] = useState<PlatformSettings>(s);
  // إعادة المزامنة عند تغيّر s الفعلي مرة واحدة
  if (draft === s && JSON.stringify(draft) !== JSON.stringify(s)) setDraft(s);

  function update<K extends keyof PlatformSettings>(k: K, v: PlatformSettings[K]) {
    setDraft({ ...draft, [k]: v });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-4">
        <div>
          <h2 className="text-sm font-black">إعدادات المنصة الشاملة</h2>
          <p className="text-xs text-muted-foreground mt-1">تتجاوز قيم قاعدة البيانات وتعمل فوراً عبر كل الوحدات.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="العملة الافتراضية">
            <select value={draft.currency} onChange={(e) => update("currency", e.target.value)} className="input">
              {CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="السعر/متر² الافتراضي">
            <input type="number" step="0.5" value={draft.pricePerMeter} onChange={(e) => update("pricePerMeter", +e.target.value)} className="input" />
          </Field>
          <Field label={`رسوم الوقود لكل كم (${draft.currency})`}>
            <input type="number" step="0.05" value={draft.fuelPerKm} onChange={(e) => update("fuelPerKm", +e.target.value)} className="input" />
          </Field>
          <Field label="نسبة البروز الملموس %">
            <input type="number" step="1" value={Math.round(draft.embossedRate * 100)} onChange={(e) => update("embossedRate", +e.target.value / 100)} className="input" />
          </Field>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setS(draft)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft hover:opacity-90">
            <Save className="size-4" /> تطبيق الإعدادات
          </button>
          <button onClick={() => { setS(DEFAULT_SETTINGS); setDraft(DEFAULT_SETTINGS); toast.info("تمت الاستعادة"); }}
            className="rounded-xl bg-muted px-4 py-3 text-xs font-bold text-foreground">استعادة</button>
        </div>
      </div>
    </div>
  );
}

/* ============ Schema Controller / Future-Proofing ============ */
function SchemaControllerTab() {
  const qc = useQueryClient();
  const [s, setS] = useSettings();
  const { data: regions } = useRegions();

  const toggle = (k: keyof PlatformSettings) => setS({ ...s, [k]: !s[k] } as PlatformSettings);

  async function quickAddProvince(name: string) {
    const exists = regions?.some((r) => r.name === name);
    if (exists) { toast.info("المنطقة موجودة مسبقاً"); return; }
    const { error } = await supabase.from("regions").insert({
      name, whatsapp_number: "", assistant_name: null, distance_km: null, is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`أُضيفت ${name}`);
    qc.invalidateQueries({ queryKey: ["regions"] });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
        <h2 className="text-sm font-black">إعدادات متقدّمة للمنصّة</h2>
        <p className="text-xs text-muted-foreground">مفاتيح تحكم سريعة لتشغيل الأقسام ووضع الذكاء الاصطناعي دون تعديل الكود.</p>

        <div className="grid gap-2 sm:grid-cols-2">
          <QuotaToggleRow label="إظهار قسم حملة الإطلاق" value={s.showMarketingBanner} onChange={() => toggle("showMarketingBanner")} />
          <QuotaToggleRow label="إظهار خدمة الأسطول السريع" value={s.fleetMobilizationEnabled} onChange={() => toggle("fleetMobilizationEnabled")} />
          <QuotaToggleRow label="تسجيل تجارب تجربة الأزياء" value={s.aiTryOnLogging} onChange={() => toggle("aiTryOnLogging")} />
          <QuotaToggleRow label="تفعيل المزامنة بدون إنترنت" value={s.enableOfflineSync} onChange={() => toggle("enableOfflineSync")} />
          <QuotaToggleRow label="وضع المعاينة الفورية على الجهاز (إيقاف = ذكاء اصطناعي حقيقي عبر بوّابة Lovable)" value={s.aiSimulationOnly} onChange={() => toggle("aiSimulationOnly")} />
        </div>

      </div>

      <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
        <h2 className="text-sm font-black">إضافة سريعة للمحافظات السورية</h2>
        <p className="text-xs text-muted-foreground">انقر لإضافة منطقة جديدة فوراً، ثم اربط رقم الواتساب من تبويب «المناطق».</p>
        <div className="flex flex-wrap gap-2">
          {SYRIAN_PROVINCES.map((p) => (
            <button key={p} onClick={() => quickAddProvince(p)}
              className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-bold hover:border-primary hover:text-primary">
              + {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-foreground/80">{label}</span>
      <div className="mt-1 [&_.input]:w-full [&_.input]:rounded-xl [&_.input]:bg-muted [&_.input]:px-3 [&_.input]:py-2 [&_.input]:text-sm [&_.input]:outline-none [&_.input]:focus:ring-2 [&_.input]:focus:ring-ring">
        {children}
      </div>
    </label>
  );
}

function QuotaToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`flex items-center justify-between rounded-xl border-2 px-3 py-3 text-xs font-bold transition ${value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground/80"}`}>
      <span>{label}</span>
      <span className={`grid h-5 w-9 items-center rounded-full ${value ? "bg-primary" : "bg-muted"}`}>
        <span className={`block size-4 rounded-full bg-background transition ${value ? "translate-x-[-16px]" : "translate-x-0"}`} />
      </span>
    </button>
  );
}


/* ============ الطلبات ============ */
function OrdersTab() {
  const qc = useQueryClient();
  const { data: regions } = useRegions();
  const [filterRegion, setFilterRegion] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const { data: orders } = useQuery({
    queryKey: ["orders", filterRegion, filterStatus],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(300);
      if (filterRegion) q = q.eq("region_name", filterRegion);
      if (filterStatus) q = q.eq("status", filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  async function setStatus(id: string, status: string) {
    await supabase.from("orders").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["orders"] });
  }

  return (
    <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-black">الطلبات الواردة ({orders?.length ?? 0})</h2>
        <div className="flex gap-2">
          <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}
            className="rounded-lg bg-muted px-2 py-1 text-xs">
            <option value="">كل المناطق</option>
            {regions?.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg bg-muted px-2 py-1 text-xs">
            <option value="">كل الحالات</option>
            <option value="new">جديد</option>
            <option value="inspected">تم المعاينة</option>
            <option value="active">قيد التنفيذ</option>
            <option value="finished">منتهي</option>
            <option value="contacted">تم التواصل</option>
            <option value="done">منجز</option>
            <option value="cancelled">ملغى</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        {orders?.map((o) => (
          <div key={o.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{o.design_name ?? "—"} · {o.region_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {o.width}م × {o.height}م {o.embossed ? "· بروز" : ""} · {Number(o.total).toLocaleString("ar")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString("ar")}</p>
              </div>
              <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}
                className="rounded-lg bg-muted px-2 py-1 text-xs">
                <option value="new">جديد</option>
                <option value="inspected">تم المعاينة</option>
                <option value="active">قيد التنفيذ</option>
                <option value="finished">منتهي</option>
                <option value="contacted">تم التواصل</option>
                <option value="done">منجز</option>
                <option value="cancelled">ملغى</option>
              </select>
            </div>
          </div>
        ))}
        {(!orders || orders.length === 0) && <p className="text-center text-sm text-muted-foreground py-8">لا طلبات بعد.</p>}
      </div>
    </div>
  );
}

/* ============ السوق (Vendors) ============ */
type VendorRow = { id: string; name: string; category: string; phone: string; logo_url: string | null; is_premium: boolean; region_id: string | null; subscription_status?: string | null; login_token?: string | null; cover_image?: string | null };
type VForm = { name: string; category: string; phone: string; logo_url: string; is_premium: boolean; region_id: string };
const EMPTY_V: VForm = { name: "", category: "", phone: "", logo_url: "", is_premium: false, region_id: "" };

function VendorsTab() {
  const qc = useQueryClient();
  const [cats] = useCategories();
  const { data: regions } = useRegions();
  const [form, setForm] = useState<VForm>(EMPTY_V);
  const [editing, setEditing] = useState<string | null>(null);

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VendorRow[];
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) { toast.error("الاسم والرقم مطلوبان"); return; }
    const payload = {
      name: form.name,
      category: form.category,
      phone: form.phone.replace(/\D/g, ""),
      logo_url: form.logo_url || null,
      is_premium: form.is_premium,
      region_id: form.region_id || null,
    };
    const res = editing
      ? await supabase.from("vendors").update(payload).eq("id", editing)
      : await supabase.from("vendors").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("تم الحفظ");
    setForm(EMPTY_V); setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    qc.invalidateQueries({ queryKey: ["vendors"] });
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا الشريك؟")) return;
    await supabase.from("vendors").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-vendors"] });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
        <h2 className="text-sm font-black">{editing ? "تعديل شريك" : "إضافة شريك للسوق"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="اسم النشاط *" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-xl bg-muted px-3 py-2 text-sm outline-none">
            <option value="">— اختر الفئة —</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="واتساب 963xxx" />
          <Input value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} placeholder="رابط الشعار" />
          <select value={form.region_id} onChange={(e) => setForm({ ...form, region_id: e.target.value })}
            className="rounded-xl bg-muted px-3 py-2 text-sm outline-none">
            <option value="">— كل المناطق —</option>
            {regions?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_premium} onChange={(e) => setForm({ ...form, is_premium: e.target.checked })} />
            مميّز (Premium)
          </label>
        </div>
        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft hover:opacity-90">
          {editing ? <Save className="size-4" /> : <Plus className="size-4" />} {editing ? "حفظ" : "إضافة"}
        </button>
        {editing && <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_V); }} className="text-xs text-muted-foreground">إلغاء</button>}
      </form>

      <div className="rounded-2xl bg-card p-5 shadow-card border border-border">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-black">الشركاء ({vendors?.length ?? 0})</h2>
          <CSVImportButton
            table="vendors"
            sample="name,category,phone,logo_url,is_premium"
            map={(row) => ({
              name: row.name,
              category: row.category || "other",
              phone: (row.phone || "").replace(/\D/g, ""),
              logo_url: row.logo_url || null,
              is_premium: ["true","1","yes","نعم"].includes((row.is_premium || "").toLowerCase()),
            })}
            onDone={() => qc.invalidateQueries({ queryKey: ["admin-vendors"] })}
          />
        </div>

        <div className="space-y-2">
          {vendors?.map(v => <VendorRowEditor key={v.id} v={v} onEdit={() => { setEditing(v.id); setForm({ name: v.name, category: v.category, phone: v.phone, logo_url: v.logo_url ?? "", is_premium: v.is_premium, region_id: v.region_id ?? "" }); }} onRemove={() => remove(v.id)} />)}
          {(!vendors || vendors.length === 0) && <p className="text-center text-xs text-muted-foreground py-6">لا شركاء بعد. أضف أول شريك ليظهر في السوق.</p>}
        </div>
      </div>
    </div>
  );
}

function VendorRowEditor({ v, onEdit, onRemove }: { v: VendorRow; onEdit: () => void; onRemove: () => void }) {
  const qc = useQueryClient();
  const [store, setOne] = useVendorStore();
  const state: VendorState = store[v.id] ?? DEFAULT_VENDOR_STATE;
  const toggleMod = (k: keyof VendorState["modules"]) => setOne(v.id, { ...state, modules: { ...state.modules, [k]: !state.modules[k] } });

  const currentStatus: VendorStatus = (v.subscription_status as VendorStatus) || "active";

  async function setStatus(next: VendorStatus) {
    const { error } = await supabase.from("vendors").update({ subscription_status: next }).eq("id", v.id);
    if (error) { toast.error(error.message); return; }
    setOne(v.id, { ...state, status: next });
    toast.success(`الحالة: ${STATUS_LABELS[next]}`);
    qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    qc.invalidateQueries({ queryKey: ["vendors"] });
  }

  async function generateToken() {
    const t = generateLoginToken();
    const { error } = await supabase.from("vendors").update({ login_token: t }).eq("id", v.id);
    if (error) { toast.error(error.message); return; }
    await navigator.clipboard.writeText(t).catch(() => {});
    toast.success(`نُسخ رمز الدخول: ${t}`);
    qc.invalidateQueries({ queryKey: ["admin-vendors"] });
  }

  const dim = currentStatus === "suspended" || currentStatus === "hidden";

  return (
    <div className={`rounded-xl border bg-background p-3 ${dim ? "border-destructive/40 opacity-70" : "border-border"}`}>
      <div className="flex items-center gap-3">
        {v.logo_url && <img src={v.logo_url} className="size-10 rounded-lg object-cover bg-muted" alt="" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">{v.name} {v.is_premium && <span className="text-[10px] text-primary">★</span>}</p>
          <p className="text-[11px] text-muted-foreground" dir="ltr">{v.category} · {v.phone}</p>
          {v.login_token && <p className="text-[10px] font-mono text-primary mt-1" dir="ltr">🔑 {v.login_token}</p>}
        </div>
        <button onClick={generateToken} title="توليد رمز دخول للشريك" className="rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">رمز</button>
        <button onClick={onEdit} className="rounded-lg bg-muted p-2"><Edit3 className="size-3.5" /></button>
        <button onClick={onRemove} className="rounded-lg bg-destructive/10 p-2 text-destructive"><Trash2 className="size-3.5" /></button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-muted-foreground">الوحدات:</span>
        <ModBtn label="ديكور" on={state.modules.decor} onClick={() => toggleMod("decor")} />
        <ModBtn label="أزياء AI" on={state.modules.fashion} onClick={() => toggleMod("fashion")} />
        <ModBtn label="قصّات AI" on={state.modules.haircut} onClick={() => toggleMod("haircut")} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-muted-foreground">الحالة:</span>
        {(["active","idle","suspended","hidden"] as VendorStatus[]).map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black transition ${
              currentStatus === s
                ? s === "active" ? "bg-success/15 text-success" :
                  s === "idle" ? "bg-muted text-foreground" :
                  "bg-destructive/15 text-destructive"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}>
            {STATUS_LABELS[s].split(" ")[0]}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModBtn({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"}`}>
      {on ? "✓" : "○"} {label}
    </button>
  );
}

/* ============ CMS Strings — Zero-Code Content Editor ============ */
function CmsStringsTab() {
  const [strings, setStrings] = useCmsStrings();
  const [draft, setDraft] = useState<Record<string, string>>(strings);
  const [filter, setFilter] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  // مزامنة عند تغيّر فعلي
  if (Object.keys(draft).length === 0 && Object.keys(strings).length > 0) setDraft(strings);

  const keys = Object.keys({ ...DEFAULT_STRINGS, ...draft }).filter(k => k.includes(filter) || (draft[k] ?? "").includes(filter));

  function update(k: string, v: string) { setDraft({ ...draft, [k]: v }); }
  function remove(k: string) {
    const next = { ...draft }; delete next[k]; setDraft(next);
  }
  function save() { setStrings(draft); toast.success("تم حفظ نصوص الموقع — تظهر فوراً"); }
  function reset() { setDraft(DEFAULT_STRINGS); setStrings(DEFAULT_STRINGS); toast.info("استعادة افتراضية"); }
  function add() {
    if (!newKey.trim()) return;
    setDraft({ ...draft, [newKey.trim()]: newVal });
    setNewKey(""); setNewVal("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black">محرّر نصوص الموقع (Zero-Code CMS)</h2>
            <p className="text-xs text-muted-foreground mt-1">عدّل أي زر، عنوان، أو وصف عربي دون لمس الكود — يطبّق فوراً.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Save className="inline size-3" /> حفظ</button>
            <button onClick={reset} className="rounded-lg bg-muted px-3 py-1.5 text-xs font-bold">استعادة</button>
          </div>
        </div>

        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="بحث بالمفتاح أو النص…"
          className="w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />

        <div className="grid gap-2 sm:grid-cols-2">
          {keys.map((k) => (
            <div key={k} className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <code className="text-[10px] font-bold text-primary">{k}</code>
                <button onClick={() => remove(k)} className="text-destructive"><Trash2 className="size-3" /></button>
              </div>
              <textarea rows={2} value={draft[k] ?? DEFAULT_STRINGS[k] ?? ""} onChange={(e) => update(k, e.target.value)}
                className="mt-1 w-full rounded-lg bg-muted px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-2">
        <h3 className="text-sm font-black">إضافة مفتاح نصي جديد</h3>
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="مثال: home.cta_extra"
            className="rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="النص المعروض"
            className="rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={add} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><Plus className="inline size-3" /> إضافة</button>
        </div>
      </div>
    </div>
  );
}

/* ============ المحاولات والإعلانات ============ */
function QuotaSettingsTab() {
  const [s, setS] = useSettings();
  const set = (patch: Partial<typeof s>) => setS({ ...s, ...patch });

  return (
    <div className="space-y-4">
      <div className="rounded-3xl p-5 text-primary-foreground shadow-soft" style={{ background: "var(--gradient-hero)" }}>
        <h2 className="text-base font-black">🌹 إدارة المحاولات والإعلانات</h2>
        <p className="mt-1 text-xs opacity-90">تحكم في حصة الزوار، فعّل الوصول غير المحدود، أو امنحهم محاولات إضافية مقابل مشاهدة إعلان قصير.</p>
        <p className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-black">
          الأدمن: محاولات غير محدودة دائماً ✓
        </p>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-4">
        <AdToggleRow
          label="حصص الزوار غير محدودة"
          desc="عند التفعيل، يستطيع كل الزوار توليد عدد لا نهائي من النتائج (مناسب للعروض الترويجية)."
          checked={s.quotaUnlimited}
          onChange={(v) => set({ quotaUnlimited: v })}
        />

        <AdNumberRow
          label="عدد المحاولات اليومية المجانية"
          value={s.freeAttemptsDaily}
          min={0} max={50}
          disabled={s.quotaUnlimited}
          onChange={(v: number) => set({ freeAttemptsDaily: v })}
        />
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-4">
        <h3 className="text-sm font-black">مكافأة مشاهدة الإعلان</h3>
        <AdToggleRow
          label="السماح باستعادة محاولة عبر مشاهدة إعلان"
          desc="بعد نفاد المحاولات، يظهر للزائر زر مشاهدة إعلان قصير لاستعادة محاولة جديدة."
          checked={s.adRewardEnabled}
          onChange={(v) => set({ adRewardEnabled: v })}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <AdNumberRow label="محاولات لكل إعلان" value={s.adBonusAttempts} min={1} max={10}
            disabled={!s.adRewardEnabled} onChange={(v) => set({ adBonusAttempts: v })} compact />
          <AdNumberRow label="الحد الأقصى يومياً" value={s.adMaxDaily} min={0} max={50}
            disabled={!s.adRewardEnabled} onChange={(v) => set({ adMaxDaily: v })} compact />
          <AdNumberRow label="مدة الإعلان (ثانية)" value={s.adSeconds} min={5} max={60}
            disabled={!s.adRewardEnabled} onChange={(v) => set({ adSeconds: v })} compact />
        </div>
      </div>
    </div>
  );
}

function AdToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 accent-primary" />
      <div className="flex-1">
        <p className="text-sm font-bold">{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>}
      </div>
    </label>
  );
}

function AdNumberRow({ label, value, min, max, onChange, disabled, compact }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; disabled?: boolean; compact?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-50" : ""}`}>
      <span className={`${compact ? "text-[11px]" : "text-xs"} font-bold`}>{label}</span>
      <input type="number" min={min} max={max} value={value} disabled={disabled}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        className="mt-1 w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed" />
    </label>
  );
}

/* ============ Helpers ============ */
function CurrencyQuickSwitch() {
  const [s, setS] = useSettings();
  return (
    <label className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] font-bold text-primary">
      <span className="opacity-70">العملة</span>
      <select
        value={s.currency}
        onChange={(e) => setS({ ...s, currency: e.target.value })}
        className="bg-transparent outline-none text-primary font-black"
        title="تبديل العملة الفوري عبر كل الوحدات"
      >
        {CURRENCY_OPTIONS.map((c) => (
          <option key={c.value} value={c.value} className="bg-background text-foreground">{c.label}</option>
        ))}
      </select>
    </label>
  );
}

function Input({ value, onChange, placeholder, type = "text", full }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; full?: boolean }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type}
      className={`${full ? "sm:col-span-2 " : ""}rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring`} />
  );
}

function CSVImportButton({ table, sample, map, onDone }: {
  table: string;
  sample: string;
  map: (row: Record<string, string>) => Record<string, unknown>;
  onDone: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try {
      const text = await f.text();
      const rows = parseCSV(text);
      if (!rows.length) { toast.error("لا توجد صفوف في الملف"); return; }
      const payload = rows.map(map);
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
      toast.success(`تم استيراد ${payload.length} صف`);
      onDone();
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      toast.error(`فشل الاستيراد: ${m}`);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  function downloadSample() {
    const blob = new Blob([sample + "\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${table}-sample.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={downloadSample} type="button"
        className="text-[10px] text-muted-foreground hover:text-primary underline">عيّنة CSV</button>
      <button onClick={() => ref.current?.click()} type="button" disabled={busy}
        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 disabled:opacity-50">
        <Upload className="size-3.5" /> {busy ? "..." : "استيراد CSV"}
      </button>
      <input ref={ref} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
    </div>
  );
}


/* ============ تبويب الاشتراكات والدفع (شام كاش) ============ */
function PaymentsTab() {
  const [s, set] = useSettings();
  const requests = usePaymentRequests();
  const [manualDevice, setManualDevice] = useState("");
  const [manualAttempts, setManualAttempts] = useState(100);

  function uploadQR(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { set({ ...s, shamCashQR: r.result as string }); toast.success("تم تحديث صورة QR"); };
    r.readAsDataURL(f);
  }

  function updatePackage(idx: number, patch: Partial<PaymentPackage>) {
    const next = [...s.paymentPackages];
    next[idx] = { ...next[idx], ...patch };
    set({ ...s, paymentPackages: next });
  }
  function addPackage() {
    set({ ...s, paymentPackages: [...s.paymentPackages, { id: "p" + Date.now(), label: "باقة جديدة", attempts: 50, priceUSD: 3, priceSYP: 40000 }] });
  }
  function removePackage(idx: number) {
    set({ ...s, paymentPackages: s.paymentPackages.filter((_, i) => i !== idx) });
  }

  function onApprove(req: PaymentRequest) {
    const pkg = s.paymentPackages.find((p) => p.id === req.packageId);
    const attempts = pkg?.attempts ?? 0;
    if (approveRequest(req.id, attempts)) {
      toast.success(`تم تفعيل ${attempts} محاولة للجهاز ${req.deviceId}`);
    }
  }
  function onReject(req: PaymentRequest) {
    rejectRequest(req.id, "تم الرفض من الأدمن");
    toast.info("تم رفض الطلب");
  }
  function onManualGrant() {
    if (!manualDevice.trim() || manualAttempts <= 0) return;
    grantCreditsByDevice(manualDevice.trim().toUpperCase(), manualAttempts);
    toast.success(`تم منح ${manualAttempts} محاولة للجهاز ${manualDevice.trim().toUpperCase()}`);
    setManualDevice("");
  }

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
        <h3 className="text-sm font-black flex items-center gap-2"><Wallet className="size-4 text-primary" /> إعدادات الدفع عبر شام كاش</h3>
        <AdToggleRow label="تفعيل الاشتراكات المدفوعة" desc="عند التفعيل يرى الزوار خيار الشراء عند نفاد محاولاتهم."
          checked={s.paidEnabled} onChange={(v: boolean) => set({ ...s, paidEnabled: v })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold">رقم شام كاش</span>
            <input value={s.shamCashNumber} onChange={(e) => set({ ...s, shamCashNumber: e.target.value })}
              placeholder="مثال: 0991234567" className="mt-1 w-full rounded-xl bg-muted px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-bold">اسم المستلم</span>
            <input value={s.shamCashName} onChange={(e) => set({ ...s, shamCashName: e.target.value })}
              placeholder="الاسم الكامل" className="mt-1 w-full rounded-xl bg-muted px-3 py-2 text-sm" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-bold">تعليمات الدفع (تظهر للزائر)</span>
          <textarea value={s.shamCashNotes} onChange={(e) => set({ ...s, shamCashNotes: e.target.value })} rows={2}
            className="mt-1 w-full rounded-xl bg-muted px-3 py-2 text-sm" />
        </label>
        <div>
          <p className="text-xs font-bold mb-1.5">صورة QR للدفع</p>
          {s.shamCashQR && <img src={s.shamCashQR} alt="QR" className="mb-2 h-32 w-32 rounded-xl border border-border object-contain bg-white" />}
          <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20">
            <Upload className="size-3.5" /> {s.shamCashQR ? "تغيير الصورة" : "رفع صورة QR"}
            <input type="file" accept="image/*" className="hidden" onChange={uploadQR} />
          </label>
          {s.shamCashQR && (
            <button onClick={() => set({ ...s, shamCashQR: "" })}
              className="ms-2 text-xs text-destructive underline">حذف</button>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black">باقات الاشتراك</h3>
          <button onClick={addPackage} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            <Plus className="size-3.5" /> إضافة باقة
          </button>
        </div>
        <div className="space-y-2">
          {s.paymentPackages.map((p, i) => (
            <div key={p.id} className="grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-xl border border-border bg-background p-2.5">
              <input value={p.label} onChange={(e) => updatePackage(i, { label: e.target.value })}
                placeholder="الاسم" className="rounded-lg bg-muted px-2 py-1.5 text-xs col-span-2" />
              <input type="number" value={p.attempts} onChange={(e) => updatePackage(i, { attempts: Number(e.target.value) || 0 })}
                placeholder="محاولات" className="rounded-lg bg-muted px-2 py-1.5 text-xs" />
              <input type="number" value={p.priceUSD} onChange={(e) => updatePackage(i, { priceUSD: Number(e.target.value) || 0 })}
                placeholder="USD" className="rounded-lg bg-muted px-2 py-1.5 text-xs" />
              <div className="flex gap-1">
                <input type="number" value={p.priceSYP} onChange={(e) => updatePackage(i, { priceSYP: Number(e.target.value) || 0 })}
                  placeholder="ل.س" className="flex-1 rounded-lg bg-muted px-2 py-1.5 text-xs" />
                <button onClick={() => removePackage(i)} className="rounded-lg bg-destructive/10 px-2 text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
        <h3 className="text-sm font-black flex items-center gap-2">
          <Bell className="size-4 text-primary" /> طلبات الدفع المعلّقة
          {pending.length > 0 && <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] text-destructive-foreground">{pending.length}</span>}
        </h3>
        {requests.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد طلبات بعد. عندما يدفع زائر سيظهر طلبه هنا.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => {
              const pkg = s.paymentPackages.find((p) => p.id === r.packageId);
              return (
                <div key={r.id} className="rounded-xl border border-border bg-background p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-black text-primary">{r.id} • {pkg?.label ?? r.packageId}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {r.userName} — {r.phone} — جهاز: <span className="font-mono">{r.deviceId}</span>
                      </p>
                      {r.txRef && <p className="text-muted-foreground">رقم العملية: {r.txRef}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(r.createdAt).toLocaleString("ar")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.status === "approved" ? "bg-emerald-500/15 text-emerald-600" :
                        r.status === "rejected" ? "bg-destructive/15 text-destructive" :
                        "bg-amber-500/15 text-amber-600"
                      }`}>
                        {r.status === "approved" ? "موافق" : r.status === "rejected" ? "مرفوض" : "معلّق"}
                      </span>
                      {r.status === "pending" && (
                        <>
                          <button onClick={() => onApprove(r)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-white">
                            <Check className="size-3" /> موافقة
                          </button>
                          <button onClick={() => onReject(r)}
                            className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[11px] font-bold text-destructive">
                            <X className="size-3" /> رفض
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-card border border-border space-y-3">
        <h3 className="text-sm font-black">منح يدوي بكود الجهاز</h3>
        <p className="text-[11px] text-muted-foreground">
          إذا تواصل الزائر معك مباشرةً، اطلب منه كود جهازه (يظهر له في شاشة الدفع) وامنح المحاولات يدوياً.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={manualDevice} onChange={(e) => setManualDevice(e.target.value)}
            placeholder="كود الجهاز DV-XXXXXX" className="rounded-xl bg-muted px-3 py-2 text-sm font-mono" />
          <input type="number" value={manualAttempts} onChange={(e) => setManualAttempts(Number(e.target.value) || 0)}
            placeholder="عدد المحاولات" className="rounded-xl bg-muted px-3 py-2 text-sm" />
          <button onClick={onManualGrant}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground">منح المحاولات</button>
        </div>
      </div>
    </div>
  );
}

/* ============ تبويب قصّات الشعر المخصّصة ============ */
function DesignsTab() {
  const [s, set] = useSettings();
  const [section, setSection] = useState<DesignSection>("haircut");
  const [form, setForm] = useState<{ label: string; prompt: string; preview: string; gender: "m" | "f" | "u" }>({
    label: "", prompt: "", preview: "", gender: "u",
  });

  function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setForm((p) => ({ ...p, preview: r.result as string }));
    r.readAsDataURL(f);
  }

  function add() {
    if (!form.label.trim()) { toast.error("اسم التصميم مطلوب"); return; }
    if (section === "haircut" && !form.preview) { toast.error("صورة المعاينة مطلوبة لقصّات الشعر"); return; }
    if (section !== "haircut" && !form.prompt.trim()) { toast.error("اكتب وصف/برومبت AI"); return; }

    const id = "d" + Date.now();
    const next: PlatformSettings = { ...s };
    // ربط تلقائي حسب القسم
    if (section === "haircut") {
      next.customHaircuts = [...s.customHaircuts, {
        id, label: form.label.trim(), gender: form.gender,
        preview: form.preview, prompt: form.prompt.trim() || undefined,
      }];
    }
    next.customDesigns = [...s.customDesigns, {
      id, section, label: form.label.trim(),
      prompt: form.prompt.trim() || form.label.trim(),
      preview: form.preview || undefined,
      createdAt: Date.now(),
    }];
    set(next);
    setForm({ label: "", prompt: "", preview: "", gender: "u" });
    toast.success(`تمت إضافة "${form.label}" إلى ${SECTION_LABELS[section]} تلقائياً`);
  }

  function remove(id: string) {
    set({
      ...s,
      customDesigns: s.customDesigns.filter((d) => d.id !== id),
      customHaircuts: s.customHaircuts.filter((c) => c.id !== id),
    });
  }

  const sections: DesignSection[] = ["haircut", "simulator", "marketing", "tryon"];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5 shadow-card border border-primary/20">
        <h3 className="text-sm font-black flex items-center gap-2 mb-1">
          <Sparkles className="size-4 text-primary" /> أضف تصميماً جديداً — يُربط تلقائياً بالقسم
        </h3>
        <p className="text-[11px] text-muted-foreground mb-4">
          اختر القسم وأضف الاسم وبرومبت AI (وصورة معاينة اختيارية). سيظهر التصميم فوراً كزرّ سريع داخل القسم المختار.
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          {sections.map((sec) => (
            <button key={sec} onClick={() => setSection(sec)}
              className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition ${section === sec ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"}`}>
              {SECTION_LABELS[sec]}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={form.label} onChange={(v) => setForm((p) => ({ ...p, label: v }))} placeholder="اسم التصميم (مثال: حديقة ورود ذهبية)" />
          {section === "haircut" && (
            <select value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as "m" | "f" | "u" }))}
              className="rounded-xl bg-muted px-3 py-2 text-sm">
              <option value="u">الجميع</option>
              <option value="m">رجال</option>
              <option value="f">نساء</option>
            </select>
          )}
        </div>

        <textarea value={form.prompt} onChange={(e) => setForm((p) => ({ ...p, prompt: e.target.value }))}
          placeholder="برومبت AI بالإنجليزية (مثال: soft pink rose garden mural, romantic warm lighting)"
          className="mt-3 w-full rounded-xl bg-muted px-3 py-2 text-sm min-h-[72px]" />

        <div className="mt-3 flex items-center gap-3">
          {form.preview && <img src={form.preview} alt="" className="h-20 w-20 rounded-xl object-cover border border-border" />}
          <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
            <Upload className="size-3.5" /> {form.preview ? "تغيير الصورة" : "رفع صورة معاينة (اختياري)"}
            <input type="file" accept="image/*" className="hidden" onChange={onImage} />
          </label>
        </div>

        <button onClick={add}
          className="mt-4 w-full rounded-xl bg-gradient-to-l from-primary to-primary-glow px-4 py-3 text-sm font-black text-primary-foreground shadow-soft">
          ➕ إضافة وربط تلقائي بـ {SECTION_LABELS[section]}
        </button>
      </div>

      {sections.map((sec) => {
        const items = s.customDesigns.filter((d) => d.section === sec);
        if (items.length === 0) return null;
        return (
          <div key={sec} className="rounded-2xl bg-card p-5 shadow-card border border-border">
            <h3 className="text-sm font-black mb-3 flex items-center gap-2">
              <Check className="size-4 text-primary" /> {SECTION_LABELS[sec]} ({items.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {items.map((d) => (
                <div key={d.id} className="relative overflow-hidden rounded-xl border border-border bg-muted/30">
                  {d.preview ? (
                    <img src={d.preview} alt={d.label} className="h-28 w-full object-cover" />
                  ) : (
                    <div className="h-28 w-full grid place-items-center bg-gradient-to-br from-primary/20 to-accent/20">
                      <Sparkles className="size-6 text-primary" />
                    </div>
                  )}
                  <p className="px-2 py-1.5 text-[11px] font-bold truncate">{d.label}</p>
                  <button onClick={() => remove(d.id)}
                    className="absolute top-1 left-1 rounded-full bg-destructive p-1.5 text-destructive-foreground hover:scale-110 transition">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {s.customDesigns.length === 0 && (
        <div className="rounded-2xl bg-muted/30 p-8 text-center text-xs text-muted-foreground border border-dashed border-border">
          لم تضف أي تصميم بعد — أضف أوّل تصميم ليظهر فوراً في القسم المناسب.
        </div>
      )}
    </div>
  );
}

function BulkProductsUploader({ onDone }: { onDone: () => void }) {
  const [cats] = useCategories();
  const [type, setType] = useState<string>(cats[0]?.id ?? "other");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c.id} type="button" onClick={() => setType(c.id)}
            className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition ${
              type === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"
            }`}>{c.label}</button>
        ))}
      </div>
      <BatchImageUploader
        onUploaded={async (items: BatchItem[]) => {
          if (!items.length) return;
          const rows = items.map((it) => ({
            title: it.name || "تصميم", image_url: it.dataUrl, price: null, type,
          }));
          const { error } = await supabase.from("products").insert(rows);
          if (error) throw error;
          onDone();
        }}
      />
    </div>
  );
}

/* ============ إدارة الفئات (طبقة بيانات مرنة) ============ */
function CategoriesTab() {
  const [cats, setCats] = useCategories();
  const [draft, setDraft] = useState<Category>({ id: "", label: "", tab: "decor" });

  function add() {
    const id = draft.id.trim().toLowerCase().replace(/\s+/g, "_");
    const label = draft.label.trim();
    if (!id || !label) { toast.error("المعرّف والاسم العربي مطلوبان"); return; }
    if (cats.some((c) => c.id === id)) { toast.error("هذا المعرّف موجود مسبقاً"); return; }
    setCats([...cats, { id, label, tab: draft.tab }]);
    setDraft({ id: "", label: "", tab: "decor" });
    toast.success("تمت إضافة الفئة");
  }

  function update(id: string, patch: Partial<Category>) {
    setCats(cats.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function remove(id: string) {
    if (!confirm("حذف هذه الفئة؟ لن يتأثر المنتجات/الشركاء بل ستظهر فئتهم كما هي.")) return;
    setCats(cats.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
        <h2 className="text-sm font-black">إضافة فئة جديدة</h2>
        <p className="text-[11px] text-muted-foreground">المعرّف بالإنجليزية (مثل: rugs) — يُحفظ في قاعدة البيانات. الاسم العربي يظهر في الواجهة.</p>
        <div className="grid gap-2 sm:grid-cols-4">
          <input value={draft.id} dir="ltr" onChange={(e) => setDraft({ ...draft, id: e.target.value })}
            placeholder="id (مثال: rugs)" className="rounded-xl bg-muted px-3 py-2 text-sm outline-none" />
          <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="الاسم العربي (مثال: سجّاد)" className="rounded-xl bg-muted px-3 py-2 text-sm outline-none" />
          <select value={draft.tab} onChange={(e) => setDraft({ ...draft, tab: e.target.value as CategoryTab })}
            className="rounded-xl bg-muted px-3 py-2 text-sm outline-none">
            <option value="decor">عالم الديكور</option>
            <option value="fashion">عالم الأزياء</option>
          </select>
          <button onClick={add} className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground">
            <Plus className="size-4" /> إضافة
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-3 text-sm font-black">الفئات الحالية ({cats.length})</h2>
        <div className="space-y-2">
          {cats.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-3">
              <code className="rounded bg-muted px-2 py-0.5 text-[11px]" dir="ltr">{c.id}</code>
              <input value={c.label} onChange={(e) => update(c.id, { label: e.target.value })}
                className="flex-1 min-w-[140px] rounded-lg bg-muted px-2 py-1.5 text-sm outline-none" />
              <select value={c.tab} onChange={(e) => update(c.id, { tab: e.target.value as CategoryTab })}
                className="rounded-lg bg-muted px-2 py-1.5 text-xs outline-none">
                <option value="decor">ديكور</option>
                <option value="fashion">أزياء</option>
              </select>
              <button onClick={() => remove(c.id)} className="rounded-lg bg-destructive/10 p-2 text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => { if (confirm("استعادة الفئات الافتراضية؟")) { setCats([]); setTimeout(() => location.reload(), 100); } }}
          className="mt-3 text-[11px] text-muted-foreground hover:text-foreground">
          استعادة الافتراضي
        </button>
      </div>
    </div>
  );
}



function MediaTab() {
  const [s, setS] = useSettings();
  const bgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const [vidTitle, setVidTitle] = useState("");

  function onBg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 4_000_000) { toast.error("الصورة كبيرة — حدّها 4MB"); return; }
    const r = new FileReader();
    r.onload = () => { setS({ ...s, customBgImage: String(r.result) }); toast.success("تم تحديث خلفية الموقع"); };
    r.readAsDataURL(f);
  }

  function onVid(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const big = files.find((f) => f.size > 15_000_000);
    if (big) { toast.error(`الفيديو ${big.name} أكبر من 15MB — اضغطه أولاً`); return; }
    Promise.all(files.map((f) => new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(r.error);
      r.readAsDataURL(f);
    }))).then((urls) => {
      const next = [...(s.customVideos ?? []), ...urls.map((url, i) => ({
        id: `${Date.now()}-${i}`, url, title: vidTitle || undefined,
      }))];
      setS({ ...s, customVideos: next });
      setVidTitle("");
      toast.success(`أُضيفت ${urls.length} فيديو`);
    }).catch(() => toast.error("فشل قراءة الفيديوهات"));
    e.target.value = "";
  }

  function removeVid(id: string) {
    setS({ ...s, customVideos: (s.customVideos ?? []).filter((v) => v.id !== id) });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-base font-black">🖼️ خلفية الموقع الشفافة</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          ارفع صورة (PNG شفافة مفضّلة) لتظهر كخلفية ثابتة خلف كل الصفحات وتعطي الموقع حيوية وهوية.
        </p>

        {s.customBgImage && (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <img src={s.customBgImage} alt="bg" className="max-h-56 w-full object-contain bg-[conic-gradient(at_50%_50%,#0001_25%,transparent_0_50%,#0001_0_75%,transparent_0)] bg-[length:24px_24px]" />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={() => bgRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground">
            <Upload className="size-3.5" /> {s.customBgImage ? "تغيير الصورة" : "رفع صورة الخلفية"}
          </button>
          {s.customBgImage && (
            <button onClick={() => setS({ ...s, customBgImage: "" })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-black text-destructive">
              <Trash2 className="size-3.5" /> إزالة
            </button>
          )}
          <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={onBg} />

          <label className="ms-auto inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
            شفافية:
            <input type="range" min={0} max={100} value={Math.round((s.customBgOpacity ?? 0.18) * 100)}
              onChange={(e) => setS({ ...s, customBgOpacity: Number(e.target.value) / 100 })} />
            <span className="w-8 text-end text-foreground">{Math.round((s.customBgOpacity ?? 0.18) * 100)}%</span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-base font-black">🎬 شريط فيديوهات الواجهة</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          ارفع فيديوهات تعريفية لطابعة الليزر أثناء العمل على الجدران والأرضيات — تظهر للزبائن أعلى الصفحة الرئيسية.
          يُفضّل MP4 أقل من 15MB لكل فيديو.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={vidTitle} onChange={(e) => setVidTitle(e.target.value)}
            placeholder="عنوان اختياري (مثلاً: طباعة جدار 3D)"
            className="flex-1 min-w-[200px] rounded-xl bg-muted px-3 py-2 text-sm" />
          <button onClick={() => vidRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground">
            <Video className="size-3.5" /> رفع فيديو/فيديوهات
          </button>
          <input ref={vidRef} type="file" accept="video/*" multiple className="hidden" onChange={onVid} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(s.customVideos ?? []).map((v) => (
            <div key={v.id} className="overflow-hidden rounded-xl border border-border bg-background">
              <video src={v.url} controls playsInline className="block aspect-video w-full bg-black object-cover" />
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="line-clamp-1 text-xs font-bold">{v.title || "بدون عنوان"}</span>
                <button onClick={() => removeVid(v.id)}
                  className="rounded-lg bg-destructive/10 p-1.5 text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
          {(s.customVideos ?? []).length === 0 && (
            <p className="col-span-full rounded-xl border-2 border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              لا توجد فيديوهات بعد. ارفع أول فيديو ليبدأ بالظهور للزبائن مباشرة.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
