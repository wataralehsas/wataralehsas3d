import { useEffect, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { isAdmin, tryLogin } from "@/lib/admin-gate";

export function AdminGate({ children, title = "منطقة محمية" }: { children: ReactNode; title?: string }) {
  const [mounted, setMounted] = useState(false);
  const [ok, setOk] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => { setMounted(true); setOk(isAdmin()); }, []);

  if (!mounted) return null;
  if (ok) return <>{children}</>;


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (tryLogin(pw)) setOk(true);
          else { setErr(true); setPw(""); }
        }}
        className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-card border border-border"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="size-6" />
        </div>
        <h1 className="mt-4 text-center text-xl font-black text-foreground">{title}</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          هذه الأداة مخصصة لمسؤولي التسويق فقط.
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(false); }}
          placeholder="كلمة السر"
          className="mt-5 w-full rounded-xl bg-muted px-4 py-3 text-center text-sm outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        {err && (
          <p className="mt-2 text-center text-xs text-destructive">كلمة السر غير صحيحة</p>
        )}
        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft hover:opacity-90"
        >
          دخول
        </button>
      </form>
    </div>
  );
}
