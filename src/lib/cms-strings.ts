// CMS Zero-Code: تحرير كل النصوص دون لمس الكود
import { useEffect, useState } from "react";

const KEY = "watar.cms.strings.v1";

// السجل الافتراضي — مفاتيح مع نصوص أصلية (Arabic)
export const DEFAULT_STRINGS: Record<string, string> = {
  "brand.name": "وتر الإحساس",
  "brand.tagline": "مستقبل الديكور والذكاء الاصطناعي",

  "home.badge": "وتر الإحساس · النسخة الاحترافية",
  "home.title_1": "مستقبل الديكور الرقمي",
  "home.title_2": "والتجارة الذكية في الشمال",
  "home.subtitle": "طباعة جدارية وأرضيات بدقة 8K، تأثيرات بروز 3D، وغرفة تجربة AI افتراضية للأزياء وقصات الشعر.",
  "home.cta_primary": "ابدأ التجربة التفاعلية الآن",
  "home.cta_admin": "لوحة التحكم",

  "workflow.title": "اختر تجربتك",
  "workflow.subtitle": "أربع وحدات احترافية — كلٌ منها تعمل بشكل مستقل.",

  "module.simulator.title": "محاكي الجدران والأرضيات",
  "module.simulator.desc": "ارفع صورة الغرفة وجرّب طبقات الخط العربي، الرخام والإيبوكسي.",
  "module.marketplace.title": "سوق شركاء الديكور والأزياء",
  "module.marketplace.desc": "محلات معتمدة مع تواصل واتساب مباشر.",
  "module.tryon.title": "غرفة تجربة الأزياء AI",
  "module.tryon.desc": "ارفع صورتك واختر قطعة من بوتيك الشريك.",
  "module.haircut.title": "تجربة قصات الشعر بالذكاء الاصطناعي",
  "module.haircut.desc": "ارفع صورة وجهك واختر قصّة/لون شعر بشكل افتراضي قبل الزيارة.",

  "marketplace.title_1": "سوق",
  "marketplace.title_2": "شركاء الديكور والأزياء",
  "marketplace.tab_decor": "عالم الديكور والأثاث",
  "marketplace.tab_fashion": "عالم الأزياء والموضة",
  "marketplace.empty": "لا يوجد شركاء في هذا العالم بعد",

  "haircut.title_1": "تجربة قصات الشعر",
  "haircut.title_2": "بالذكاء الاصطناعي",
  "haircut.upload_hint": "ارفع صورة وجه واضحة",
  "haircut.run": "محاكاة القصّة فوراً",
  "haircut.color": "لون الشعر",

  "wa.cta": "تواصل واتساب",
};

export function readStrings(): Record<string, string> {
  if (typeof window === "undefined") return DEFAULT_STRINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STRINGS;
    return { ...DEFAULT_STRINGS, ...JSON.parse(raw) };
  } catch { return DEFAULT_STRINGS; }
}

export function writeStrings(next: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("watar:cms"));
}

export function useCmsStrings(): [Record<string, string>, (n: Record<string, string>) => void] {
  const [s, setS] = useState<Record<string, string>>(DEFAULT_STRINGS);
  useEffect(() => {
    setS(readStrings());
    const h = () => setS(readStrings());
    window.addEventListener("watar:cms", h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener("watar:cms", h); window.removeEventListener("storage", h); };
  }, []);
  return [s, (n) => { writeStrings(n); setS(n); }];
}

export function useStr(key: string, fallback?: string): string {
  const [s] = useCmsStrings();
  return s[key] ?? fallback ?? DEFAULT_STRINGS[key] ?? key;
}
