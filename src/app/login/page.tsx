"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import TelegramLoginWidget from "@/components/TelegramLoginWidget";
import { CircleDot } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [telegramPayload, setTelegramPayload] = useState<any>(null);
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const router = useRouter();

  const handleTelegramAuth = async (result: any) => {
    if (result.error) {
      toast.error(result.error === 'popup_closed' ? 'Đã đóng cửa sổ đăng nhập' : result.error);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/telegram-login", {
        method: "POST",
        body: JSON.stringify({ id_token: result.id_token }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requireRegister) {
          setTelegramPayload(result.id_token);
          setShowRegisterModal(true);
        } else {
          toast.success("Đăng nhập thành công!");
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        toast.error(data.error || "Lỗi đăng nhập bằng Telegram");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setIsLoading(false);
  };

  const handleTelegramRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword) {
      toast.error("Vui lòng điền đủ thông tin");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/telegram-register", {
        method: "POST",
        body: JSON.stringify({ username: regUsername, password: regPassword, id_token: telegramPayload }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Tạo tài khoản và liên kết thành công!");
        setShowRegisterModal(false);
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(data.error || "Lỗi tạo tài khoản");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setIsLoading(false);
  };

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
        toast.error(data.error);
        setIsLoading(false);
      }
    } catch (err: any) {
      toast.error(err.message);
      setIsLoading(false);
    } 
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '40px 32px', position: 'relative' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="vs-badge" style={{ margin: '0 auto 16px', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircleDot size={24} /></div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Đăng Nhập
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Chào mừng trở lại đội bóng!</p>
        </div>
        
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

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <TelegramLoginWidget 
            clientId={process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID || "7905090398"} 
            onAuth={handleTelegramAuth} 
          />
        </div>
        
        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
          Chưa có thẻ cầu thủ?{" "}
          <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
            Đăng ký tại đây
          </Link>
        </div>
      </div>

      {showRegisterModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>Tạo Tài Khoản</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>Tài khoản Telegram của bạn chưa được liên kết. Vui lòng tạo tên đăng nhập và mật khẩu.</p>
            
            <form onSubmit={handleTelegramRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Tên đăng nhập</label>
                <input 
                  type="text" required value={regUsername} onChange={e => setRegUsername(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Mật khẩu</label>
                <input 
                  type="password" required value={regPassword} onChange={e => setRegPassword(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowRegisterModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" disabled={isLoading} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#2AABEE', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                  {isLoading ? "Đang xử lý..." : "Xác Nhận"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
