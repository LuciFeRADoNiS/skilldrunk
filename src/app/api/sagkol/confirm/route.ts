import { NextRequest, NextResponse } from "next/server";
import type { SagkolUser } from "@sagkol/core";
import { createClient } from "@/lib/supabase/server";
import { getProposal, resolveProposal, recordProposalResult } from "@/lib/sagkol/store";
import { canConfirm } from "@/lib/sagkol/permissions";
import { applyTodusProposal } from "@/lib/sagkol/apply-proposal";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXPIRE_MS = 10 * 60 * 1000; // 10 dk

async function resolveUser(): Promise<SagkolUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role, username, display_name")
    .eq("id", user.id)
    .single();
  return {
    key: user.id,
    name: profile?.display_name ?? profile?.username ?? "Özgür",
    role: profile?.role ?? "user",
  };
}

/**
 * Onay/ret — UI click'ine GÜVENİLMEZ: kimlik, yetki ve 10dk tazelik burada yeniden doğrulanır.
 * Uygulama SONUCU döner; client bunu clientToolResults olarak /chat'e geri verir (loop resume).
 */
export async function POST(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

  const { proposalId, decision } = (await req.json()) as {
    proposalId?: string;
    decision?: "confirm" | "reject";
  };
  if (!proposalId || !decision) return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });

  const proposal = await getProposal(proposalId);
  if (!proposal) return NextResponse.json({ error: "Öneri bulunamadı" }, { status: 404 });
  if (proposal.status !== "pending") {
    return NextResponse.json({
      toolResult: { approved: false, status: proposal.status, reason: "Öneri zaten sonuçlanmış." },
    });
  }

  if (Date.now() - new Date(proposal.created_at).getTime() > EXPIRE_MS) {
    await resolveProposal(proposalId, "expired", user.key);
    return NextResponse.json({
      toolResult: {
        approved: false,
        status: "expired",
        reason: "Öneri zaman aşımına uğradı (10 dk). Güncel veriyle yeniden öner.",
      },
    });
  }

  if (decision === "reject") {
    await resolveProposal(proposalId, "rejected", user.key);
    return NextResponse.json({
      toolResult: { approved: false, status: "rejected", reason: `${user.name} öneriyi reddetti.` },
    });
  }

  const perm = canConfirm(user, proposal);
  if (!perm.ok) {
    return NextResponse.json(
      { toolResult: { approved: false, status: "pending", reason: perm.reason } },
      { status: 403 },
    );
  }

  // İdempotent: pending→confirmed yalnız bir kez (çift onay tek uygulanır)
  const won = await resolveProposal(proposalId, "confirmed", user.key);
  if (!won) {
    return NextResponse.json({
      toolResult: { approved: false, status: "resolved", reason: "Öneri başka bir istek tarafından sonuçlandırıldı." },
    });
  }

  const { applied, errors } = await applyTodusProposal(proposal.operations);
  const finalStatus = errors.length === 0 ? "confirmed" : applied.length === 0 ? "failed" : "partial";
  await recordProposalResult(proposalId, finalStatus, { applied, errors });

  return NextResponse.json({
    toolResult: {
      approved: errors.length === 0,
      status: finalStatus,
      confirmedBy: user.name,
      applied,
      ...(errors.length > 0 ? { errors } : {}),
    },
  });
}
