"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Đăng ký thành công!");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(data.error || "Đăng ký thất bại");
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
          <div className="vs-badge" style={{ margin: '0 auto 16px', width: '56px', height: '56px', fontSize: '24px' }}>⚽</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Đăng Ký
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Gia nhập đội bóng ngay hôm nay!</p>
        </div>
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tên đăng nhập mới
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
              Mật khẩu mong muốn
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
            disabled={isLoading}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px', marginTop: '8px',
              background: 'linear-gradient(135deg, var(--field-accent-dark), var(--field-accent-light))',
              color: 'white', fontSize: '16px', fontWeight: 800, border: 'none', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 4px 16px rgba(198,40,40,0.2)',
              transition: 'all 0.2s ease',
              opacity: isLoading ? 0.7 : 1
            }}
            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(0)' }}
            onMouseDown={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(1px)' }}
          >
            {isLoading ? "Đang Khởi Động..." : "Tạo Thẻ Cầu Thủ"}
          </button>
        </form>
        
        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
          Đã có thẻ cầu thủ?{" "}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
            Vào sân ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
