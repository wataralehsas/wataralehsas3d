import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readSettings } from "@/lib/settings";

export type Region = {
  id: string;
  name: string;
  whatsapp_number: string;
  assistant_name: string | null;
  is_active: boolean;
  distance_km?: number | null;
};

export type Pricing = {
  id: string | number;
  price_per_meter: number;
  embossed_premium_rate: number;
  currency: string;
  _rowId?: string | number | null;
};

export type Order = {
  id: string;
  region_id: string | null;
  region_name: string | null;
  design_id: string | null;
  design_name: string | null;
  design_url: string | null;
  width: number;
  height: number;
  embossed: boolean;
  total: number;
  customer_phone: string | null;
  status: string;
  created_at: string;
};

export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: async (): Promise<Region[]> => {
      const { data, error } = await supabase
        .from("regions")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Region[];
    },
  });
}

// نجلب أول صف من pricing_config بلا افتراض نوع id، وندمج الإعدادات المحلية
// لتجاوز أي أعمدة مفقودة (مثل currency) في schema cache.
export function usePricing() {
  return useQuery({
    queryKey: ["pricing"],
    queryFn: async (): Promise<Pricing> => {
      const local = readSettings();
      const { data } = await supabase
        .from("pricing_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      const row = (data ?? null) as Record<string, unknown> | null;
      return {
        _rowId: (row?.id as string | number | undefined) ?? null,
        id: (row?.id as string | number | undefined) ?? "default",
        price_per_meter: Number(row?.price_per_meter ?? local.pricePerMeter),
        embossed_premium_rate: Number(row?.embossed_premium_rate ?? local.embossedRate),
        currency: (row?.currency as string | undefined) ?? local.currency,
      };
    },
  });
}

export function calcTotal(width: number, height: number, embossed: boolean, p: Pricing) {
  const base = Math.max(0, width) * Math.max(0, height) * Number(p.price_per_meter);
  return embossed ? base * (1 + Number(p.embossed_premium_rate)) : base;
}

export function buildWhatsAppUrl(opts: {
  number: string;
  region: string;
  width: number;
  height: number;
  embossed: boolean;
  designName: string;
  designUrl: string;
  total: number;
  currency: string;
}) {
  const txt = `مرحباً فريق طابعات الجدران الرقمية - فرع ${opts.region}.
لقد قمت بمعاينة المحاكي وأرغب بحجز موعد.
المدينة/المنطقة: ${opts.region}
المقاسات: ${opts.width}م × ${opts.height}م | ميزة البروز: ${opts.embossed ? "نعم" : "لا"}
التصميم: ${opts.designName}
رابط التصميم: ${opts.designUrl}
التكلفة المقدرة: ${opts.total.toLocaleString("ar")} ${opts.currency}`;
  return `https://wa.me/${opts.number}?text=${encodeURIComponent(txt)}`;
}
