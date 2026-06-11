import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { ShoppingBag, Crown, MessageCircle, Sofa, Shirt, Sparkles, Cuboid, Scissors } from "lucide-react";
import { CampaignSection } from "@/components/CampaignSection";
import { useSettings } from "@/lib/settings";
import { usePricing } from "@/lib/platform";
import { useVendorStore, DEFAULT_VENDOR_STATE } from "@/lib/vendor-config";
import { useStr } from "@/lib/cms-strings";
import { PriceOrTrialBadge } from "@/components/BatchImageUploader";
import { useCategories, idsForTab, labelOf } from "@/lib/categories";

type Vendor = {
  id: string; name: string; category: string;
  phone: string | null; logo_url: string | null; is_premium: boolean;
  cover_image?: string | null; subscription_status?: string | null;
};

type Product = {
  id: string; title: string; type: string | null;
  image_url: string; price: number | null;
};

export const Route = createFileRoute("/marketplace")({
  head: () => ({ meta: [{ title: "سوق الشركاء — وتر الإحساس" }] }),
  component: Marketplace,
});

function Marketplace() {
  const [tab, setTab] = useState<"decor" | "fashion">("decor");
  const [settings] = useSettings();
  const { data: pricing } = usePricing();
  const currency = pricing?.currency ?? settings.currency;
  const [vendorStore] = useVendorStore();
  const [cats] = useCategories();
  const title2 = useStr("marketplace.title_2");
  const tabDecor = useStr("marketplace.tab_decor");
  const tabFashion = useStr("marketplace.tab_fashion");
  const emptyTxt = useStr("marketplace.empty");

  const { data, isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async (): Promise<Vendor[]> => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("is_premium", { ascending: false })
        .order("name");
      if (error) return [];
      return (data ?? []) as Vendor[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products").select("id,title,type,image_url,price")
        .order("created_at", { ascending: false }).limit(60);
      if (error) return [];
      return (data ?? []) as Product[];
    },
  });

  // فلترة الاشتراك: أخفِ الشركاء بحالة hidden/suspended (من العمود الجديد) + احترام التخزين المحلي
  const activeVendors = useMemo(() => {
    return (data ?? []).filter((v) => {
      const status = v.subscription_status ?? "active";
      if (status === "hidden" || status === "suspended") return false;
      const local = vendorStore[v.id] ?? DEFAULT_VENDOR_STATE;
      return local.subscription_active;
    });
  }, [data, vendorStore]);

  const filtered = useMemo(() => {
    const allowed = new Set(idsForTab(cats, tab));
    return activeVendors.filter((v) => allowed.has(v.category));
  }, [activeVendors, tab, cats]);


  return (
    <div className="min-h-screen bg-background px-5 py-8" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link to="/workflow" className="text-sm font-bold text-primary hover:underline">← الوحدات</Link>
        <div>
          <h1 className="mt-1 text-3xl font-black text-foreground">
            {useStr("marketplace.title_1")} <span className="text-primary">{title2}</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            تجربة فاخرة لاكتشاف أفضل شركاء المنطقة — تواصل مباشر مع المحل عبر واتساب.
          </p>
        </div>

        <CampaignSection />

        <div className="inline-flex rounded-2xl border border-border bg-card p-1">
          <TabBtn active={tab === "decor"} onClick={() => setTab("decor")}
            icon={<Sofa className="size-4" />} label={tabDecor} />
          <TabBtn active={tab === "fashion"} onClick={() => setTab("fashion")}
            icon={<Shirt className="size-4" />} label={tabFashion} />
        </div>

        {isLoading && <p className="text-center text-muted-foreground">…تحميل</p>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-border p-10 text-center">
            <ShoppingBag className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-3 font-bold">{emptyTxt}</p>
            <p className="mt-1 text-sm text-muted-foreground">أضف شركاء من لوحة الأدمن لعرضهم هنا.</p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <VendorCard key={v.id} v={v} state={vendorStore[v.id] ?? DEFAULT_VENDOR_STATE} />
          ))}
        </div>


        {products && products.length > 0 && (
          <section className="pt-4">
            <h2 className="text-xl font-black text-foreground">منتجات مختارة</h2>
            <p className="mt-1 text-xs text-muted-foreground">الأسعار معروضة بـ <b className="text-primary">{currency}</b> — تتحدث فوراً عند تبديل العملة من الأدمن.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/50">
                  <img src={p.image_url} alt={p.title} className="h-36 w-full object-cover" />
                  <div className="p-3">
                    <p className="line-clamp-1 text-sm font-bold">{p.title}</p>
                    {p.type && <p className="text-[11px] text-muted-foreground">{p.type}</p>}
                    <PriceOrTrialBadge price={p.price} currency={currency} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }:
  { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
        active ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
      }`}>
      {icon} {label}
    </button>
  );
}

function VendorCard({ v, state }: { v: Vendor; state: { modules: { decor: boolean; fashion: boolean; haircut: boolean }; subscription_active: boolean; brand_badge?: string } }) {
  const [cats] = useCategories();
  const mods = state.modules;
  const isIdle = v.subscription_status === "idle";
  return (
    <div className={`group relative overflow-hidden rounded-3xl border bg-card transition hover:-translate-y-1 ${
      v.is_premium ? "ring-gold glow-rose" : "border-border hover:border-primary/40"
    } ${isIdle ? "grayscale opacity-70" : ""}`}>
      {v.cover_image && (
        <div className="relative h-28 w-full overflow-hidden">
          <img src={v.cover_image} className="size-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        </div>
      )}
      <div className="p-5">
        {v.is_premium && (
          <span className="badge-gold absolute top-3 left-3">
            <Crown className="size-3" /> {state.brand_badge || "شريك مميّز"}
          </span>
        )}
        {isIdle && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            خامل
          </span>
        )}
        <div className="relative flex items-center gap-3">
          <div className="grid size-16 place-items-center rounded-2xl bg-muted ring-1 ring-border">
            {v.logo_url ? (
              <img src={v.logo_url} alt={v.name} className="size-full rounded-2xl object-cover" />
            ) : (
              <Sparkles className="size-6 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-foreground">{v.name}</h3>
            <p className="text-xs text-muted-foreground">{labelOf(cats, v.category)}</p>
          </div>
        </div>

        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {mods.decor && <span className="badge-rose"><Cuboid className="size-3" /> ديكور</span>}
          {mods.fashion && <span className="badge-rose"><Shirt className="size-3" /> أزياء AI</span>}
          {mods.haircut && <span className="badge-rose"><Scissors className="size-3" /> قصّات AI</span>}
        </div>

        <a href={`https://wa.me/${v.phone ?? ""}`} target="_blank" rel="noreferrer"
          className="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
          <MessageCircle className="size-4" /> تواصل واتساب
        </a>
      </div>
    </div>
  );
}
