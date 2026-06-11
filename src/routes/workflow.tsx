import { createFileRoute, Link } from "@tanstack/react-router";
import { Cuboid, ShoppingBag, Shirt, Scissors, ArrowLeft, Wand2 } from "lucide-react";

export const Route = createFileRoute("/workflow")({
  head: () => ({ meta: [{ title: "اختر تجربتك — وتر الإحساس" }] }),
  component: Workflow,
});

const modules = [
  { to: "/simulator" as const, icon: <Cuboid className="size-7" />, title: "محاكي الجدران والأرضيات",
    desc: "ارفع صورة الغرفة وادمج التصميم بمنظور واقعي عبر الذكاء الاصطناعي.", badge: "ديكور" },
  { to: "/marketplace" as const, icon: <ShoppingBag className="size-7" />, title: "سوق شركاء الديكور والأزياء",
    desc: "ستائر، أرائك، أثاث وبوتيكات أزياء من شركاء معتمدين.", badge: "السوق" },
  { to: "/tryon" as const, icon: <Shirt className="size-7" />, title: "غرفة تجربة الأزياء AI",
    desc: "فصل جسم + لفّ قماش واقعي + قفل ملامح الوجه بالكامل.", badge: "أزياء" },
  { to: "/haircut" as const, icon: <Scissors className="size-7" />, title: "تجربة قصات الشعر AI",
    desc: "قفل هوية صارم — تعديل حدود الشعر فقط بدون لمس الوجه.", badge: "صالون" },
  { to: "/bulk-upload-studio" as const, icon: <Wand2 className="size-7" />, title: "الاستوديو الذكي للرفع الجماعي",
    desc: "حتى ١٠٠ صورة دفعة واحدة — ضغط WebP فوري وتصنيف تلقائي للفئة.", badge: "رفع جماعي" },
];

function Workflow() {
  return (
    <div className="min-h-screen bg-background px-5 py-10" dir="rtl">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← الرئيسية</Link>
        <h1 className="mt-4 text-3xl sm:text-4xl font-black text-foreground">
          اختر <span className="text-primary">تجربتك</span>
        </h1>
        <p className="mt-2 text-muted-foreground">أربع وحدات احترافية — كلٌ منها تعمل بشكل مستقل.</p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Link key={m.to} to={m.to}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-soft">
              <div className="absolute -top-12 -left-12 size-32 rounded-full opacity-30 blur-3xl transition group-hover:opacity-60"
                style={{ background: "var(--gradient-brand)" }} />
              <span className="absolute top-4 left-4 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black text-primary">
                {m.badge}
              </span>
              <div className="relative">
                <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-l from-primary to-primary-glow text-primary-foreground shadow-soft">
                  {m.icon}
                </div>
                <h3 className="mt-5 text-lg font-black text-foreground">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
                <div className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary">
                  ادخل <ArrowLeft className="size-4 transition group-hover:-translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
