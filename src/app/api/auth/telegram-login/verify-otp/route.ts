import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { jwtVerify, SignJWT } from "jose";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";

const secretKey = "football-secret-key-super-secure";
const key = new TextEncoder().encode(secretKey);

export async function POST(request: Request) {
  try {
    const { telegramId, otp, verificationToken } = await request.json();
    if (!telegramId || !otp || !verificationToken) {
      return NextResponse.json({ error: "Thiếu thông tin xác thực" }, { status: 400 });
    }

    // Verify verificationToken
    let payload;
    try {
      const decoded = await jwtVerify(verificationToken, key, {
        algorithms: ["HS256"],
      });
      payload = decoded.payload as { telegramId: string; otp: string };
    } catch (err) {
      return NextResponse.json({ error: "Mã OTP đã hết hạn hoặc không hợp lệ" }, { status: 400 });
    }

    // Verify OTP matches
    if (String(payload.telegramId) !== String(telegramId) || String(payload.otp) !== String(otp)) {
      return NextResponse.json({ error: "Mã OTP không chính xác" }, { status: 400 });
    }

    // Check if user exists by telegram_id
    const { data: user } = await supabase
      .from("accounts")
      .select("id, username, role, balance, player_id")
      .eq("telegram_id", String(telegramId))
      .maybeSingle();

    if (user) {
      // User exists - Create session
      const session = await encrypt({ id: user.id, username: user.username, role: user.role });
      const cookieStore = await cookies();
      cookieStore.set("session", session, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 });

      return NextResponse.json({ success: true, registered: true, user });
    } else {
      // User does not exist - Generate register token (valid for 15 minutes)
      const registerToken = await new SignJWT({ telegramId: String(telegramId) })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(key);

      return NextResponse.json({ success: true, registered: false, registerToken });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
