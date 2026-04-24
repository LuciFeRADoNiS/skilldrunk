import { createAnonClient, type Quote } from "@/lib/supabase";
import { QuoteStage } from "./quote-stage";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function Home() {
  const supabase = createAnonClient();
  const { data } = await supabase.rpc("qt_daily_quote");
  const initialQuote = (data as Quote | null) ?? {
    id: "fallback",
    quote_text: "Sessizlik bazen en gür sestir.",
    author: "—",
    category: null,
    nano_detail: null,
  };

  return <QuoteStage initialQuote={initialQuote} />;
}
