"use client";

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Settings, Coins, LogOut, Video, LayoutGrid } from 'lucide-react';

interface User {
  username: string;
  balance: number;
  role?: string;
  avatarUrl?: string | null;
}

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
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
    <div style={{ position: 'sticky', top: 0, zIndex: 1000, marginBottom: pathname === '/' ? '12px' : '0' }}>
      {/* Announcement Bar */}
      {tickerText && (
        <div
          className="announcement-bar"
          style={{
            position: 'relative',
            zIndex: 25,
            overflow: 'hidden',
            background: 'rgba(0,0,0,0.2)',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
            padding: '6px 0',
            width: '100%'
          }}>
          <div style={{ width: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div
              className="announcement-scroll-text"
              dangerouslySetInnerHTML={{ __html: tickerText }}
              style={{
                display: 'inline-block',
                whiteSpace: 'nowrap',
                paddingLeft: '100%',
                animation: 'headerTickerScroll 16s linear infinite',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.2px',
              }}
            />
          </div>
          <style>{`
            @keyframes headerTickerScroll {
              0% {
                transform: translateX(0%);
              }
              100% {
                transform: translateX(-100%);
              }
            }
          `}</style>
        </div>
      )}

      {/* Background layer */}
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

      {/* Main Bar */}
      <div style={{ 
        position: 'relative', 
        zIndex: 10, 
        padding: '16px 24px', 
        minHeight: '76px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
      }}>
        {/* Logo Left */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <Link href="/">
            <Image src="/logo.png" alt="Chấm Hết FC" width={44} height={44} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
          </Link>
        </div>

        {/* Right Section: Sa Bàn Button + Highlight Button + User Menu / Login */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>

          {/* Tactical Board Button */}
          <Link
            href="/tactical-board"
            style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              color: '#ffffff',
              padding: '7px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 800,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <LayoutGrid size={15} /> Chiến Thuật
          </Link>

          {/* Highlight Button */}
          <Link
            href="/match-video"
            style={{
              background: 'linear-gradient(135deg, #ffd700, #ff9800)',
              color: '#1a1a2e',
              padding: '7px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 800,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.4)',
              boxShadow: '0 4px 14px rgba(255, 152, 0, 0.4)',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <Video size={15} /> Highlight
          </Link>

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
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                padding: '3px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'all 0.2s ease'
              }}>
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      objectFit: 'scale-down',
                      border: '1px solid rgba(255,255,255,0.4)',
                      flexShrink: 0
                    }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--accent)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '14px',
                    flexShrink: 0
                  }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
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
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>{user.balance.toLocaleString()} Bóng</div>
                  </div>
                  <Link href="/tactical-board" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '14px', fontWeight: 600, borderRadius: '8px' }}>
                    <LayoutGrid size={16} /> Chiến thuật
                  </Link>
                  <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '14px', fontWeight: 600, borderRadius: '8px', marginTop: '2px' }}>
                    <Settings size={16} /> Tài khoản
                  </Link>
                  <Link href="/dashboard/deposit" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '14px', fontWeight: 600, borderRadius: '8px', marginTop: '2px' }}>
                    <Coins size={16} /> Thêm bóng
                  </Link>
                  <div 
                    onClick={async () => {
                      await fetch('/api/auth/signout', { method: 'POST' });
                      setUser(null);
                      toast.success("Đã đăng xuất");
                      window.location.href = "/";
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', color: '#e53935', cursor: 'pointer', fontSize: '14px', fontWeight: 600, borderRadius: '8px', marginTop: '2px' }}
                  >
                    <LogOut size={16} /> Đăng xuất
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
    </div>
  );
}
