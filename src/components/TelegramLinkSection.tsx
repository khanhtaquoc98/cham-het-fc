"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { MessageSquare, ArrowLeft } from 'lucide-react';

interface TelegramLinkSectionProps {
  currentTelegramId?: string | null;
}

export default function TelegramLinkSection({ currentTelegramId }: TelegramLinkSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [telegramId, setTelegramId] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const botName = process.env.NEXT_PUBLIC_TELEGRAM_LOGIN_BOT_NAME || "chamhetweb_bot";

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramId) {
      toast.error("Vui lòng nhập Telegram ID");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/telegram-login/send-otp", {
        method: "POST",
        body: JSON.stringify({ telegramId }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setVerificationToken(data.verificationToken);
        setStep(2);
        toast.success("Mã OTP đã được gửi tới Telegram của bạn!");
      } else {
        toast.error(data.error || "Gửi OTP thất bại");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast.error("Vui lòng nhập mã OTP");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({ telegramId, otp, verificationToken }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Liên kết Telegram thành công!");
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(data.error || "Lỗi liên kết Telegram");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối");
    } finally {
      setIsLoading(false);
    }
  };

  // Render linked view if already linked and not in editing state
  if (currentTelegramId && !isEditing) {
    return (
      <div className="glass-card" style={{ padding: '28px', textAlign: 'center', background: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#2e7d32', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          ✅ Đã liên kết Telegram
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
          Tài khoản đã được liên kết thành công với Telegram ID: <code style={{ fontSize: '14px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontWeight: 'bold' }}>{currentTelegramId}</code>.
        </p>
        <button
          type="button"
          onClick={() => {
            setTelegramId("");
            setOtp("");
            setStep(1);
            setIsEditing(true);
          }}
          style={{
            padding: '10px 20px', borderRadius: '10px',
            background: 'transparent', border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Thay đổi / Liên kết lại
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '28px', textAlign: 'center', background: 'rgba(42, 171, 238, 0.05)', border: '1px solid rgba(42, 171, 238, 0.2)', borderRadius: '16px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#2AABEE', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <MessageSquare size={20} />
        {currentTelegramId ? "Thay đổi Telegram" : "Liên kết Telegram"}
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
        Liên kết tài khoản Telegram để đăng nhập nhanh qua OTP và nhận thông báo quan trọng!
      </p>

      {step === 1 ? (
        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '340px', margin: '0 auto' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--text-secondary)', margin: 0 }}>
              💡 <strong>Cách lấy Telegram ID:</strong>
              <br />
              1. Vào <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" style={{ color: '#2AABEE', fontWeight: 'bold' }}>@userinfobot</a> gửi <code>/start</code> để lấy ID.
              <br />
              2. Vào <a href={`https://t.me/${botName}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2AABEE', fontWeight: 'bold' }}>@{botName}</a> gửi <code>/start</code> để khởi chạy nhận OTP.
            </p>
          </div>
          
          <input
            type="text"
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            placeholder="Nhập ID Telegram mới của bạn"
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '10px',
              border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
              transition: 'all 0.2s ease', textAlign: 'center'
            }}
            onFocus={e => e.target.style.borderColor = '#2AABEE'}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
            required
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                background: '#2AABEE', color: 'white', fontSize: '14px', fontWeight: 700, border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease'
              }}
            >
              {isLoading ? "Đang gửi mã..." : "Gửi mã xác thực"}
            </button>
            {currentTelegramId && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  background: 'transparent', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Hủy thay đổi
              </button>
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handleLink} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '340px', margin: '0 auto' }}>
          <div style={{ background: 'rgba(42, 171, 238, 0.08)', padding: '12px 14px', borderRadius: '10px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-primary)', margin: 0 }}>
              Mã OTP đã gửi về Telegram của bạn. Vui lòng nhập để xác thực liên kết.
            </p>
          </div>

          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Nhập 6 chữ số"
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '10px',
              border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700, outline: 'none',
              letterSpacing: '6px', textAlign: 'center'
            }}
            onFocus={e => e.target.style.borderColor = '#2AABEE'}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
            required
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none',
                fontWeight: 700, cursor: 'pointer', fontSize: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <ArrowLeft size={14} /> Quay lại
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px',
                background: '#2AABEE', color: 'white', border: 'none',
                fontWeight: 700, cursor: 'pointer', fontSize: '14px'
              }}
            >
              {isLoading ? "Đang xử lý..." : "Xác nhận"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
