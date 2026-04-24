import { trackHandler } from "@skilldrunk/analytics/track-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return trackHandler(req as unknown as import("next/server").NextRequest);
}
