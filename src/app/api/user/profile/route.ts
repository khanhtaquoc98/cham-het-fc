import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import * as jose from "jose";

async function verifyTelegramIdToken(idToken: string, clientId: string) {
  const JWKS = jose.createRemoteJWKSet(
    new URL("https://oauth.telegram.org/.well-known/jwks.json")
  );
  const { payload } = await jose.jwtVerify(idToken, JWKS, {
    issuer: "https://oauth.telegram.org",
    audience: clientId,
  });
  return payload;
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id_token } = await request.json();
    if (!id_token) {
      return NextResponse.json({ error: "Thiếu dữ liệu Telegram" }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID || "7905090398";
    const payload = await verifyTelegramIdToken(id_token, clientId);
    const telegramId = String(payload.id || payload.sub);

    if (!telegramId) {
      return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
    }

    // Check if telegram_id is used by someone else
    const { data: existingTg } = await supabase
      .from("accounts")
      .select("id")
      .eq("telegram_id", telegramId)
      .neq("id", session.id)
      .single();

    if (existingTg) {
      return NextResponse.json({ error: "Tài khoản Telegram này đã được liên kết với một user khác" }, { status: 400 });
    }

    // Update
    const { error: updateError } = await supabase
      .from("accounts")
      .update({ telegram_id: telegramId })
      .eq("id", session.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
