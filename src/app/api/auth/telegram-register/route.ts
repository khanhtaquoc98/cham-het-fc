import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcrypt";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
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

export async function POST(request: Request) {
  try {
    const { username, password, id_token } = await request.json();
    if (!username || !password || !id_token) {
      return NextResponse.json({ error: "Thiếu thông tin đăng ký" }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID || "7905090398";
    
    // Verify JWT token
    const payload = await verifyTelegramIdToken(id_token, clientId);
    const telegramId = String(payload.id || payload.sub);

    if (!telegramId) {
      return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
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
      .eq("telegram_id", telegramId)
      .single();

    if (existingTg) {
      return NextResponse.json({ error: "Tài khoản Telegram này đã được liên kết với một user khác" }, { status: 400 });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    const { data: newUser, error: insertError } = await supabase
      .from("accounts")
      .insert({ 
        username, 
        password_hash, 
        role: "user",
        telegram_id: telegramId,
      })
      .select("id, username, role, balance, player_id")
      .single();

    if (insertError) {
      console.error(insertError);
      return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
    }

    // Create session
    const session = await encrypt({ id: newUser.id, username: newUser.username, role: newUser.role });
    const cookieStore = await cookies();
    cookieStore.set("session", session, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 });

    // Notify admin (fire-and-forget)
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
