"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { CircleDot } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      toast.error("Vui lòng nhập tên đăng nhập");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        body: JSON.stringify({ username }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Mã OTP đã được gửi về Telegram!");
        setOtpSent(true);
      } else {
        toast.error(data.error || "Lỗi gửi OTP");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setIsLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      toast.error("Vui lòng điền đủ thông tin");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({ username, otp, newPassword }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
        router.push("/login");
      } else {
        toast.error(data.error || "Mã OTP sai hoặc hết hạn");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setIsLoading(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '40px 32px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="vs-badge" style={{ margin: '0 auto 16px', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircleDot size={24} /></div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Khôi Phục Mật Khẩu
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Mã sẽ được gửi về Telegram đã liên kết.</p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên tài khoản của bạn"
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: '12px',
                  border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)',
                  color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500, outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '16px', borderRadius: '12px', marginTop: '8px',
                background: 'linear-gradient(135deg, var(--field-accent-dark), var(--field-accent-light))',
                color: 'white', fontSize: '16px', fontWeight: 800, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 4px 16px rgba(198,40,40,0.2)',
                transition: 'all 0.2s ease', opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? "Đang Gửi..." : "Gửi Mã OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mã OTP (6 Số)
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Ví dụ: 123456"
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: '12px',
                  border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)',
                  color: 'var(--text-primary)', fontSize: '20px', fontWeight: 800, outline: 'none',
                  transition: 'all 0.2s ease', letterSpacing: '4px', textAlign: 'center'
                }}
                onFocus={e => e.target.style.borderColor = '#2AABEE'}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mật khẩu mới
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: '12px',
                  border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)',
                  color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500, outline: 'none',
                  transition: 'all 0.2s ease', letterSpacing: '2px'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '16px', borderRadius: '12px', marginTop: '8px',
                background: '#2e7d32', color: 'white', fontSize: '16px', fontWeight: 800, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 4px 16px rgba(46,125,50,0.2)',
                transition: 'all 0.2s ease', opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? "Đang Xử Lý..." : "Đổi Mật Khẩu"}
            </button>
            <button
              type="button"
              onClick={() => setOtpSent(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}
            >
              ← Quay lại
            </button>
          </form>
        )}

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
          Đã nhớ mật khẩu?{" "}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
