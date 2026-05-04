import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

function checkSignature(user: any, botToken: string) {
  const { hash, ...data } = user;
  const dataCheckString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return hmac === hash;
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { telegramPayload } = await request.json();
    if (!telegramPayload || !telegramPayload.hash) {
      return NextResponse.json({ error: "Thiếu dữ liệu Telegram" }, { status: 400 });
    }

    const token = process.env.TELEGRAM_LOGIN_BOT_TOKEN || "7905090398:AAFhdKA7OmctCjTMUTqXQtKbUEE2kgVcw_E";
    if (!checkSignature(telegramPayload, token)) {
      return NextResponse.json({ error: "Xác thực Telegram không hợp lệ" }, { status: 401 });
    }

    // Check if telegram_id is used by someone else
    const { data: existingTg } = await supabase
      .from("accounts")
      .select("id")
      .eq("telegram_id", String(telegramPayload.id))
      .neq("id", session.id)
      .single();

    if (existingTg) {
      return NextResponse.json({ error: "Tài khoản Telegram này đã được liên kết với một user khác" }, { status: 400 });
    }

    // Update
    const { error: updateError } = await supabase
      .from("accounts")
      .update({ telegram_id: String(telegramPayload.id) })
      .eq("id", session.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
