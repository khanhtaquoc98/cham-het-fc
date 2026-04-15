'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './admin-responsive.css';

const navItems = [
  { href: '/admin-111', label: 'Sân bóng', icon: '🏟️' },
  { href: '/admin-111/notifications', label: 'Thông báo', icon: '🔔' },
  { href: '/admin-111/players', label: 'Cầu thủ', icon: '👤' },
  { href: '/admin-111/history', label: 'Lịch sử', icon: '📊' },
  { href: '/admin-111/payment', label: 'Thanh toán', icon: '💰' },
  { href: '/admin-111/users', label: 'Tài khoản', icon: '👥' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: '100vh', background: '#faf5f5', fontFamily: 'Chiron GoRound TC, sans-serif' }}>
      {/* Header */}
      <div className="admin-header" style={{
        background: 'linear-gradient(135deg, #8e0000, #e53935)',
        padding: '20px 32px', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px', margin: 0 }}>
            Quản lý trận đấu
          </h1>
          <p style={{ fontSize: '13px', opacity: 0.7, marginTop: '2px' }}>
            Admin Panel
          </p>
        </div>
        <Link href="/" style={{
          color: 'white', textDecoration: 'none',
          padding: '8px 18px', background: 'rgba(255,255,255,0.18)',
          borderRadius: '10px', fontSize: '13px', fontWeight: 600,
        }}>
          ← Trang chủ
        </Link>
      </div>

      {/* Navigation */}
      <div className="admin-content" style={{ maxWidth: '900px', margin: '0 auto', padding: '16px 20px 0' }}>
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
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span className="admin-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page Content */}
      <div className="admin-content" style={{ maxWidth: '900px', margin: '0 auto', padding: '16px 20px 24px' }}>
        {children}
      </div>
    </div>
  );
}
