import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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
    const { user } = await request.json();
    if (!user || !user.hash) {
      return NextResponse.json({ error: "Invalid Telegram payload" }, { status: 400 });
    }

    const token = process.env.TELEGRAM_LOGIN_BOT_TOKEN || "7905090398:AAFhdKA7OmctCjTMUTqXQtKbUEE2kgVcw_E";
    if (!token) {
      return NextResponse.json({ error: "Server missing TELEGRAM_LOGIN_BOT_TOKEN" }, { status: 500 });
    }

    // Verify hash
    const isValid = checkSignature(user, token);
    if (!isValid) {
      return NextResponse.json({ error: "Xác thực Telegram không hợp lệ" }, { status: 401 });
    }

    // Prevent replay attacks (optional, check auth_date is within last 24h)
    const authDate = parseInt(user.auth_date, 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      return NextResponse.json({ error: "Dữ liệu xác thực đã hết hạn" }, { status: 401 });
    }

    // Get user by telegram_id
    const { data: dbUser } = await supabase
      .from("accounts")
      .select("*")
      .eq("telegram_id", String(user.id))
      .single();

    if (!dbUser) {
      // User doesn't exist yet, tell the frontend to show a registration modal
      return NextResponse.json({ 
        requireRegister: true, 
        message: "Tài khoản Telegram chưa liên kết. Vui lòng tạo tài khoản." 
      });
    }

    // Create session
    const session = await encrypt({ id: dbUser.id, username: dbUser.username, role: dbUser.role });
    const cookieStore = await cookies();
    cookieStore.set("session", session, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 });

    return NextResponse.json({ success: true, user: { id: dbUser.id, username: dbUser.username, role: dbUser.role, balance: dbUser.balance, player_id: dbUser.player_id } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
