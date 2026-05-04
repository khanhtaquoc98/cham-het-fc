import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  try {
    const { username, otp, newPassword } = await request.json();
    if (!username || !otp || !newPassword) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const { data: user } = await supabase
      .from("accounts")
      .select("id, login_code")
      .eq("username", username)
      .eq("login_code", otp)
      .single();

    if (!user) {
      return NextResponse.json({ error: "Mã OTP không hợp lệ hoặc đã hết hạn" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from("accounts")
      .update({ password_hash, login_code: null })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
