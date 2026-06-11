// إعدادات تشغيلية لكل شريك — وحدات + حالة اشتراك + رمز دخول
// تُحفظ محلياً (override) وتُزامن من/إلى Supabase عبر الأعمدة الجديدة
import { useEffect, useState } from "react";

export type VendorModules = {
  decor: boolean;
  fashion: boolean;
  haircut: boolean;
};

export type VendorStatus = "active" | "suspended" | "idle" | "hidden";

export const STATUS_LABELS: Record<VendorStatus, string> = {
  active: "نشط (ظاهر)",
  idle: "خامل (ظاهر بتدرّج رمادي)",
  suspended: "موقوف (مخفي + سبب)",
  hidden: "مخفي تماماً",
};

export const STATUS_COLORS: Record<VendorStatus, string> = {
  active: "text-success",
  idle: "text-muted-foreground",
  suspended: "text-destructive",
  hidden: "text-muted-foreground",
};

export type VendorState = {
  modules: VendorModules;
  subscription_active: boolean; // للتوافق العكسي
  status?: VendorStatus;
  brand_badge?: string;
  login_token?: string;
};

export const DEFAULT_VENDOR_STATE: VendorState = {
  modules: { decor: true, fashion: false, haircut: false },
  subscription_active: true,
  status: "active",
};

const KEY = "watar.vendor.config.v2";

type Store = Record<string, VendorState>;

export function readVendorStore(): Store {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function writeVendorStore(s: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("watar:vendor-config"));
}

export function getVendorState(id: string): VendorState {
  const s = readVendorStore();
  return s[id] ?? DEFAULT_VENDOR_STATE;
}

export function setVendorState(id: string, next: VendorState) {
  const s = readVendorStore();
  // اشتقاق subscription_active من status لضمان التوافق
  const status = next.status ?? (next.subscription_active ? "active" : "suspended");
  s[id] = { ...next, status, subscription_active: status === "active" || status === "idle" };
  writeVendorStore(s);
}

export function generateLoginToken(): string {
  const a = Math.random().toString(36).slice(2, 8).toUpperCase();
  const b = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WTR-${a}-${b}`;
}

export function useVendorStore(): [Store, (id: string, next: VendorState) => void] {
  const [s, setS] = useState<Store>({});
  useEffect(() => {
    setS(readVendorStore());
    const h = () => setS(readVendorStore());
    window.addEventListener("watar:vendor-config", h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener("watar:vendor-config", h); window.removeEventListener("storage", h); };
  }, []);
  return [s, (id, next) => { setVendorState(id, next); setS(readVendorStore()); }];
}

// مفتاح جلسة الشريك المسجّل دخوله
const SESSION_KEY = "watar.vendor.session";

export function setVendorSession(vendorId: string, token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ vendorId, token }));
}

export function readVendorSession(): { vendorId: string; token: string } | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

export function clearVendorSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
