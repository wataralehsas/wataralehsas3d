import { useState } from "react";
import { X, Copy, Send, CheckCircle2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { readSettings } from "@/lib/settings";
import { createPaymentRequest, getDeviceId, type PaymentPackage } from "@/lib/payments";

export function PaymentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = readSettings();
  const [selected, setSelected] = useState<PaymentPackage | null>(null);
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [txRef, setTxRef] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  if (!open) return null;

  function copy(v: string) {
    navigator.clipboard.writeText(v).then(() => toast.success("تم النسخ"));
  }

  function submit() {
    if (!selected) return;
    if (!userName.trim() || !phone.trim()) {
      toast.error("الاسم ورقم الهاتف مطلوبان");
      return;
    }
    const req = createPaymentRequest({
      packageId: selected.id,
      userName: userName.trim(),
      phone: phone.trim(),
      txRef: txRef.trim(),
    });
    setSubmitted(req.id);
    toast.success("تم إرسال الطلب — سيتم التفعيل خلال دقائق");
  }

  function sendWhatsApp() {
    if (!submitted || !selected) return;
    const text = `مرحباً وتر الإحساس 🌹
أودّ تفعيل اشتراك:
• الباقة: ${selected.label} — ${selected.attempts} محاولة
• السعر: ${selected.priceUSD}$ / ${selected.priceSYP.toLocaleString("ar")} ل.س
• كود الطلب: ${submitted}
• كود جهازي: ${getDeviceId()}
• رقم العملية: ${txRef || "—"}
• الاسم: ${userName}
• الهاتف: ${phone}`;
    window.open(`https://wa.me/${s.shamCashNumber.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/75 px-4 py-6 overflow-y-auto" dir="rtl" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg my-auto rounded-3xl border-2 border-primary/40 bg-card p-6 shadow-2xl">
        <button onClick={onClose} className="absolute left-3 top-3 rounded-full p-1.5 hover:bg-muted">
          <X className="size-5" />
        </button>

        <div className="mx-auto grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-glow">
          <Wallet className="size-7 text-primary-foreground" />
        </div>
        <h3 className="mt-3 text-center text-xl font-black">اشتراك عبر شام كاش</h3>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          ادفع مرّة واحدة واحصل على محاولات إضافية تبقى محفوظة على جهازك
        </p>

        {submitted ? (
          <div className="mt-5 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center">
            <CheckCircle2 className="mx-auto size-12 text-primary" />
            <p className="mt-3 text-sm font-black">تم استلام طلبك</p>
            <p className="mt-2 text-xs text-muted-foreground">كود الطلب</p>
            <p className="mt-1 text-2xl font-black tracking-widest text-primary">{submitted}</p>
            <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
              أرسل الكود + رقم العملية للأدمن عبر واتساب لتسريع التفعيل.
              ستفتح المحاولات تلقائياً بمجرد الموافقة.
            </p>
            <button onClick={sendWhatsApp}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white">
              <Send className="size-4" /> إرسال الكود عبر واتساب
            </button>
            <button onClick={onClose}
              className="mt-2 w-full rounded-2xl bg-muted px-4 py-2.5 text-sm font-bold">إغلاق</button>
          </div>
        ) : !selected ? (
          <div className="mt-5 space-y-3">
            <p className="text-xs font-black text-primary">اختر الباقة المناسبة</p>
            {s.paymentPackages.map((p) => (
              <button key={p.id} onClick={() => setSelected(p)}
                className="w-full rounded-2xl border-2 border-border bg-background p-4 text-right transition hover:border-primary">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{p.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.attempts} محاولة توليد AI</p>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-black text-primary">{p.priceUSD}$</p>
                    <p className="text-[10px] text-muted-foreground">{p.priceSYP.toLocaleString("ar")} ل.س</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-primary/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">الباقة المختارة</p>
              <p className="text-sm font-black text-primary">{selected.label} — {selected.attempts} محاولة بـ {selected.priceUSD}$</p>
              <button onClick={() => setSelected(null)} className="mt-1 text-[11px] text-primary underline">تغيير</button>
            </div>

            {s.shamCashQR && (
              <div className="rounded-2xl border border-border bg-white p-3 text-center">
                <p className="mb-2 text-[11px] font-bold text-muted-foreground">امسح رمز QR من تطبيق شام كاش</p>
                <img src={s.shamCashQR} alt="QR شام كاش" className="mx-auto h-48 w-48 rounded-xl object-contain" />
              </div>
            )}

            {s.shamCashNumber && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">رقم شام كاش</p>
                  <p className="truncate text-sm font-black">{s.shamCashNumber}</p>
                  {s.shamCashName && <p className="text-[10px] text-muted-foreground">{s.shamCashName}</p>}
                </div>
                <button onClick={() => copy(s.shamCashNumber)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground inline-flex items-center gap-1">
                  <Copy className="size-3.5" /> نسخ
                </button>
              </div>
            )}

            {s.shamCashNotes && (
              <p className="rounded-xl bg-accent/10 px-3 py-2 text-[11px] leading-relaxed text-accent">{s.shamCashNotes}</p>
            )}

            <div className="space-y-2">
              <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="الاسم الكامل"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم هاتفك (للتواصل)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <input value={txRef} onChange={(e) => setTxRef(e.target.value)} placeholder="رقم عملية شام كاش (اختياري)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            </div>

            <button onClick={submit}
              className="w-full rounded-2xl bg-gradient-to-l from-primary to-primary-glow px-4 py-3 text-sm font-black text-primary-foreground shadow-soft">
              تأكيد الطلب وإرسال للأدمن
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
