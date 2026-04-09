'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin-111', label: 'Sân bóng', icon: '🏟️' },
  { href: '/admin-111/notifications', label: 'Thông báo', icon: '🔔' },
  { href: '/admin-111/players', label: 'Cầu thủ', icon: '👤' },
  { href: '/admin-111/history', label: 'Lịch sử', icon: '📊' },
  { href: '/admin-111/payment', label: 'Thanh toán', icon: '💰' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: '100vh', background: '#faf5f5', fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div style={{
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
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px 20px 0' }}>
        <div style={{
          display: 'flex', gap: '4px',
          background: 'white', borderRadius: '14px', padding: '4px',
          border: '1px solid rgba(198,40,40,0.1)',
          boxShadow: '0 2px 8px rgba(198,40,40,0.05)',
        }}>
          {navItems.map(item => {
            const isActive = item.href === '/admin-111'
              ? pathname === '/admin-111'
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  flex: 1,
                  padding: '12px 10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive
                    ? 'linear-gradient(135deg, #e53935, #ef5350)'
                    : 'transparent',
                  color: isActive ? 'white' : '#6a6a8a',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: 'Outfit, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px 20px 24px' }}>
        {children}
      </div>
    </div>
  );
}
