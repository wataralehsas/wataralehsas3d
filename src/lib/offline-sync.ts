import { openDB, type IDBPDatabase } from "idb";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PendingOrder = Record<string, unknown> & { _localId?: number };

const DB_NAME = "watar-offline";
const STORE = "pending_orders";

async function db(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: "_localId", autoIncrement: true });
      }
    },
  });
}

export async function queueOrder(order: PendingOrder) {
  const d = await db();
  await d.add(STORE, { ...order, queued_at: Date.now() });
}

export async function flushQueue(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  const d = await db();
  const all = (await d.getAll(STORE)) as PendingOrder[];
  let sent = 0;
  for (const row of all) {
    const { _localId, ...payload } = row;
    delete (payload as Record<string, unknown>).queued_at;
    const { error } = await supabase.from("orders").insert(payload);
    if (!error && _localId != null) {
      await d.delete(STORE, _localId);
      sent++;
    } else if (error) break;
  }
  return sent;
}

export async function insertOrderOrQueue(order: Record<string, unknown>) {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    const { error } = await supabase.from("orders").insert(order);
    if (!error) return { ok: true, queued: false };
  }
  await queueOrder(order);
  return { ok: true, queued: true };
}

export function useOnlineSync() {
  useEffect(() => {
    const sync = async () => {
      const n = await flushQueue();
      if (n > 0) toast.success(`تم إرسال ${n} طلب محفوظ محلياً`);
    };
    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, []);
}
