import { createClient } from "@supabase/supabase-js";

// مشروع Supabase القديم — المفتاح publishable وآمن للعرض في الواجهة
const SUPABASE_URL = "https://igloimjmnflsghqhumvz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_RWZhaXRJE5gAvZhYU2G_Bw_GHha2Owk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export type Design = {
  id: string;
  title: string;
  image_url: string;
  type: string | null;
  price: number | null;
  created_at: string;
};
