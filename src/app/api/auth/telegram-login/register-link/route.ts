import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcrypt";
import { jwtVerify } from "jose";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";

const secretKey = "football-secret-key-super-secure";
const key = new TextEncoder().encode(secretKey);

export async function POST(request: Request) {
  try {
    const { registerToken, username, password } = await request.json();
    if (!registerToken || !username || !password) {
      return NextResponse.json({ error: "Thiếu thông tin đăng ký" }, { status: 400 });
    }

    // Verify registerToken
    let payload;
    try {
      const decoded = await jwtVerify(registerToken, key, {
        algorithms: ["HS256"],
      });
      payload = decoded.payload as { telegramId: string };
    } catch (err) {
      return NextResponse.json({ error: "Phiên làm việc đã hết hạn. Vui lòng xác thực OTP lại." }, { status: 400 });
    }

    const telegramId = String(payload.telegramId);

    // Double check if telegramId is already linked
    const { data: existingTg } = await supabase
      .from("accounts")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (existingTg) {
      return NextResponse.json({ error: "Tài khoản Telegram này đã được liên kết với một user khác" }, { status: 400 });
    }

    // Check if user exists by username
    const { data: existingUser } = await supabase
      .from("accounts")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    let loggedInUser;

    if (existingUser) {
      // User exists -> link Telegram ID after verifying password
      const match = await bcrypt.compare(password, existingUser.password_hash);
      if (!match) {
        return NextResponse.json({ error: "Tên đăng nhập đã tồn tại hoặc mật khẩu không chính xác" }, { status: 401 });
      }

      // Link Telegram ID
      const { error: updateError } = await supabase
        .from("accounts")
        .update({ telegram_id: telegramId })
        .eq("id", existingUser.id);

      if (updateError) {
        console.error("Link error:", updateError);
        return NextResponse.json({ error: "Lỗi liên kết tài khoản" }, { status: 500 });
      }

      loggedInUser = {
        id: existingUser.id,
        username: existingUser.username,
        role: existingUser.role,
        balance: existingUser.balance,
        player_id: existingUser.player_id
      };
    } else {
      // User does not exist -> Create new account and link
      const password_hash = await bcrypt.hash(password, 10);

      const { data: newUser, error: insertError } = await supabase
        .from("accounts")
        .insert({
          username,
          password_hash,
          role: "user",
          telegram_id: telegramId
        })
        .select("id, username, role, balance, player_id")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return NextResponse.json({ error: "Lỗi tạo tài khoản" }, { status: 500 });
      }

      loggedInUser = newUser;

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
    }

    // Create session
    const session = await encrypt({ id: loggedInUser.id, username: loggedInUser.username, role: loggedInUser.role });
    const cookieStore = await cookies();
    cookieStore.set("session", session, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 });

    return NextResponse.json({ success: true, user: loggedInUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
