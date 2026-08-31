import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("id, username, telegram_id, player_id, players(name)")
      .not("telegram_id", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const users = (accounts || [])
      .filter((a) => a.telegram_id && String(a.telegram_id).trim() !== "")
      .map((a) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const playerName = (a as any).players?.name;
        const displayName = playerName ? `${playerName} (@${a.username})` : `@${a.username}`;
        return {
          id: a.id,
          username: a.username,
          telegram_id: String(a.telegram_id),
          displayName,
        };
      });

    return NextResponse.json({ ok: true, users });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, message, body, telegramIds } = await request.json();

    const notiBody = message || body;
    if (!notiBody || !telegramIds || !Array.isArray(telegramIds) || telegramIds.length === 0) {
      return NextResponse.json({ error: "Missing message or telegramIds" }, { status: 400 });
    }

    // 1. Gửi qua API của bot summary-bot-sepia: https://summary-bot-sepia.vercel.app/api/notify-user
    try {
      const summaryBotRes = await fetch("https://summary-bot-sepia.vercel.app/api/notify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "⚽ Chấm Hết FC",
          body: notiBody,
          telegram_ids: telegramIds,
        }),
      });

      const data = await summaryBotRes.json().catch(() => ({}));
      if (summaryBotRes.ok && data.ok) {
        return NextResponse.json({ ok: true, sent: data.sent, failed: data.failed });
      }
    } catch (botErr) {
      console.warn("Failed to send via summary-bot api/notify-user, falling back to direct Bot API:", botErr);
    }

    // 2. Direct Fallback qua Telegram Bot Token nếu API summary-bot gặp sự cố
    const tokens = [process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_LOGIN_BOT_TOKEN].filter(
      (t): t is string => Boolean(t)
    );

    if (tokens.length === 0) {
      return NextResponse.json({ error: "No Telegram bot token configured" }, { status: 500 });
    }

    const formattedText = `<b>${title || '⚽ Chấm Hết FC'}</b>\n\n${notiBody}`;

    let successCount = 0;
    let failedCount = 0;

    for (const chatId of telegramIds) {
      let sent = false;
      for (const token of tokens) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: formattedText,
              parse_mode: 'HTML',
            }),
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            sent = true;
            break;
          }
        } catch {
          // Try next token
        }
      }

      if (sent) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    return NextResponse.json({ ok: true, sent: successCount, failed: failedCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
