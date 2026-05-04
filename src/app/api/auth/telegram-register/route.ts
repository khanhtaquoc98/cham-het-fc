import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcrypt";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
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

export async function POST(request: Request) {
  try {
    const { username, password, telegramUser } = await request.json();
    if (!username || !password || !telegramUser || !telegramUser.hash) {
      return NextResponse.json({ error: "Thiếu thông tin đăng ký" }, { status: 400 });
    }

    const token = process.env.TELEGRAM_LOGIN_BOT_TOKEN || "7905090398:AAFhdKA7OmctCjTMUTqXQtKbUEE2kgVcw_E";
    if (!token) {
      return NextResponse.json({ error: "Server missing TELEGRAM_LOGIN_BOT_TOKEN" }, { status: 500 });
    }

    // Verify hash again for security
    const isValid = checkSignature(telegramUser, token);
    if (!isValid) {
      return NextResponse.json({ error: "Xác thực Telegram không hợp lệ" }, { status: 401 });
    }

    // Check if user exists by username
    const { data: existingUser } = await supabase
      .from("accounts")
      .select("id")
      .eq("username", username)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "Tên đăng nhập đã tồn tại" }, { status: 400 });
    }

    // Check if telegram_id is already used by someone else
    const { data: existingTg } = await supabase
      .from("accounts")
      .select("id")
      .eq("telegram_id", String(telegramUser.id))
      .single();

    if (existingTg) {
      return NextResponse.json({ error: "Tài khoản Telegram này đã được liên kết với một user khác" }, { status: 400 });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Default role 'user'
    const { data: newUser, error: insertError } = await supabase
      .from("accounts")
      .insert({ 
        username, 
        password_hash, 
        role: "user",
        telegram_id: String(telegramUser.id)
      })
      .select("id, username, role, balance, player_id")
      .single();

    if (insertError) {
      console.error(insertError);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // Create session
    const session = await encrypt({ id: newUser.id, username: newUser.username, role: newUser.role });
    const cookieStore = await cookies();
    cookieStore.set("session", session, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 });

    // Notify admin via Telegram (fire-and-forget)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: 8429266599,
          text: `${username} vừa đăng ký tài khoản qua Telegram Login!`,
        }),
      }).catch((err) => console.error('Telegram notify failed:', err));
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
