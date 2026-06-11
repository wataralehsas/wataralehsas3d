// إعدادات المنصة الشاملة — تُحفظ محلياً ويمكن للأدمن تعديلها فوراً
// (تتجاوز أي قيم في pricing_config عندما تكون موجودة)
import { useEffect, useState } from "react";
import { DEFAULT_PACKAGES, type PaymentPackage } from "./payments";

export type CustomHaircut = {
  id: string;
  label: string;
  preview: string;
  gender: "m" | "f" | "u";
  prompt?: string;
};

export type DesignSection = "haircut" | "simulator" | "marketing" | "tryon";

export const SECTION_LABELS: Record<DesignSection, string> = {
  haircut: "قصّات الشعر",
  simulator: "محاكي الجدران/الأرضيات",
  marketing: "أداة التسويق",
  tryon: "تجربة الأزياء",
};

export type CustomDesign = {
  id: string;
  section: DesignSection;
  label: string;
  prompt: string;
  preview?: string;
  createdAt: number;
};

export type PlatformSettings = {
  currency: string;
  fuelPerKm: number;
  embossedRate: number;
  pricePerMeter: number;
  aiTryOnLogging: boolean;
  showMarketingBanner: boolean;
  fleetMobilizationEnabled: boolean;
  enableOfflineSync: boolean;

  // عملات ثانوية يفعّلها الأدمن مع سعر صرف مقابل الدولار
  enableTRY: boolean;
  tryRate: number; // 1 USD = N TRY
  enableSYP: boolean;
  sypRate: number; // 1 USD = N SYP

  quotaUnlimited: boolean;
  freeAttemptsDaily: number;
  adRewardEnabled: boolean;
  adBonusAttempts: number;
  adMaxDaily: number;
  adSeconds: number;

  // وضع تشغيل الذكاء الاصطناعي: false = خادم Replicate الحي / true = محاكاة مجانية على الجهاز
  aiSimulationOnly: boolean;


  // الاشتراكات المدفوعة عبر شام كاش
  paidEnabled: boolean;
  shamCashNumber: string;
  shamCashName: string;
  shamCashQR: string;
  shamCashNotes: string;
  paymentPackages: PaymentPackage[];

  // قصّات شعر مخصّصة يضيفها الأدمن
  // قصّات شعر مخصّصة يضيفها الأدمن
  customHaircuts: CustomHaircut[];

  // تصاميم مخصّصة (برومبتات جاهزة) لكل قسم AI — تُربط تلقائياً
  customDesigns: CustomDesign[];

  // ميديا الواجهة — صورة خلفية شفافة + شريط فيديوهات تعريفية
  customBgImage: string;        // data:URL أو رابط https — يُعرض كخلفية ثابتة للموقع
  customBgOpacity: number;      // 0 - 1
  customVideos: { id: string; url: string; title?: string }[]; // أشرطة فيديو على الواجهة
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  currency: "$",
  fuelPerKm: 0.3,
  embossedRate: 0.3,
  pricePerMeter: 25,
  aiTryOnLogging: true,
  showMarketingBanner: true,
  fleetMobilizationEnabled: true,
  enableOfflineSync: true,

  enableTRY: false,
  tryRate: 32.5,
  enableSYP: false,
  sypRate: 14500,

  quotaUnlimited: false,
  freeAttemptsDaily: 3,
  adRewardEnabled: true,
  adBonusAttempts: 1,
  adMaxDaily: 5,
  adSeconds: 15,
  aiSimulationOnly: true,


  paidEnabled: false,
  shamCashNumber: "",
  shamCashName: "",
  shamCashQR: "",
  shamCashNotes: "بعد التحويل، أرسل رقم العملية وكود الطلب عبر واتساب للتفعيل خلال دقائق.",
  paymentPackages: DEFAULT_PACKAGES,

  customHaircuts: [],
  customDesigns: [],
  customBgImage: "",
  customBgOpacity: 0.18,
  customVideos: [],
};

const KEY = "watar.platform.settings.v2";

export function readSettings(): PlatformSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return DEFAULT_SETTINGS; }
}

export function writeSettings(next: PlatformSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("watar:settings"));
}

export function useSettings(): [PlatformSettings, (s: PlatformSettings) => void] {
  const [s, setS] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    setS(readSettings());
    const h = () => setS(readSettings());
    window.addEventListener("watar:settings", h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener("watar:settings", h); window.removeEventListener("storage", h); };
  }, []);
  return [s, (n) => { writeSettings(n); setS(n); }];
}

// قائمة العملات المدعومة عبر واجهة الأدمن
export const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "$", label: "USD ($) — دولار أمريكي" },
  { value: "TRY", label: "TRY (₺) — ليرة تركية" },
  { value: "ل.س", label: "ل.س — ليرة سورية" },
  { value: "€", label: "EUR (€) — يورو" },
  { value: "SAR", label: "SAR — ريال سعودي" },
  { value: "AED", label: "AED — درهم إماراتي" },
];

// الأقاليم السورية المقترحة لتفعيل سريع
export const SYRIAN_PROVINCES = [
  "الدانا","سرمدا","إدلب","حلب","ريف حلب","دمشق","ريف دمشق",
  "حمص","حماة","طرطوس","اللاذقية","دير الزور","الرقة","الحسكة","درعا","السويداء","القنيطرة",
];
