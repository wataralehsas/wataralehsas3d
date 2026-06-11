import { useSettings } from "@/lib/settings";

/**
 * خلفية ثابتة شفافة تملأ كامل الموقع — يرفعها الأدمن من لوحة الإعدادات.
 * تظهر خلف كل الواجهات بدون التأثير على التفاعل.
 */
export function SiteBackground() {
  const [s] = useSettings();
  if (!s.customBgImage) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-center bg-no-repeat bg-cover"
      style={{
        backgroundImage: `url(${s.customBgImage})`,
        opacity: s.customBgOpacity ?? 0.18,
      }}
    />
  );
}
