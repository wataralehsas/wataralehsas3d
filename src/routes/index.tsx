import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Cuboid, Shirt, Scissors, ArrowLeft, ShieldCheck, MessageCircle, X, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineSync } from "@/lib/offline-sync";
import { useVendorStore, DEFAULT_VENDOR_STATE } from "@/lib/vendor-config";

type Vendor = {
  id: string; name: string; category: string; phone: string;
  logo_url: string | null; cover_image?: string | null; is_premium: boolean;
  subscription_status?: string | null;
};

const DECOR_CATS = ["curtains", "sofa", "furniture", "other"];
const FASHION_CATS = ["fashion"];
const HAIRCUT_CATS = ["haircut", "salon", "barber"];

type WingKey = "decor" | "haircut" | "fashion";

const WINGS: Record<WingKey, {
  title: string; subtitle: string; icon: typeof Cuboid;
  cats: string[]; toolPath: string; toolLabel: string;
}> = {
  decor: {
    title: "جناح التصميم والديكور الذكي",
    subtitle: "محاكي الجدران والأرضيات بالذكاء الاصطناعي",
    icon: Cuboid, cats: DECOR_CATS,
    toolPath: "/simulator", toolLabel: "افتح محاكي الديكور",
  },
  haircut: {
    title: "صالون وتر الإحساس للعناية وقصّات الشعر AI",
    subtitle: "جرّب قصّتك الجديدة افتراضياً قبل أيّ موعد",
    icon: Scissors, cats: HAIRCUT_CATS,
    toolPath: "/haircut", toolLabel: "ابدأ تجربة قصّة الشعر",
  },
  fashion: {
    title: "المجمّع الافتراضي للأزياء والموضة AI",
    subtitle: "غرفة قياس ذكية تعرض الإطلالة على وجهك",
    icon: Shirt, cats: FASHION_CATS,
    toolPath: "/tryon", toolLabel: "ادخل غرفة قياس الأزياء",
  },
};

// Page-scoped luxury light palette: pure white, charcoal type, warm gold trim.
const GOLD = "#B8893A";
const GOLD_SOFT = "#E8D5A8";
const CHARCOAL = "#1A1A1A";
const CHARCOAL_SOFT = "#5C5C5C";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "وتر الإحساس — مجمّع رقمي فاخر للديكور والأزياء وقصّات AI" },
      { name: "description", content: "ثلاثة أجنحة تفاعلية: ديكور ذكي، صالون قصّات AI، ومجمّع أزياء افتراضي." },
      { property: "og:title", content: "وتر الإحساس — مجمّع رقمي فاخر" },
      { property: "og:description", content: "ديكور ذكي · صالون AI · أزياء افتراضية" },
    ],
  }),
  component: Home,
});

function Home() {
  useOnlineSync();
  const [open, setOpen] = useState<WingKey | null>(null);

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: "#FFFFFF", color: CHARCOAL }}>
      <header style={{ borderBottom: `1px solid ${GOLD_SOFT}` }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="inline-flex items-center gap-2">
            <span
              className="grid size-9 place-items-center rounded-xl font-black"
              style={{ background: "#FFFFFF", color: GOLD, border: `1px solid ${GOLD_SOFT}` }}
            >
              و
            </span>
            <span className="font-black tracking-tight" style={{ color: CHARCOAL }}>وتر الإحساس</span>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition"
            style={{ border: `1px solid ${GOLD_SOFT}`, color: CHARCOAL, background: "#FFFFFF" }}
          >
            <ShieldCheck className="size-3.5" style={{ color: GOLD }} /> لوحة الإدارة
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pt-14 pb-8 sm:pt-20">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold"
          style={{ background: "#FBF6EC", color: GOLD, border: `1px solid ${GOLD_SOFT}` }}
        >
          <Crown className="size-3" /> مجمّع رقمي فاخر
        </span>
        <h1 className="mt-5 text-4xl sm:text-6xl font-black tracking-tight leading-[1.05]" style={{ color: CHARCOAL }}>
          اختر جناحك،
          <br />
          <span style={{ color: GOLD }}>وجرّب قبل أن تقرر.</span>
        </h1>
        <p className="mt-5 max-w-xl text-sm sm:text-base" style={{ color: CHARCOAL_SOFT }}>
          ثلاثة أجنحة فاخرة — ديكور، عناية، وأزياء — مدعومة بالذكاء الاصطناعي.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 pt-4">
        <div className="grid gap-5 sm:grid-cols-3">
          {(Object.keys(WINGS) as WingKey[]).map((k) => {
            const w = WINGS[k];
            const Icon = w.icon;
            return (
              <button
                key={k}
                onClick={() => setOpen(k)}
                className="group relative overflow-hidden rounded-3xl p-6 text-right transition hover:-translate-y-1"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${GOLD_SOFT}`,
                  boxShadow: "0 1px 2px rgba(26,26,26,0.04)",
                }}
              >
                <div className="relative">
                  <div
                    className="grid size-14 place-items-center rounded-2xl"
                    style={{ background: "#FBF6EC", color: GOLD, border: `1px solid ${GOLD_SOFT}` }}
                  >
                    <Icon className="size-7" />
                  </div>
                  <h3 className="mt-5 text-lg font-black leading-tight" style={{ color: CHARCOAL }}>{w.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: CHARCOAL_SOFT }}>{w.subtitle}</p>
                  <span className="mt-6 inline-flex items-center gap-1 text-xs font-black" style={{ color: GOLD }}>
                    افتح النافذة <ArrowLeft className="size-4 transition group-hover:-translate-x-1" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {open && <WingDrawer wingKey={open} onClose={() => setOpen(null)} />}

      <footer className="py-6 text-center text-xs" style={{ borderTop: `1px solid ${GOLD_SOFT}`, color: CHARCOAL_SOFT }}>
        © {new Date().getFullYear()} وتر الإحساس
      </footer>
    </div>
  );
}

function WingDrawer({ wingKey, onClose }: { wingKey: WingKey; onClose: () => void }) {
  const w = WINGS[wingKey];
  const Icon = w.icon;
  const [vendorStore] = useVendorStore();

  const { data, isLoading } = useQuery({
    queryKey: ["wing-vendors", wingKey],
    queryFn: async (): Promise<Vendor[]> => {
      const { data } = await supabase.from("vendors").select("*").order("is_premium", { ascending: false });
      return (data ?? []) as Vendor[];
    },
  });

  const active = (data ?? []).filter((v) => {
    const status = v.subscription_status ?? "active";
    if (status === "hidden" || status === "suspended") return false;
    const local = vendorStore[v.id] ?? DEFAULT_VENDOR_STATE;
    return local.subscription_active && w.cats.includes(v.category);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-in fade-in"
      onClick={onClose}
      style={{ background: "rgba(26,26,26,0.35)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl animate-in slide-in-from-bottom"
        dir="rtl"
        style={{ background: "#FFFFFF", border: `1px solid ${GOLD_SOFT}`, color: CHARCOAL }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${GOLD_SOFT}`, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(6px)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl"
              style={{ background: "#FBF6EC", color: GOLD, border: `1px solid ${GOLD_SOFT}` }}
            >
              <Icon className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-black leading-tight" style={{ color: CHARCOAL }}>{w.title}</h2>
              <p className="text-[11px]" style={{ color: CHARCOAL_SOFT }}>{w.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-[#FBF6EC]">
            <X className="size-4" style={{ color: CHARCOAL }} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <Link
            to={w.toolPath}
            className="block rounded-2xl px-5 py-4 text-center text-sm font-black transition"
            style={{ background: GOLD, color: "#FFFFFF", boxShadow: "0 6px 18px -8px rgba(184,137,58,0.55)" }}
          >
            {w.toolLabel}
          </Link>

          <div>
            <h3 className="mb-3 text-xs font-black" style={{ color: CHARCOAL_SOFT }}>شركاء فاعلون في هذا الجناح</h3>
            {isLoading && <p className="text-center text-xs py-6" style={{ color: CHARCOAL_SOFT }}>…تحميل</p>}
            {!isLoading && active.length === 0 && (
              <div
                className="rounded-2xl p-8 text-center text-xs"
                style={{ border: `1px dashed ${GOLD_SOFT}`, color: CHARCOAL_SOFT }}
              >
                لا يوجد شركاء فاعلون بعد في هذا الجناح.
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {active.map((v) => (
                <div key={v.id} className="overflow-hidden rounded-2xl" style={{ background: "#FFFFFF", border: `1px solid ${GOLD_SOFT}` }}>
                  {v.cover_image && <img src={v.cover_image} alt={v.name} className="h-28 w-full object-cover" />}
                  <div className="flex items-center gap-3 p-3">
                    {v.logo_url && <img src={v.logo_url} alt="" className="size-10 rounded-xl object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-1 text-sm font-black" style={{ color: CHARCOAL }}>{v.name}</p>
                      {v.is_premium && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: GOLD }}>
                          <Crown className="size-3" /> Premium
                        </span>
                      )}
                    </div>
                    <a
                      href={`https://wa.me/${v.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl p-2"
                      style={{ background: "#FBF6EC", color: GOLD }}
                    >
                      <MessageCircle className="size-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link to="/marketplace" className="block text-center text-xs font-bold hover:underline" style={{ color: GOLD }}>
            عرض السوق الكامل ←
          </Link>
        </div>
      </div>
    </div>
  );
}
