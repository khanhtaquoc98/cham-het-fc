import { NextResponse } from "next/server";
import { SignJWT } from "jose";

const secretKey = "football-secret-key-super-secure";
const key = new TextEncoder().encode(secretKey);

export async function POST(request: Request) {
  try {
    const { telegramId } = await request.json();
    if (!telegramId) {
      return NextResponse.json({ error: "Vui lòng nhập Telegram ID" }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Sign the token containing telegramId and otp
    const verificationToken = await new SignJWT({ telegramId, otp })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m") // 5 minutes expiration
      .sign(key);

    const botToken = process.env.TELEGRAM_LOGIN_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Chưa cấu hình Telegram Bot Token" }, { status: 500 });
    }

    try {
      const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: `🔑 Mã OTP đăng nhập chamhetfc của bạn là:\n<code>${otp}</code>\n\n*(Nhấn vào mã để sao chép)*\nTuyệt đối không chia sẻ mã này cho bất kỳ ai.`,
          parse_mode: 'HTML'
        }),
      });
      const tgData = await telegramResponse.json();
      if (!tgData.ok) {
        console.error("Telegram send error:", tgData);
        return NextResponse.json({ 
          error: "Không thể gửi OTP đến Telegram ID này. Hãy chắc chắn bạn đã truy cập bot và nhấn /start trước!" 
        }, { status: 400 });
      }
    } catch (tgErr: any) {
      console.error("Failed to connect to Telegram API:", tgErr);
      return NextResponse.json({ error: "Lỗi kết nối tới Telegram API" }, { status: 500 });
    }

    return NextResponse.json({ success: true, verificationToken });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
