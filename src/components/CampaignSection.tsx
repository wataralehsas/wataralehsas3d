import { useEffect, useState } from "react";
import { Zap, Droplets, Layers3, TrendingDown, Truck, Sparkles } from "lucide-react";
import { readSettings } from "@/lib/settings";

export function CampaignSection({ compact = false }: { compact?: boolean }) {
  const [show, setShow] = useState(true);
  const [showFleet, setShowFleet] = useState(false);
  useEffect(() => {
    const s = readSettings();
    setShow(!!s.showMarketingBanner);
    setShowFleet(!!s.fleetMobilizationEnabled);
  }, []);
  if (!show) return null;

  const features = [
    { i: Zap, t: "طباعة فائقة 8K", d: "بتقنية Epson i1600-U1 ثنائي الرأس UV LED — تفاصيل لا تُصدّق." },
    { i: Droplets, t: "حماية 100% مطلقة", d: "مقاومة كاملة للرطوبة والماء وعوامل الطقس مدى الحياة." },
    { i: Layers3, t: "ميزة البروز الملموس", d: "تأثير ثلاثي الأبعاد حقيقي تستشعره بأطراف أصابعك." },
    { i: TrendingDown, t: "خفض التكلفة 60%", d: "أوفر بكثير من ورق الجدران التقليدي والرخام الطبيعي." },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/60 p-5 sm:p-8" dir="rtl">
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{
        background:
          "radial-gradient(circle at 0% 0%, oklch(0.78 0.16 75 / 0.18) 0, transparent 50%), radial-gradient(circle at 100% 100%, oklch(0.7 0.14 55 / 0.15) 0, transparent 50%)",
      }} />
      <div className="relative">
        <div className="badge-gold">
          <Sparkles className="size-3.5" /> حملة إطلاق أبو وتر · قريباً جداً
        </div>
        <h2 className={`mt-4 font-black leading-tight bg-gradient-to-l from-primary via-primary-glow to-accent bg-clip-text text-transparent ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl"}`}>
          زلزال تكنولوجي واقتصادي يضرب أسواق الديكور والتجارة في سوريا.. قريباً جداً! 🌍🌟
        </h2>
        {!compact && (
          <p className="mt-3 max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            منصة واحدة تجمع طباعة الجدران الفاخرة، البروز ثلاثي الأبعاد، وغرفة تجربة الأزياء الافتراضية —
            بتقنيات لم تصل بعد إلى أسواقنا.
          </p>
        )}

        <div className={`mt-6 grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
          {features.map(({ i: Icon, t, d }) => (
            <div key={t} className="group relative overflow-hidden rounded-2xl border border-border bg-background/60 p-4 transition hover:border-primary/50 hover:shadow-soft">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
                <Icon className="size-5" />
              </div>
              <p className="mt-3 text-sm font-black text-foreground">{t}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{d}</p>
            </div>
          ))}
        </div>

        {showFleet && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent/5 p-4 sm:flex-row sm:items-center">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent">
              <Truck className="size-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-foreground">تعبئة أسطول لحظية للعقود الكبرى</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                للقصور، المولات، الفنادق والمشاريع التجارية الضخمة — فريق استجابة سريع
                <b className="text-accent"> بخمس طابعات هايبرد </b>
                جاهز للتعبئة الفورية في أي منطقة بسوريا.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
