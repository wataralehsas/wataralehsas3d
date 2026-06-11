// نظام الاشتراكات المدفوعة عبر شام كاش — يعمل محلياً
// • الزائر ينشئ طلباً بكود مختصر؛ الأدمن يوافق فيُضاف رصيد للجهاز
// • التواصل بين الأجهزة عبر WhatsApp (الزائر يرسل الكود للأدمن)
import { useEffect, useState } from "react";

export type PaymentPackage = {
  id: string;
  label: string;
  attempts: number;
  priceUSD: number;
  priceSYP: number;
};

export type PaymentRequest = {
  id: string;            // كود مختصر يراه الزائر
  deviceId: string;
  packageId: string;
  userName: string;
  phone: string;
  txRef: string;         // رقم عملية شام كاش (اختياري)
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  note?: string;
};

const REQ_KEY = "watar.payments.requests.v1";
const CREDIT_KEY = "watar.payments.credits.v1";
const DEVICE_KEY = "watar.payments.device.v1";

export const DEFAULT_PACKAGES: PaymentPackage[] = [
  { id: "p100", label: "باقة المبتدئ", attempts: 100, priceUSD: 5, priceSYP: 70000 },
  { id: "p250", label: "باقة المحترف", attempts: 250, priceUSD: 10, priceSYP: 140000 },
  { id: "p600", label: "باقة الاستوديو", attempts: 600, priceUSD: 20, priceSYP: 280000 },
];

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = "DV-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("watar:payments"));
}

export function readRequests(): PaymentRequest[] {
  return readJSON<PaymentRequest[]>(REQ_KEY, []);
}
export function writeRequests(rs: PaymentRequest[]) { writeJSON(REQ_KEY, rs); }

export function readCredits(): Record<string, number> {
  return readJSON<Record<string, number>>(CREDIT_KEY, {});
}
export function writeCredits(c: Record<string, number>) { writeJSON(CREDIT_KEY, c); }

export function paidAttemptsForDevice(deviceId = getDeviceId()): number {
  return Math.max(0, readCredits()[deviceId] ?? 0);
}

export function consumePaidAttempt(): boolean {
  const id = getDeviceId();
  const credits = readCredits();
  if ((credits[id] ?? 0) <= 0) return false;
  credits[id] = credits[id] - 1;
  writeCredits(credits);
  return true;
}

export function createPaymentRequest(input: Omit<PaymentRequest, "id" | "deviceId" | "status" | "createdAt">): PaymentRequest {
  const req: PaymentRequest = {
    id: "PR-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
    deviceId: getDeviceId(),
    status: "pending",
    createdAt: Date.now(),
    ...input,
  };
  writeRequests([req, ...readRequests()]);
  return req;
}

export function approveRequest(id: string, attempts: number): boolean {
  const rs = readRequests();
  const r = rs.find((x) => x.id === id);
  if (!r) return false;
  r.status = "approved";
  writeRequests(rs);
  const credits = readCredits();
  credits[r.deviceId] = (credits[r.deviceId] ?? 0) + attempts;
  writeCredits(credits);
  return true;
}

export function rejectRequest(id: string, note?: string): boolean {
  const rs = readRequests();
  const r = rs.find((x) => x.id === id);
  if (!r) return false;
  r.status = "rejected";
  if (note) r.note = note;
  writeRequests(rs);
  return true;
}

// منح يدوي بكود الجهاز مباشرة (للأدمن — حالات الدفع خارج النظام)
export function grantCreditsByDevice(deviceId: string, attempts: number) {
  const credits = readCredits();
  credits[deviceId] = (credits[deviceId] ?? 0) + attempts;
  writeCredits(credits);
}

export function usePaidAttempts(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const refresh = () => setN(paidAttemptsForDevice());
    refresh();
    window.addEventListener("watar:payments", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("watar:payments", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return n;
}

export function usePaymentRequests(): PaymentRequest[] {
  const [rs, setRs] = useState<PaymentRequest[]>([]);
  useEffect(() => {
    const refresh = () => setRs(readRequests());
    refresh();
    window.addEventListener("watar:payments", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("watar:payments", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return rs;
}
