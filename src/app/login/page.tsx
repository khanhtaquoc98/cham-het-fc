"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { CircleDot, MessageSquare, ArrowLeft, KeyRound, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<'password' | 'telegram'>('password');
  
  // Password login states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Telegram login states
  const [telegramId, setTelegramId] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [registerToken, setRegisterToken] = useState("");
  const [tgStep, setTgStep] = useState<1 | 2 | 3>(1); // 1: enter ID, 2: enter OTP, 3: enter username & password
  
  // Link/Register account states (Step 3)
  const [tgUsername, setTgUsername] = useState("");
  const [tgPassword, setTgPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const botName = process.env.NEXT_PUBLIC_TELEGRAM_LOGIN_BOT_NAME || "chamhetweb_bot";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Đăng nhập thành công!");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(data.error || "Tên đăng nhập hoặc mật khẩu không chính xác");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối");
    } finally {
      setIsLoading(false);
    }
  };

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
        setTgStep(2);
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast.error("Vui lòng nhập mã OTP");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/telegram-login/verify-otp", {
        method: "POST",
        body: JSON.stringify({ telegramId, otp, verificationToken }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        if (data.registered) {
          toast.success("Đăng nhập thành công!");
          router.push("/dashboard");
          router.refresh();
        } else {
          setRegisterToken(data.registerToken);
          setTgStep(3);
          toast.success("Xác thực OTP thành công! Vui lòng hoàn tất liên kết tài khoản.");
        }
      } else {
        toast.error(data.error || "Mã OTP không chính xác");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tgUsername || !tgPassword) {
      toast.error("Vui lòng điền đủ thông tin");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/telegram-login/register-link", {
        method: "POST",
        body: JSON.stringify({ registerToken, username: tgUsername, password: tgPassword }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Đăng nhập thành công!");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(data.error || "Xử lý thất bại");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '40px 32px', position: 'relative' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="vs-badge" style={{ margin: '0 auto 16px', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircleDot size={24} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Đăng Nhập
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {loginMethod === 'password' ? 'Chào mừng trở lại đội bóng!' : 'Đăng nhập bảo mật qua Telegram'}
          </p>
        </div>

        {loginMethod === 'password' ? (
          <>
            {/* Standard Username/Password Login */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên tài khoản"
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
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Mật khẩu
                  </label>
                  <Link href="/forgot-password" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                    Quên mật khẩu?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  background: 'linear-gradient(135deg, var(--field-accent-dark), var(--field-accent-light))',
                  color: 'white', fontSize: '16px', fontWeight: 800, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 4px 16px rgba(198,40,40,0.2)',
                  transition: 'all 0.2s ease',
                  opacity: isLoading ? 0.7 : 1
                }}
                onMouseEnter={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(0)' }}
                onMouseDown={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(1px)' }}
              >
                {isLoading ? "Đang Vào Sân..." : "Vào Sân Ngay"}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
              <span style={{ padding: '0 12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Hoặc</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
            </div>

            <button
              type="button"
              onClick={() => {
                setLoginMethod('telegram');
                setTgStep(1);
              }}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: 'rgba(42, 171, 238, 0.1)', border: '1px solid rgba(42, 171, 238, 0.4)',
                color: '#2AABEE', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(42, 171, 238, 0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(42, 171, 238, 0.1)' }}
            >
              <MessageSquare size={18} />
              Đăng nhập qua Telegram
            </button>
          </>
        ) : (
          <>
            {/* Telegram Login flow */}
            {/* Steps indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: 'var(--border-subtle)', zIndex: 1 }}></div>
              <div style={{ position: 'absolute', top: '50%', left: 0, width: tgStep === 1 ? '0%' : tgStep === 2 ? '50%' : '100%', height: '2px', background: '#2AABEE', zIndex: 1, transition: 'all 0.3s ease' }}></div>
              {[1, 2, 3].map((step) => {
                const isActive = step <= tgStep;
                const isCurrent = step === tgStep;
                return (
                  <div key={step} style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', 
                    background: isCurrent ? '#2AABEE' : isActive ? '#1e75a3' : 'var(--bg-secondary)', 
                    border: `2px solid ${isActive ? '#2AABEE' : 'var(--border-subtle)'}`,
                    color: isActive ? 'white' : 'var(--text-muted)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontWeight: 'bold', fontSize: '13px', zIndex: 2, transition: 'all 0.3s'
                  }}>
                    {step}
                  </div>
                );
              })}
            </div>

            {tgStep === 1 && (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                    💡 <strong>Hướng dẫn lấy Telegram ID:</strong>
                    <br />
                    1. Nhấn vào <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" style={{ color: '#2AABEE', fontWeight: 'bold', textDecoration: 'underline' }}>@userinfobot</a> rồi gửi <code>/start</code> để lấy dòng <b>Id</b> của bạn.
                    <br />
                    2. Nhấn vào <a href={`https://t.me/${botName}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2AABEE', fontWeight: 'bold', textDecoration: 'underline' }}>@{botName}</a> rồi gửi <code>/start</code> để nhận mã OTP.
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Telegram ID
                  </label>
                  <input
                    type="text"
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                    placeholder="Nhập ID Telegram của bạn (ví dụ: 12345678)"
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: '12px',
                      border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500, outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={e => e.target.style.borderColor = '#2AABEE'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%', padding: '16px', borderRadius: '12px',
                    background: '#2AABEE', color: 'white', fontSize: '16px', fontWeight: 800, border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '1px',
                    boxShadow: '0 4px 16px rgba(42,171,238,0.2)', transition: 'all 0.2s ease',
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  {isLoading ? "Đang gửi mã..." : "Gửi mã OTP"}
                </button>
              </form>
            )}

            {tgStep === 2 && (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'rgba(42, 171, 238, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(42, 171, 238, 0.2)' }}>
                  <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)', margin: 0, textAlign: 'center' }}>
                    🔑 Mã OTP đã được gửi qua Telegram của bạn.<br />Vui lòng kiểm tra và nhập mã 6 chữ số dưới đây.
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Mã xác thực OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Nhập 6 chữ số"
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: '12px',
                      border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700, outline: 'none',
                      transition: 'all 0.2s ease', letterSpacing: '8px', textAlign: 'center'
                    }}
                    onFocus={e => e.target.style.borderColor = '#2AABEE'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%', padding: '16px', borderRadius: '12px',
                      background: '#2AABEE', color: 'white', fontSize: '16px', fontWeight: 800, border: 'none',
                      cursor: isLoading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '1px',
                      boxShadow: '0 4px 16px rgba(42,171,238,0.2)', transition: 'all 0.2s ease',
                      opacity: isLoading ? 0.7 : 1
                    }}
                  >
                    {isLoading ? "Đang xác thực..." : "Xác nhận OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTgStep(1);
                      setOtp("");
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px',
                      cursor: 'pointer', textDecoration: 'underline', padding: '6px'
                    }}
                  >
                    Quay lại nhập ID
                  </button>
                </div>
              </form>
            )}

            {tgStep === 3 && (
              <form onSubmit={handleRegisterLink} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                    ℹ️ <strong>Chưa liên kết tài khoản:</strong>
                    <br />
                    Telegram ID của bạn chưa được liên kết với bất kỳ tài khoản nào.
                    Vui lòng nhập tên đăng nhập và mật khẩu bên dưới để liên kết hoặc tạo tài khoản mới.
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    value={tgUsername}
                    onChange={(e) => setTgUsername(e.target.value)}
                    placeholder="Nhập tên tài khoản"
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: '12px',
                      border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500, outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={e => e.target.style.borderColor = '#2AABEE'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    value={tgPassword}
                    onChange={(e) => setTgPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: '12px',
                      border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)',
                      color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500, outline: 'none',
                      transition: 'all 0.2s ease', letterSpacing: '2px'
                    }}
                    onFocus={e => e.target.style.borderColor = '#2AABEE'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      setTgStep(1);
                      setTgUsername("");
                      setTgPassword("");
                    }} 
                    style={{ 
                      flex: 1, padding: '14px', borderRadius: '12px', 
                      background: 'var(--bg-secondary)', color: 'var(--text-primary)', 
                      border: 'none', fontWeight: 700, cursor: 'pointer' 
                    }}
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    disabled={isLoading} 
                    style={{ 
                      flex: 1, padding: '14px', borderRadius: '12px', 
                      background: '#2AABEE', color: 'white', 
                      border: 'none', fontWeight: 700, cursor: 'pointer' 
                    }}
                  >
                    {isLoading ? "Đang xử lý..." : "Hoàn tất"}
                  </button>
                </div>
              </form>
            )}

            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', marginTop: '16px',
                background: 'transparent', border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <ArrowLeft size={16} />
              Quay lại Đăng nhập Mật khẩu
            </button>
          </>
        )}

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
          Chưa có thẻ cầu thủ?{" "}
          <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
            Đăng ký tại đây
          </Link>
        </div>
      </div>
    </div>
  );
}
