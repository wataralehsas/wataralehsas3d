import { useState } from "react";
import { Info, X, Layers, Scissors, Shirt, Sparkles } from "lucide-react";

/**
 * فقاعة موحّدة تجمع كل شروحات المشروع في مكان واحد —
 * بدل توزيع الفقرات الشارحة في كل صفحة. تظهر كزر عائم وتفتح بطاقة موجزة.
 */
export function FeaturesBubble() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="مزايا وتر الإحساس"
        className="fixed left-4 z-30 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-primary to-primary-glow px-3.5 py-2 text-[11px] font-black text-primary-foreground shadow-2xl ring-2 ring-background transition hover:scale-105"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 10rem)" }}
        dir="rtl"
      >
        <Info className="size-3.5" /> مزايا المشروع
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setOpen(false)}
          dir="rtl"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 left-3 rounded-full p-1.5 hover:bg-muted"
              aria-label="إغلاق"
            >
              <X className="size-4" />
            </button>

            <div className="mb-1 inline-flex items-center gap-2 text-xs font-black text-primary">
              <Sparkles className="size-3.5" /> وتر الإحساس
            </div>
            <h2 className="text-lg font-black leading-tight">
              منصّة دمج واقعي بالذكاء الاصطناعي
            </h2>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              المشروع يعتمد على <b className="text-foreground">الدمج الواقعي بالذكاء الاصطناعي</b> —
              يأخذ صورتك الحقيقية (جدار غرفتك، وجهك، أو جسمك) ويُركّب التصميم فوقها
              بمنظور ومقاسات وإضاءة حقيقية مع قفل تام لملامحك ومحيطك.
            </p>

            <div className="mt-4 space-y-3 text-[12px] leading-relaxed">
              <Item icon={Layers} title="دمج الجدران والأرضيات والسقف">
                ارفع صورة المكان، اختر التصميم، حرّك التصميم وكبّره فوق الجدار الثابت
                لقياس المساحة بدقة، ثم اطلب الدمج الواقعي بـ AI ليُسقَط بمنظور حقيقي
                مع الظلال والإضاءة وميزة البروز الملموس (Embossed).
              </Item>
              <Item icon={Scissors} title="دمج قصّات الشعر على وجهك">
                ارفع صورتك الحقيقية، اختر القصّة واللون، ودع الذكاء يُعيد توليد منطقة
                الشعر فقط مع قفل صارم لملامح الوجه — قصّتك الجديدة قبل أيّ موعد.
              </Item>
              <Item icon={Shirt} title="دمج الأزياء على جسمك">
                صورة الزبون + قطعة من الكتالوج → الذكاء يُلبسه القطعة بثنيات قماش طبيعية
                وحفاظ كامل على الوجه والخلفية، ثم يحجز عبر واتساب المحل مباشرة.
              </Item>
            </div>

            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-[11px] leading-relaxed text-primary">
              <b>طباعة ليزرية احترافية:</b> بعد اختيار التصميم تُنفّذ الطباعة على الجدار
              أو الأرضية أو السقف بدقة 8K مع خيار البروز الملموس وحساب فوري للسعر
              والشحن حسب منطقتك.
            </div>

            <p className="mt-3 text-[10px] text-muted-foreground">
              استوديو التوليد التخيلي متوفّر كميزة إضافية داخل كل جناح لاستلهام أفكار جديدة.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function Item({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Layers;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <div className="mb-1 flex items-center gap-2 text-[12px] font-black text-foreground">
        <Icon className="size-3.5 text-primary" /> {title}
      </div>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
