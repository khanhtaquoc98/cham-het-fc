import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: "Vui lòng nhập tên đăng nhập" }, { status: 400 });
    }

    const { data: user } = await supabase
      .from("accounts")
      .select("id, telegram_id")
      .eq("username", username)
      .single();

    if (!user) {
      return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });
    }

    if (!user.telegram_id) {
      return NextResponse.json({ error: "Tài khoản chưa được liên kết Telegram. Không thể khôi phục mật khẩu qua OTP." }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const { error: updateError } = await supabase
      .from("accounts")
      .update({ login_code: otp })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
    }

    const botToken = process.env.TELEGRAM_LOGIN_BOT_TOKEN;
    if (botToken) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: user.telegram_id,
          text: `🔑 Mã OTP Khôi phục mật khẩu của bạn là: ${otp}\nTuyệt đối không chia sẻ mã này cho bất kỳ ai.`,
        }),
      });
    }

    return NextResponse.json({ success: true, message: "Mã OTP đã được gửi về Telegram của bạn" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
