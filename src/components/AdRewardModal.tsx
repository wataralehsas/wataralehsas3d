import { useEffect, useState } from "react";
import { X, PlayCircle, Gift, Sparkles } from "lucide-react";
import { grantAdBonus } from "@/lib/quota";
import { readSettings } from "@/lib/settings";
import { toast } from "sonner";

export function AdRewardModal({ open, onClose, onRewarded }: {
  open: boolean;
  onClose: () => void;
  onRewarded?: () => void;
}) {
  const seconds = readSettings().adSeconds;
  const [left, setLeft] = useState(seconds);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLeft(seconds);
    setDone(false);
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) { clearInterval(t); setDone(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open, seconds]);

  if (!open) return null;

  function claim() {
    if (!done) return;
    const ok = grantAdBonus();
    if (ok) {
      toast.success("تمت إضافة محاولة جديدة 🌹");
      onRewarded?.();
      onClose();
    } else {
      toast.error("بلغت الحد الأقصى لمشاهدات اليوم");
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/80 px-4" dir="rtl" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-primary/40 bg-card shadow-2xl">
        <button onClick={onClose} className="absolute left-3 top-3 z-10 rounded-full bg-background/80 p-1.5 hover:bg-muted">
          <X className="size-4" />
        </button>

        {/* الإعلان (Placeholder قابل للربط لاحقاً بـ AdMob/Google Ad Manager) */}
        <div className="relative grid h-56 place-items-center"
          style={{ background: "var(--gradient-hero)" }}>
          <div className="text-center text-primary-foreground">
            <PlayCircle className="mx-auto size-14 animate-pulse" />
            <p className="mt-2 text-sm font-black opacity-90">إعلان قصير من شركائنا</p>
            <p className="mt-1 text-[11px] opacity-70">شكراً لدعمك المنصة 🌹</p>
          </div>
          <div className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-black text-white">
            AD
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2">
            <Gift className="size-5 text-primary" />
            <h3 className="text-base font-black">استعادة محاولة مجانية</h3>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            شاهد الإعلان حتى النهاية ثم اضغط على «احصل على المحاولة».
          </p>

          <button onClick={claim} disabled={!done}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-primary to-primary-glow px-4 py-3 text-sm font-black text-primary-foreground shadow-soft disabled:opacity-50">
            {done ? (<><Sparkles className="size-4" /> احصل على المحاولة</>) : (<>انتظر {left}s…</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
