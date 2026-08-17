'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './admin-responsive.css';
import { Landmark, Bell, User, BarChart3, Coins, Users, ArrowLeft, Video, LayoutGrid, RotateCcw } from 'lucide-react';

const navItems = [
  { href: '/admin-111', label: 'Sân bóng', icon: <Landmark size={16} /> },
  { href: '/admin-111/tactical', label: 'Bảng chiến thuật', icon: <LayoutGrid size={16} /> },
  { href: '/admin-111/highlight', label: 'Highlight', icon: <Video size={16} /> },
  { href: '/admin-111/notifications', label: 'Thông báo', icon: <Bell size={16} /> },
  { href: '/admin-111/players', label: 'Cầu thủ', icon: <User size={16} /> },
  { href: '/admin-111/history', label: 'Lịch sử', icon: <BarChart3 size={16} /> },
  { href: '/admin-111/payment', label: 'Thanh toán', icon: <Coins size={16} /> },
  { href: '/admin-111/users', label: 'Tài khoản', icon: <Users size={16} /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [resetting, setResetting] = useState(false);

  const handleResetMatch = async () => {
    if (!confirm('⚠️ Reset trận đấu?\n\nSẽ xoá đội hình (teams) nhưng giữ lại danh sách bench dự bị.')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '/reset' }),
      });
      const data = await res.json();
      if (data.ok) {
        // Dispatch custom event so page.tsx can refresh its state
        window.dispatchEvent(new CustomEvent('admin-match-reset'));
        // Small visual feedback
        alert('✅ Đã reset trận đấu! Bench dự bị được giữ nguyên.');
      } else {
        alert('❌ Lỗi khi reset: ' + (data.error || 'Không rõ'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + String(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#faf5f5', fontFamily: 'Chiron GoRound TC, sans-serif' }}>
      {/* Header */}
      <div className="admin-header" style={{
        background: 'linear-gradient(135deg, #8e0000, #e53935)',
        padding: '20px 32px', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 100
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px', margin: 0 }}>
            Quản lý trận đấu
          </h1>
          <p style={{ fontSize: '13px', opacity: 0.7, marginTop: '2px' }}>
            Admin Panel
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleResetMatch}
            disabled={resetting}
            style={{
              color: 'white', textDecoration: 'none',
              padding: '8px 18px', background: resetting ? 'rgba(255,255,255,0.15)' : 'rgba(255,200,0,0.35)',
              borderRadius: '10px', fontSize: '13px', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              cursor: resetting ? 'wait' : 'pointer', position: 'relative', zIndex: 110,
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              opacity: resetting ? 0.6 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            <RotateCcw size={14} style={{ animation: resetting ? 'spin 1s linear infinite' : 'none' }} />
            {resetting ? 'Đang reset...' : 'Reset trận'}
          </button>
          <Link href="/" style={{
            color: 'white', textDecoration: 'none',
            padding: '8px 18px', background: 'rgba(255,255,255,0.25)',
            borderRadius: '10px', fontSize: '13px', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            cursor: 'pointer', position: 'relative', zIndex: 110,
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <ArrowLeft size={16} /> Trang chủ
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <div className="admin-content" style={{ maxWidth: '100%', width: '100%', margin: '0 auto', padding: '16px 20px 0', boxSizing: 'border-box' }}>
        <div className="admin-nav">
          {navItems.map(item => {
            const isActive = item.href === '/admin-111'
              ? pathname === '/admin-111'
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="admin-nav-link"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, #e53935, #ef5350)'
                    : 'transparent',
                  color: isActive ? 'white' : '#6a6a8a',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                <span className="admin-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page Content */}
      <div className="admin-content" style={{ maxWidth: '100%', width: '100%', margin: '0 auto', padding: '16px 20px 24px', boxSizing: 'border-box' }}>
        {children}
      </div>
    </div>
  );
}
