"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '40px 32px', position: 'relative' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="vs-badge" style={{ margin: '0 auto 16px', width: '56px', height: '56px', fontSize: '24px' }}>⚽</div>
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
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Mật khẩu
            </label>
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
            style={{
              width: '100%', padding: '16px', borderRadius: '12px', marginTop: '8px',
              background: 'linear-gradient(135deg, var(--field-accent-dark), var(--field-accent-light))',
              color: 'white', fontSize: '16px', fontWeight: 800, border: 'none', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 4px 16px rgba(198,40,40,0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            onMouseDown={e => e.currentTarget.style.transform = 'translateY(1px)'}
          >
            Vào Sân Ngay
          </button>
        </form>
        
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
