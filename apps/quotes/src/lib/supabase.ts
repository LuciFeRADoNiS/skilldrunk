import { createClient } from "@supabase/supabase-js";

export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type Quote = {
  id: string;
  quote_text: string;
  author: string;
  category: string | null;
  nano_detail: string | null;
  for_date?: string;
};
