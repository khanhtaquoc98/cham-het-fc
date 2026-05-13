"use client";

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<{username: string; balance: number} | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const [tickerText, setTickerText] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setStatsLoading(false);
      })
      .catch(() => setStatsLoading(false));
  }, [pathname]);

  useEffect(() => {
    fetch('/api/ticker')
      .then(res => res.json())
      .then(data => setTickerText(data.ticker || ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hide on admin pages only
  const isShow = !pathname.startsWith('/admin-111');
  if (!isShow) return null;

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 1000, marginBottom: pathname === '/' ? '12px' : '28px' }}>
      {/* Announcement Bar */}
      {tickerText && (
        <div style={{
          position: 'relative',
          zIndex: 20,
          overflow: 'hidden',
          background: 'linear-gradient(90deg, #e53935 0%, #c62828 50%, #e53935 100%)',
          padding: '7px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
        }}>
          {/* Pinned icon left */}
          <span style={{
            flexShrink: 0,
            padding: '0 10px',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.9)',
          }}></span>

          {/* Scrolling text */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              animation: 'announcement-scroll 15s linear infinite',
              color: '#fff',
              fontWeight: 600,
              fontSize: '12.5px',
              letterSpacing: '0.2px',
              paddingLeft: '100%',
            }}>
              {tickerText}
            </div>
          </div>

          <style>{`
            @keyframes announcement-scroll {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
        </div>
      )}

      {/* Background layer to handle clipping without affecting dropdown */}
      <header className="field-header" style={{ 
        position: 'absolute', 
        inset: 0, 
        margin: 0, 
        padding: 0, 
        zIndex: 0 
      }}>
        <div className="field-corner-tl" />
        <div className="field-corner-tr" />
        <div className="field-corner-bl" />
        <div className="field-corner-br" />
      </header>

      {/* Foreground content layer */}
      <div style={{ 
        position: 'relative', 
        zIndex: 10,
        padding: '16px 24px', 
        minHeight: '76px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <Link href="/">
            <Image src="/logo.png" alt="Chấm Hết FC" width={44} height={44} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
          </Link>
        </div>

        {/* User Menu */}
        {statsLoading ? (
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div className="stat-skeleton" style={{ width: '90px', height: '36px', borderRadius: '20px' }} />
          </div>
        ) : user ? (
          <div
            ref={menuRef}
            className="user-menu-wrapper"
            style={{ position: 'relative', zIndex: 200 }}
          >
            <div 
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
              padding: '6px 12px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'var(--accent)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '14px'
              }}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '13px' }}>{user.username}</span>
            </div>
            
            {showUserMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                background: 'var(--bg-primary)', borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)', minWidth: '180px',
                padding: '8px', border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)'
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Số bóng</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>{user.balance.toLocaleString()} ⚽</div>
                </div>
                <Link href="/dashboard" style={{ display: 'block', padding: '10px 12px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '14px', fontWeight: 600, borderRadius: '8px' }}>
                  ⚙️ Tài khoản
                </Link>
                <Link href="/dashboard/deposit" style={{ display: 'block', padding: '10px 12px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '14px', fontWeight: 600, borderRadius: '8px', marginTop: '2px' }}>
                  💰 Thêm bóng
                </Link>
                <div 
                  onClick={async () => {
                    await fetch('/api/auth/signout', { method: 'POST' });
                    setUser(null);
                    toast.success("Đã đăng xuất");
                    window.location.href = "/";
                  }}
                  style={{ display: 'block', padding: '10px 12px', color: '#e53935', cursor: 'pointer', fontSize: '14px', fontWeight: 600, borderRadius: '8px', marginTop: '2px' }}
                >
                  🚪 Đăng xuất
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ position: 'relative', zIndex: 10 }}>
            <Link
              href="/login"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
                display: 'inline-block'
              }}
            >
              Đăng Nhập
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
