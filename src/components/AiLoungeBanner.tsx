import { useEffect, useState } from "react";
import { Sparkles, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// شريط إعلانات فاخر يدور أثناء انتظار توليد AI — يحوّل وقت الانتظار إلى فرصة تسويقية
type Ad = { id: string; title: string; subtitle?: string | null };

const MASTER_ADS: Ad[] = [
  { id: "m1", title: "الوحش الميكانيكي يلتهم جميع الأسطح", subtitle: "مقاومة 100% للرطوبة والعفن" },
  { id: "m2", title: "طباعة جدارية 3D فائقة الدقة", subtitle: "ضمان 10 سنوات على الألوان" },
  { id: "m3", title: "تنفيذ خلال 48 ساعة", subtitle: "توصيل وتركيب لجميع المناطق" },
  { id: "m4", title: "وتر الإحساس — العلامة الأرقى", subtitle: "خصومات حصرية للأعضاء الجدد" },
];

export function AiLoungeBanner({ className = "" }: { className?: string }) {
  const [ads, setAds] = useState<Ad[]>(MASTER_ADS);
  const [i, setI] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.from("vendors").select("id,name").limit(8);
        if (!active || !data?.length) return;
        const merchant = data.map((v: { id: string; name: string }) => ({
          id: v.id,
          title: `إعلان من ${v.name}`,
          subtitle: "متجر معتمد على وتر الإحساس",
        }));
        setAds([...MASTER_ADS, ...merchant]);
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % ads.length), 2800);
    return () => clearInterval(t);
  }, [ads.length]);

  const ad = ads[i];
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-l from-primary/10 via-card to-accent/10 p-4 ${className}`} dir="rtl">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.25),transparent_60%)]" />
      <div className="relative flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Megaphone className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary/80">
            <Sparkles className="size-3" /> ستوديو الانتظار
          </p>
          <p key={ad.id} className="mt-0.5 truncate text-sm font-black text-foreground animate-in fade-in slide-in-from-right-2 duration-500">
            {ad.title}
          </p>
          {ad.subtitle && (
            <p className="truncate text-[11px] text-muted-foreground">{ad.subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
