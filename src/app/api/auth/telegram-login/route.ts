import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import * as jose from "jose";

async function verifyTelegramIdToken(idToken: string, clientId: string) {
  // Fetch Telegram's public JWKS keys
  const JWKS = jose.createRemoteJWKSet(
    new URL("https://oauth.telegram.org/.well-known/jwks.json")
  );

  // Verify signature, issuer, audience, and expiration
  const { payload } = await jose.jwtVerify(idToken, JWKS, {
    issuer: "https://oauth.telegram.org",
    audience: clientId,
  });

  return payload;
}

export async function POST(request: Request) {
  try {
    const { id_token } = await request.json();
    if (!id_token) {
      return NextResponse.json({ error: "Missing id_token" }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID || "7905090398";
    
    // Verify the JWT token cryptographically
    const payload = await verifyTelegramIdToken(id_token, clientId);
    
    const telegramId = String(payload.id || payload.sub);
    if (!telegramId) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
    }

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
        telegramName: payload.name || payload.preferred_username || "",
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
