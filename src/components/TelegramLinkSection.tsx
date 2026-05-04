"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import TelegramLoginWidget from "./TelegramLoginWidget";

export default function TelegramLinkSection() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLink = async (user: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({ telegramPayload: user }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Liên kết Telegram thành công!");
        router.refresh();
      } else {
        toast.error(data.error || "Lỗi liên kết Telegram");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="glass-card" style={{ padding: '24px', textAlign: 'center', background: 'rgba(42, 171, 238, 0.1)', border: '1px solid rgba(42, 171, 238, 0.3)' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#2AABEE', marginBottom: '8px' }}>Liên kết Telegram</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
        Bạn chưa liên kết tài khoản Telegram. Hãy liên kết ngay để có thể đăng nhập nhanh và nhận thông báo OTP!
      </p>
      
      {isLoading ? (
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Đang liên kết...</p>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <TelegramLoginWidget 
            clientId={process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID || "7905090398"} 
            onAuth={handleLink} 
          />
        </div>
      )}
    </div>
  );
}
