/**
 * Telegram webhook for @SunoBot (Apollo bot). Receives:
 *   - callback_query events when admin clicks inline keyboard buttons
 *     (Approve / Reject after a task is submitted)
 *   - text messages (commands like /lead pending) — v1.1+
 *
 * Security: Telegram lets you set `secret_token` when binding the webhook;
 * Telegram then sends it back as the `x-telegram-bot-api-secret-token`
 * header. We verify that header matches APOLLO_WEBHOOK_SECRET.
 */
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-admin";
import { notifyTaskApproved, notifyTaskRejected } from "@/lib/task-notify";

type CallbackQuery = {
  id: string;
  from: { id: number; first_name?: string };
  message?: { chat: { id: number }; message_id: number };
  data?: string;
};

type Update = {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
    from?: { id: number };
  };
  callback_query?: CallbackQuery;
};

export async function POST(request: Request) {
  // Verify Telegram secret
  const expected = process.env.APOLLO_WEBHOOK_SECRET;
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: Update;
  try {
    update = (await request.json()) as Update;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (update.callback_query) {
    return handleCallback(update.callback_query);
  }

  // Ignore other updates for now (text commands → v1.1)
  return NextResponse.json({ ok: true, ignored: true });
}

async function handleCallback(cb: CallbackQuery) {
  const data = cb.data ?? "";
  const [action, idStr] = data.split(":");
  const taskId = Number(idStr);
  if (!Number.isInteger(taskId) || taskId <= 0 || !["approve", "reject"].includes(action)) {
    await answerCallback(cb.id, "Geçersiz buton.");
    return NextResponse.json({ ok: false });
  }

  // Verify the clicker is the configured admin (chat id match)
  const expectedChat = process.env.APOLLO_NOTIFY_CHAT_ID;
  if (cb.from && expectedChat && String(cb.from.id) !== String(expectedChat)) {
    await answerCallback(cb.id, "Yetkin yok.");
    return NextResponse.json({ ok: false });
  }

  const admin = createServiceRoleClient();
  const { data: task } = await admin
    .from("sd_lead_tasks")
    .select("id, status")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) {
    await answerCallback(cb.id, `Görev #${taskId} bulunamadı.`);
    return NextResponse.json({ ok: false });
  }

  if (action === "approve") {
    if (task.status !== "email_sent" && task.status !== "submitted") {
      await answerCallback(cb.id, `Bu görev şu an onaylanamaz (${task.status}).`);
      return NextResponse.json({ ok: false });
    }
    await admin
      .from("sd_lead_tasks")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", taskId);
    await admin.from("sd_lead_events").insert({
      task_id: taskId,
      event_type: "task_approved",
      meta: { via: "telegram", from_user_id: cb.from?.id ?? null },
    });
    await answerCallback(cb.id, "✓ Onaylandı");
    if (cb.message) await editReplyMarkup(cb.message.chat.id, cb.message.message_id);
    await notifyTaskApproved(taskId);
    return NextResponse.json({ ok: true });
  }

  // reject — no inline reason field on Telegram inline button; v1.1 will
  // open a force-reply prompt. For now, use a generic reason.
  await admin
    .from("sd_lead_tasks")
    .update({
      status: "rejected",
      rejection_reason: "Telegram'dan red — admin /admin/tasks/<id> sayfasından detaylı sebep girebilir.",
    })
    .eq("id", taskId);
  await admin.from("sd_lead_events").insert({
    task_id: taskId,
    event_type: "task_rejected",
    meta: { via: "telegram", from_user_id: cb.from?.id ?? null },
  });
  await answerCallback(cb.id, "✗ Reddedildi");
  if (cb.message) await editReplyMarkup(cb.message.chat.id, cb.message.message_id);
  await notifyTaskRejected(taskId, null);
  return NextResponse.json({ ok: true });
}

async function answerCallback(callbackId: string, text: string) {
  const token = process.env.APOLLO_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
    signal: AbortSignal.timeout(3000),
  }).catch((err) => console.error("answerCallback failed", err));
}

async function editReplyMarkup(chatId: number, messageId: number) {
  // Strip the inline keyboard so the buttons can't be clicked twice
  const token = process.env.APOLLO_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
    signal: AbortSignal.timeout(3000),
  }).catch((err) => console.error("editReplyMarkup failed", err));
}
