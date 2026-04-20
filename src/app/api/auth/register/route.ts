import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcrypt";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("accounts")
      .select("id")
      .eq("username", username)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Default role 'user'
    const { data: newUser, error: insertError } = await supabase
      .from("accounts")
      .insert({ username, password_hash, role: "user" })
      .select("id, username, role, balance")
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
          text: `${username} vừa đăng ký`,
        }),
      }).catch((err) => console.error('Telegram notify failed:', err));
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
