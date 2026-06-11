// تصدير لقطة كاملة لإعدادات المنصة (للنسخ الاحتياطي والتدقيق)
import { supabase } from "@/integrations/supabase/client";

export async function exportPlatformSnapshot() {
  const [regions, pricing, designs, vendors, fashion, orders] = await Promise.all([
    supabase.from("regions").select("*"),
    supabase.from("pricing_config").select("*"),
    supabase.from("products").select("*"),
    supabase.from("vendors").select("*"),
    supabase.from("fashion_items").select("*"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500),
  ]);

  const snapshot = {
    exported_at: new Date().toISOString(),
    platform: "watar-decor-future",
    version: "2.0",
    regions: regions.data ?? [],
    pricing_config: pricing.data ?? [],
    designs: designs.data ?? [],
    vendors: vendors.data ?? [],
    fashion_items: fashion.data ?? [],
    recent_orders: orders.data ?? [],
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `watar-snapshot-${Date.now()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
