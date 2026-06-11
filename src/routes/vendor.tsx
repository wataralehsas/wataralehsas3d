import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, KeyRound, LogOut, Save, Upload, Plus, Trash2, Image as ImageIcon, MapPin, Video, Store, Edit3, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readVendorSession, setVendorSession, clearVendorSession } from "@/lib/vendor-config";
import { BatchImageUploader, PriceOrTrialBadge, type BatchItem } from "@/components/BatchImageUploader";
import { useCategories } from "@/lib/categories";

export const Route = createFileRoute("/vendor")({
  head: () => ({ meta: [{ title: "بوابة الشركاء — وتر الإحساس" }] }),
  component: VendorPortal,
});

type Vendor = {
  id: string; name: string; category: string; phone: string;
  logo_url: string | null; cover_image?: string | null; video_url?: string | null;
  map_location?: string | null; bio?: string | null; login_token?: string | null;
  subscription_status?: string | null; is_premium: boolean;
};

function VendorPortal() {
  const session = readVendorSession();
  if (!session) return <LoginScreen />;
  return <VendorDashboard vendorId={session.vendorId} />;
}

/* ============ تسجيل دخول الشريك بالرمز ============ */
function LoginScreen() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("vendors")
      .select("id, login_token, subscription_status")
      .eq("login_token", token.trim())
      .maybeSingle();
    setBusy(false);
    if (error || !data) { toast.error("رمز الدخول غير صحيح"); return; }
    if (data.subscription_status === "suspended" || data.subscription_status === "hidden") {
      toast.error("الاشتراك موقوف — راجع إدارة المنصة");
      return;
    }
    setVendorSession(data.id, token.trim());
    toast.success("مرحباً بك في لوحة تحكمك");
    navigate({ to: "/vendor" });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5" dir="rtl">
      <div className="w-full max-w-md surface-card p-7 animate-fade-up">
        <Link to="/" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          <ArrowRight className="size-4" /> الرئيسية
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 badge-gold">
          <KeyRound className="size-3" /> بوابة الشركاء
        </div>
        <h1 className="mt-3 text-2xl font-black">سجّل دخولك بمعرّف الشريك</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          أدخل رمز الدخول الذي زوّدتك به إدارة المنصة لإدارة معرضك بنفسك.
        </p>

        <form onSubmit={login} className="mt-6 space-y-3">
          <input value={token} onChange={(e) => setToken(e.target.value)}
            placeholder="WTR-XXXXXX-XXXXXX" dir="ltr"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center font-mono text-sm tracking-wider outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={busy}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-soft disabled:opacity-50">
            {busy ? "…جارٍ التحقق" : "دخول إلى لوحتي"}
          </button>
        </form>

        <p className="mt-5 text-[11px] text-muted-foreground text-center">
          لم تستلم رمزاً بعد؟ تواصل مع إدارة وتر الإحساس للحصول على اشتراكك.
        </p>
      </div>
    </div>
  );
}

/* ============ لوحة تحكم الشريك ============ */
function VendorDashboard({ vendorId }: { vendorId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"profile" | "products" | "gallery">("profile");

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor-me", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").eq("id", vendorId).maybeSingle();
      if (error || !data) throw new Error("vendor not found");
      return data as Vendor;
    },
  });

  function logout() {
    clearVendorSession();
    toast.info("تم تسجيل الخروج");
    navigate({ to: "/vendor" });
    setTimeout(() => location.reload(), 50);
  }

  if (isLoading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">…تحميل</div>;
  if (!vendor) { clearVendorSession(); return <LoginScreen />; }

  const suspended = vendor.subscription_status === "suspended" || vendor.subscription_status === "hidden";

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Store className="size-5 text-primary" />
            <div>
              <p className="text-sm font-black">{vendor.name}</p>
              <p className="text-[10px] text-muted-foreground">لوحة تحكم الشريك</p>
            </div>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
            <LogOut className="size-4" /> خروج
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pt-6 space-y-5">
        {suspended && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            ⚠️ اشتراكك حالياً «{vendor.subscription_status}» — تعديلاتك لن تظهر للزوار حتى يُعاد التفعيل من الإدارة.
          </div>
        )}

        <div className="rounded-3xl p-6 text-primary-foreground shadow-soft" style={{ background: "var(--gradient-hero)" }}>
          <h1 className="text-xl font-black">أهلاً، {vendor.name}</h1>
          <p className="mt-1 text-sm opacity-90">أنت تدير معرضك بنفسك — التغييرات تنعكس فوراً في صفحة السوق.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          <TabBtn label="بطاقة المعرض" active={tab === "profile"} onClick={() => setTab("profile")} icon={<Edit3 className="size-3.5" />} />
          <TabBtn label="منتجاتي" active={tab === "products"} onClick={() => setTab("products")} icon={<Package className="size-3.5" />} />
          <TabBtn label="المعرض المرئي" active={tab === "gallery"} onClick={() => setTab("gallery")} icon={<ImageIcon className="size-3.5" />} />
        </div>

        {tab === "profile" && <ProfileTab vendor={vendor} onSaved={() => qc.invalidateQueries({ queryKey: ["vendor-me"] })} />}
        {tab === "products" && <ProductsTab vendor={vendor} />}
        {tab === "gallery" && <GalleryTab vendor={vendor} />}
      </main>
    </div>
  );
}

function TabBtn({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
        active ? "bg-primary text-primary-foreground shadow-soft" : "border border-border bg-card text-foreground/70 hover:text-foreground"
      }`}>
      {icon} {label}
    </button>
  );
}

/* ============ بطاقة المعرض ============ */
function ProfileTab({ vendor, onSaved }: { vendor: Vendor; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: vendor.name,
    phone: vendor.phone,
    bio: vendor.bio ?? "",
    logo_url: vendor.logo_url ?? "",
    cover_image: vendor.cover_image ?? "",
    video_url: vendor.video_url ?? "",
    map_location: vendor.map_location ?? "",
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("vendors").update(form).eq("id", vendor.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ بطاقة المعرض");
    onSaved();
  }

  return (
    <div className="surface-card p-5 space-y-4">
      <h2 className="text-sm font-black">بيانات المعرض</h2>
      {form.cover_image && (
        <img src={form.cover_image} className="h-40 w-full rounded-2xl object-cover ring-1 ring-border" alt="cover" />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="اسم المعرض">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        </Field>
        <Field label="رقم الواتساب">
          <input value={form.phone} dir="ltr" onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
        </Field>
        <Field label="رابط الشعار">
          <input value={form.logo_url} dir="ltr" onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className="input" />
        </Field>
        <Field label="صورة الغلاف (Cover)">
          <input value={form.cover_image} dir="ltr" onChange={(e) => setForm({ ...form, cover_image: e.target.value })} className="input" />
        </Field>
        <Field label={<><Video className="inline size-3.5 text-primary" /> رابط فيديو تعريفي (YouTube/Vimeo)</>}>
          <input value={form.video_url} dir="ltr" onChange={(e) => setForm({ ...form, video_url: e.target.value })} className="input" />
        </Field>
        <Field label={<><MapPin className="inline size-3.5 text-primary" /> رابط الموقع على الخريطة</>}>
          <input value={form.map_location} dir="ltr" onChange={(e) => setForm({ ...form, map_location: e.target.value })} className="input" />
        </Field>
      </div>
      <Field label="نبذة عن المعرض">
        <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="input min-h-[88px]" />
      </Field>
      <button onClick={save} disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-soft disabled:opacity-50">
        <Save className="size-4" /> {busy ? "…حفظ" : "حفظ التعديلات"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-foreground/80">{label}</span>
      <div className="mt-1 [&_.input]:w-full [&_.input]:rounded-xl [&_.input]:border [&_.input]:border-input [&_.input]:bg-background [&_.input]:px-3 [&_.input]:py-2 [&_.input]:text-sm [&_.input]:outline-none [&_.input]:focus:ring-2 [&_.input]:focus:ring-ring">
        {children}
      </div>
    </label>
  );
}

/* ============ منتجاتي ============ */
type Product = { id: string; title: string; price: number | null; image_url: string; type: string | null };

function ProductsTab({ vendor }: { vendor: Vendor }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", price: "", image_url: "", type: vendor.category });

  const { data: items } = useQuery({
    queryKey: ["vendor-items", vendor.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products").select("id,title,image_url,price,type")
        .order("created_at", { ascending: false }).limit(200);
      return (data ?? []) as Product[];
    },
  });

  async function add() {
    if (!form.image_url) { toast.error("الصورة مطلوبة"); return; }
    const { error } = await supabase.from("products").insert({
      title: form.title || "تصميم", image_url: form.image_url,
      price: form.price ? Number(form.price) : null, type: form.type,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("أُضيف العنصر");
    setForm({ title: "", price: "", image_url: "", type: vendor.category });
    qc.invalidateQueries({ queryKey: ["vendor-items"] });
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا العنصر؟")) return;
    await supabase.from("products").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["vendor-items"] });
  }

  return (
    <div className="space-y-4">
      <BatchUploadToProducts vendor={vendor} />

      <div className="surface-card p-5 space-y-3">
        <h2 className="text-sm font-black">إضافة منتج منفرد (اختياري)</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="الاسم (اختياري)" className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="السعر (اختياري)" type="number" className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input value={form.image_url} dir="ltr" onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="رابط الصورة *" className="sm:col-span-2 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={add} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">
          <Plus className="size-4" /> إضافة
        </button>
      </div>

      <div className="surface-card p-5">
        <h2 className="mb-3 text-sm font-black">القائمة ({items?.length ?? 0})</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items?.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-background">
              <img src={p.image_url} className="h-32 w-full object-cover" alt={p.title} />
              <div className="p-3">
                <p className="text-sm font-bold line-clamp-1">{p.title}</p>
                <PriceOrTrialBadge price={p.price} />
                <button onClick={() => remove(p.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                  <Trash2 className="size-3" /> حذف
                </button>
              </div>
            </div>
          ))}
          {(!items || items.length === 0) && <p className="col-span-full text-center text-xs text-muted-foreground py-6">لا منتجات بعد.</p>}
        </div>
      </div>
    </div>
  );
}

function BatchUploadToProducts({ vendor }: { vendor: Vendor }) {
  const qc = useQueryClient();
  const [cats] = useCategories();
  const TYPES = cats.map((c) => c.id);
  const [type, setType] = useState<string>(
    vendor.category && TYPES.includes(vendor.category) ? vendor.category : (TYPES[0] ?? "other")
  );
  async function handle(items: BatchItem[]) {
    if (!items.length) return;
    const rows = items.map((it) => ({
      title: it.name || "تصميم", image_url: it.dataUrl, price: null, type,
    }));
    const { error } = await supabase.from("products").insert(rows);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["vendor-items"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  }
  return (
    <div className="surface-card p-5 space-y-3">
      <h2 className="text-sm font-black">رفع جماعي ذكي (حتى 100 صورة)</h2>
      <p className="text-[11px] text-muted-foreground">اختر الفئة ثم اسحب الصور — تُضغط وتُرفع تلقائياً بدون أيّ بيانات إجبارية.</p>
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c.id} type="button" onClick={() => setType(c.id)}
            className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition ${
              type === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"
            }`}>{c.label}</button>
        ))}
      </div>
      <BatchImageUploader onUploaded={handle} />
    </div>
  );
}


/* ============ المعرض المرئي ============ */
function GalleryTab({ vendor }: { vendor: Vendor }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [cap, setCap] = useState("");

  const { data: gallery } = useQuery({
    queryKey: ["vendor-gallery", vendor.id],
    queryFn: async () => {
      const { data } = await supabase.from("vendor_gallery").select("*").eq("vendor_id", vendor.id).order("sort_order");
      return (data ?? []) as { id: string; image_url: string; caption: string | null }[];
    },
  });

  async function add() {
    if (!url) return;
    const { error } = await supabase.from("vendor_gallery").insert({ vendor_id: vendor.id, image_url: url, caption: cap || null });
    if (error) { toast.error(error.message); return; }
    setUrl(""); setCap("");
    qc.invalidateQueries({ queryKey: ["vendor-gallery"] });
  }

  async function remove(id: string) {
    await supabase.from("vendor_gallery").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["vendor-gallery"] });
  }

  return (
    <div className="space-y-4">
      <div className="surface-card p-5 space-y-3">
        <h2 className="text-sm font-black">إضافة صورة لمعرضك</h2>
        <input value={url} dir="ltr" onChange={(e) => setUrl(e.target.value)} placeholder="رابط الصورة" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <input value={cap} onChange={(e) => setCap(e.target.value)} placeholder="تعليق (اختياري)" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={add} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">
          <Upload className="size-4" /> رفع
        </button>
      </div>

      <div className="surface-card p-5">
        <h2 className="mb-3 text-sm font-black">رفع جماعي للمعرض</h2>
        <BatchImageUploader
          hint="حتى 100 صورة دفعة واحدة — يتم ضغطها وإضافتها فوراً إلى معرضك."
          onUploaded={async (items) => {
            if (!items.length) return;
            const rows = items.map((it, i) => ({
              vendor_id: vendor.id, image_url: it.dataUrl, caption: it.name || null, sort_order: i,
            }));
            const { error } = await supabase.from("vendor_gallery").insert(rows);
            if (error) throw error;
            qc.invalidateQueries({ queryKey: ["vendor-gallery"] });
          }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {gallery?.map((g) => (
          <div key={g.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <img src={g.image_url} className="h-40 w-full object-cover" alt={g.caption ?? ""} />
            <div className="flex items-center justify-between p-3">
              <p className="text-xs">{g.caption ?? "—"}</p>
              <button onClick={() => remove(g.id)} className="text-destructive"><Trash2 className="size-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
