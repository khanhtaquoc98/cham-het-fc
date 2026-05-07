import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
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

export async function POST(request: Request) {
  try {
    const { telegramData } = await request.json();
    if (!telegramData) {
      return NextResponse.json({ error: "Missing telegramData" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_LOGIN_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Server missing bot token" }, { status: 500 });
    }
    
    // Verify legacy widget data using HMAC-SHA256
    const isValid = verifyTelegramAuth(telegramData, botToken);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid Telegram data" }, { status: 400 });
    }
    
    const telegramId = String(telegramData.id);

    // Check if user exists by telegram_id
    const { data: user } = await supabase
      .from("accounts")
      .select("id, username, role, balance, player_id")
      .eq("telegram_id", telegramId)
      .single();

    if (!user) {
      // User not found — tell frontend to show registration modal
      return NextResponse.json({
        requireRegister: true,
        telegramId,
        telegramName: telegramData.username || telegramData.first_name || "",
      });
    }

    // Create session
    const session = await encrypt({
      id: user.id,
      username: user.username,
      role: user.role,
    });
    const cookieStore = await cookies();
    cookieStore.set("session", session, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Telegram login error:", error);
    return NextResponse.json(
      { error: error.message || "Xác thực thất bại" },
      { status: 401 }
    );
  }
}
