import { useState } from "react";
import { X, Crown, PlayCircle, Wallet } from "lucide-react";
import { QUOTA_EXCEEDED_MSG, canWatchAd } from "@/lib/quota";
import { readSettings } from "@/lib/settings";
import { AdRewardModal } from "./AdRewardModal";
import { PaymentModal } from "./PaymentModal";

export function QuotaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [adOpen, setAdOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  if (!open) return null;
  const adAvailable = canWatchAd();
  const paidAvailable = readSettings().paidEnabled;
  return (
    <>
      <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 px-4" dir="rtl" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-3xl border-2 border-primary/40 bg-card p-6 shadow-2xl">
          <button onClick={onClose} className="absolute left-3 top-3 rounded-full p-1.5 hover:bg-muted">
            <X className="size-5" />
          </button>
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-glow">
            <Crown className="size-8 text-primary-foreground" />
          </div>
          <h3 className="mt-4 text-center text-xl font-black">انتهت محاولاتك المجانية</h3>
          <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">{QUOTA_EXCEEDED_MSG}</p>

          {paidAvailable && (
            <button onClick={() => setPayOpen(true)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-primary to-primary-glow px-4 py-3 text-sm font-black text-primary-foreground shadow-soft">
              <Wallet className="size-5" /> اشترك عبر شام كاش — محاولات إضافية
            </button>
          )}
          {adAvailable && (
            <button onClick={() => setAdOpen(true)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary px-4 py-3 text-sm font-black text-primary">
              <PlayCircle className="size-5" /> شاهد إعلاناً لاستعادة محاولة
            </button>
          )}
          <button onClick={onClose}
            className="mt-3 w-full rounded-2xl bg-muted px-4 py-3 text-sm font-black">
            حسناً
          </button>
        </div>
      </div>
      <AdRewardModal open={adOpen} onClose={() => setAdOpen(false)} onRewarded={onClose} />
      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} />
    </>
  );
}
