import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowRight, LogOut, MapPin, Phone, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRegions, type Order } from "@/lib/platform";

export const Route = createFileRoute("/assistant")({
  head: () => ({ meta: [{ title: "لوحة المساعد الجغرافي — وتر الإحساس" }] }),
  component: AssistantPage,
});

const STATUSES = [
  { value: "new", label: "جديد" },
  { value: "inspected", label: "تم المعاينة" },
  { value: "active", label: "قيد التنفيذ" },
  { value: "finished", label: "منتهي" },
  { value: "cancelled", label: "ملغى" },
];

const KEY = "watar-assistant-region";

function AssistantPage() {
  const { data: regions } = useRegions();
  const [regionName, setRegionName] = useState<string>("");
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) { setRegionName(saved); setAuthed(true); }
  }, []);

  function login() {
    if (!regionName) { toast.error("اختر منطقتك"); return; }
    const region = regions?.find(r => r.name === regionName);
    if (!region) { toast.error("منطقة غير معروفة"); return; }
    // PIN = آخر 4 أرقام من رقم واتساب الفرع
    const expected = region.whatsapp_number.slice(-4);
    if (pin !== expected) { toast.error("الرمز غير صحيح (آخر 4 أرقام من رقم واتساب فرعك)"); return; }
    localStorage.setItem(KEY, regionName);
    setAuthed(true);
  }

  function logout() {
    localStorage.removeItem(KEY);
    setAuthed(false); setRegionName(""); setPin("");
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-background p-5" dir="rtl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ArrowRight className="size-4" /> الرئيسية</Link>
        <div className="mx-auto mt-12 max-w-md rounded-3xl bg-card p-6 shadow-card border border-border space-y-4">
          <h1 className="text-xl font-black flex items-center gap-2"><MapPin className="size-5 text-primary" /> دخول المساعد الجغرافي</h1>
          <p className="text-xs text-muted-foreground">ترى فقط طلبات منطقتك. الرمز السري = آخر 4 أرقام من رقم واتساب فرعك.</p>
          <select value={regionName} onChange={(e) => setRegionName(e.target.value)}
            className="w-full rounded-xl bg-muted px-3 py-3 text-sm outline-none">
            <option value="">— اختر منطقتك —</option>
            {regions?.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="الرمز السري" inputMode="numeric"
              className="w-full rounded-xl bg-muted pr-9 px-3 py-3 text-sm outline-none" />
          </div>
          <button onClick={login} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft">دخول</button>
        </div>
      </div>
    );
  }

  return <AssistantBoard regionName={regionName} onLogout={logout} />;
}

function AssistantBoard({ regionName, onLogout }: { regionName: string; onLogout: () => void }) {
  const qc = useQueryClient();
  const { data: orders, refetch, isFetching } = useQuery({
    queryKey: ["assistant-orders", regionName],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("region_name", regionName).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as Order[];
    },
    refetchInterval: 15_000,
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحديث الحالة");
    qc.invalidateQueries({ queryKey: ["assistant-orders", regionName] });
  }

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s.value] = (orders ?? []).filter(o => o.status === s.value).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowRight className="size-4" /> الرئيسية</Link>
          <div className="text-sm font-black text-primary flex items-center gap-1"><MapPin className="size-4" /> {regionName}</div>
          <button onClick={onLogout} className="inline-flex items-center gap-1 text-xs text-destructive"><LogOut className="size-4" /> خروج</button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 pt-6 space-y-4">
        <div className="grid grid-cols-5 gap-2">
          {STATUSES.map(s => (
            <div key={s.value} className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className="text-xl font-black text-primary">{counts[s.value] ?? 0}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black">طلبات منطقتك ({orders?.length ?? 0})</h2>
          <button onClick={() => refetch()} className="text-xs inline-flex items-center gap-1 text-primary">
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} /> تحديث
          </button>
        </div>

        <div className="space-y-2">
          {orders?.map(o => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{o.design_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.width}م × {o.height}م {o.embossed ? "· بروز" : ""} · {Number(o.total).toLocaleString("ar")}
                  </p>
                  {o.customer_phone && (
                    <a href={`https://wa.me/${o.customer_phone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                      className="text-[11px] text-primary" dir="ltr">📱 {o.customer_phone}</a>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString("ar")}</p>
                </div>
                <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}
                  className="rounded-lg bg-muted px-2 py-2 text-xs font-bold">
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          ))}
          {(!orders || orders.length === 0) && (
            <p className="text-center text-sm text-muted-foreground py-12">لا توجد طلبات في منطقتك حالياً.</p>
          )}
        </div>

        <RegionVendorsPanel regionName={regionName} />
      </div>
    </div>
  );
}

function RegionVendorsPanel({ regionName }: { regionName: string }) {
  const { data: regions } = useRegions();
  const region = regions?.find(r => r.name === regionName);
  const { data: vendors, refetch } = useQuery({
    enabled: !!region,
    queryKey: ["assistant-vendors", region?.id],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").eq("region_id", region!.id).order("is_premium", { ascending: false });
      return (data ?? []) as Array<{ id: string; name: string; category: string; phone: string; is_premium: boolean }>;
    },
  });

  async function togglePremium(id: string, val: boolean) {
    const { error } = await supabase.from("vendors").update({ is_premium: val }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refetch();
  }

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-black">شركاء السوق في منطقتك ({vendors?.length ?? 0})</h2>
      <div className="space-y-2">
        {vendors?.map(v => (
          <div key={v.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{v.name}</p>
              <p className="text-[11px] text-muted-foreground" dir="ltr">{v.category} · {v.phone}</p>
            </div>
            <button onClick={() => togglePremium(v.id, !v.is_premium)}
              className={`rounded-lg px-2 py-1 text-[11px] font-bold ${v.is_premium ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {v.is_premium ? "مميّز ★" : "تفعيل مميّز"}
            </button>
          </div>
        ))}
        {(!vendors || vendors.length === 0) && (
          <p className="text-center text-xs text-muted-foreground py-4">لا شركاء مسجّلين في منطقتك بعد.</p>
        )}
      </div>
    </div>
  );
}

