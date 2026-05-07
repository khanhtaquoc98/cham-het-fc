import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import * as jose from "jose";

import crypto from "crypto";

function verifyTelegramAuth(data: any, botToken: string) {
  if (!data || !data.hash) return false;
  const { hash, ...userData } = data;
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  
  const dataCheckString = Object.keys(userData)
    .sort()
    .map(key => `${key}=${userData[key]}`)
    .join("\n");
    
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return hmac === hash;
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { telegramData } = await request.json();
    if (!telegramData) {
      return NextResponse.json({ error: "Thiếu dữ liệu Telegram" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Server missing bot token" }, { status: 500 });
    }

    const isValid = verifyTelegramAuth(telegramData, botToken);
    if (!isValid) {
      return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
    }
    
    const telegramId = String(telegramData.id);

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
