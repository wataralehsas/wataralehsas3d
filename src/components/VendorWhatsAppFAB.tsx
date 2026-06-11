import { MessageCircle } from "lucide-react";

// زر عائم أنيق للتواصل المباشر مع التاجر — يفتح واتساب برسالة عربية جاهزة
export function VendorWhatsAppFAB({
  phone, vendorName, productTitle,
}: { phone?: string | null; vendorName?: string | null; productTitle?: string | null }) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  const msg = `مرحباً ${vendorName ?? ""}، لقد قمت بمعاينة منتجكم ${productTitle ?? ""} عبر منصة وتر الإحساس وأود استكمال الحجز والتنفيذ معكم.`;
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  return (
    <a
      href={url} target="_blank" rel="noreferrer"
      aria-label="تواصل مباشر مع التاجر"
      className="fixed left-4 z-30 inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-green-600 to-green-500 px-4 py-2.5 text-xs font-black text-white shadow-2xl ring-2 ring-green-500/20 transition hover:scale-105 active:scale-95"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 6.75rem)" }}
      dir="rtl"
    >
      <MessageCircle className="size-5" />
      تواصل مع {vendorName ?? "التاجر"}
    </a>
  );
}
