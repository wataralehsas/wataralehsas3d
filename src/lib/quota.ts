// عدّاد محلي يحد المستخدم المجاني بمحاولات AI يومياً
// — الأدمن: غير محدود تلقائياً
// — يمكن للأدمن من اللوحة جعل الزوار غير محدودين
// — يدعم استعادة محاولة بعد مشاهدة إعلان
import { useEffect, useState } from "react";
import { readSettings } from "./settings";
import { isAdmin } from "./admin-gate";
import { paidAttemptsForDevice, consumePaidAttempt } from "./payments";

const KEY = "watar.ai.quota.v1";
const AD_KEY = "watar.ai.quota.ads.v1";
export const DAILY_LIMIT = 3; // متبقي للتوافق العكسي فقط

type Q = { day: string; count: number };
type A = { day: string; ads: number };

function today() { return new Date().toISOString().slice(0, 10); }

export function readQuota(): Q {
  if (typeof window === "undefined") return { day: today(), count: 0 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { day: today(), count: 0 };
    const q = JSON.parse(raw) as Q;
    if (q.day !== today()) return { day: today(), count: 0 };
    return q;
  } catch { return { day: today(), count: 0 }; }
}

function readAds(): A {
  if (typeof window === "undefined") return { day: today(), ads: 0 };
  try {
    const raw = window.localStorage.getItem(AD_KEY);
    if (!raw) return { day: today(), ads: 0 };
    const a = JSON.parse(raw) as A;
    if (a.day !== today()) return { day: today(), ads: 0 };
    return a;
  } catch { return { day: today(), ads: 0 }; }
}

function effectiveLimit(): number {
  const s = readSettings();
  if (isAdmin() || s.quotaUnlimited) return Infinity;
  const base = Math.max(0, s.freeAttemptsDaily);
  const bonus = s.adRewardEnabled ? readAds().ads * Math.max(1, s.adBonusAttempts) : 0;
  return base + bonus;
}

export function remainingQuota(): number {
  const limit = effectiveLimit();
  const paid = paidAttemptsForDevice();
  if (!isFinite(limit)) return Number.POSITIVE_INFINITY;
  return Math.max(0, limit - readQuota().count) + paid;
}

export function isUnlimited(): boolean {
  return !isFinite(effectiveLimit());
}

export function canWatchAd(): boolean {
  const s = readSettings();
  if (isAdmin() || s.quotaUnlimited) return false;
  if (!s.adRewardEnabled) return false;
  return readAds().ads < Math.max(0, s.adMaxDaily);
}

export function grantAdBonus(): boolean {
  if (!canWatchAd()) return false;
  const a = readAds();
  const next: A = { day: today(), ads: a.ads + 1 };
  window.localStorage.setItem(AD_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("watar:quota"));
  return true;
}

export function consumeQuota(): boolean {
  if (isUnlimited()) return true;
  const limit = effectiveLimit();
  const q = readQuota();
  // إن نفد المجاني، اسحب من الرصيد المدفوع
  if (q.count >= limit) {
    return consumePaidAttempt();
  }
  const next = { day: today(), count: q.count + 1 };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("watar:quota"));
  return true;
}

export function useQuota() {
  const [n, setN] = useState<number>(DAILY_LIMIT);
  useEffect(() => {
    const refresh = () => setN(remainingQuota());
    refresh();
    window.addEventListener("watar:quota", refresh);
    window.addEventListener("watar:settings", refresh);
    window.addEventListener("watar:payments", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("watar:quota", refresh);
      window.removeEventListener("watar:settings", refresh);
      window.removeEventListener("watar:payments", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return n;
}

export const QUOTA_EXCEEDED_MSG =
  "لقد استهلكت محاولاتك المجانية اليومية. شاهد إعلاناً قصيراً لاستعادة محاولة، أو زر أحد صالوناتنا الشريكة لتجربة بلا حدود!";
