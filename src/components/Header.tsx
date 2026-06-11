"use client";

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Settings, Coins, LogOut } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<{username: string; balance: number} | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const [tickerText, setTickerText] = useState('');
  const [siteTheme, setSiteTheme] = useState('default');

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

    fetch('/api/theme')
      .then(res => res.json())
      .then(data => setSiteTheme(data.theme || 'default'))
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
        <div
          className="announcement-bar"
          style={{
            position: 'relative',
            zIndex: 20,
            overflow: 'hidden',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
            animation: 'announcement-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '7px 0',
            gap: '0',
          }}>
            {/* Pinned icon left */}
            <span style={{
              flexShrink: 0,
              fontSize: '13px',
              color: 'rgba(255,255,255,0.9)',
            }}></span>

            {/* Scrolling text */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <div
                className="announcement-scroll-text"
                dangerouslySetInnerHTML={{ __html: tickerText }}
                style={{
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                  animation: 'announcement-scroll 15s linear infinite',
                  animationDelay: '0.6s',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  letterSpacing: '0.2px',
                  paddingLeft: '100%',
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              />
            </div>
          </div>

          <style>{`
            @keyframes announcement-enter {
              0% {
                max-height: 0;
                opacity: 0;
                transform: translateY(-100%);
              }
              60% {
                opacity: 1;
              }
              100% {
                max-height: 40px;
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes announcement-scroll {
              0%   { transform: translateX(0); opacity: 1; }
              100% { transform: translateX(-100%); opacity: 1; }
            }
            .announcement-bar:hover .announcement-scroll-text {
              animation-play-state: paused !important;
            }
            .announcement-bar {
              cursor: default;
            }
            .announcement-scroll-text a {
              color: #fff;
              text-decoration: underline;
              text-underline-offset: 2px;
              font-weight: 700;
              transition: opacity 0.2s ease;
            }
            .announcement-scroll-text a:hover {
              opacity: 0.8;
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

      {/* WC26 Hero Strip (inside header) */}
      {siteTheme === 'worldcup2026' && pathname === '/' && (
        <div style={{
          position: 'relative',
          zIndex: 5,
          background: 'linear-gradient(135deg, #0a0e1a 0%, #0f1b2d 30%, #162a3a 60%, #0f1b2d 100%)',
          borderTop: '1px solid rgba(77,182,172,0.15)',
          borderBottom: '2px solid rgba(255,213,79,0.25)',
          padding: '10px 20px',
          overflow: 'hidden',
        }}>
          {/* Animated shimmer overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,213,79,0.04) 45%, rgba(255,213,79,0.08) 50%, rgba(255,213,79,0.04) 55%, transparent 60%)',
            backgroundSize: '200% 100%',
            animation: 'wc26-shimmer 4s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          {/* Corner accents */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '60px', height: '100%',
            background: 'linear-gradient(90deg, rgba(0,137,123,0.12), transparent)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: 0, right: 0, width: '60px', height: '100%',
            background: 'linear-gradient(270deg, rgba(233,30,99,0.1), transparent)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'relative', zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '16px', flexWrap: 'wrap',
          }}>
            {/* Trophy + FIFA badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '3px 12px 3px 8px',
              background: 'linear-gradient(135deg, rgba(255,213,79,0.15), rgba(255,179,0,0.08))',
              border: '1px solid rgba(255,213,79,0.25)',
              borderRadius: '20px',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '14px' }}>🏆</span>
              <span style={{
                fontSize: '10px', fontWeight: 800,
                color: '#FFD54F',
                letterSpacing: '1.5px',
                textTransform: 'uppercase' as const,
              }}>FIFA World Cup 26</span>
            </div>


            {/* Host countries */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '11px', color: 'rgba(255,255,255,0.6)',
              fontWeight: 600, letterSpacing: '0.5px',
            }}>
              <span>🇺🇸 USA</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span>🇲🇽 México</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span>🇨🇦 Canada</span>
            </div>
          </div>

          <style>{`
            @keyframes wc26-shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      )}

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
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>{user.balance.toLocaleString()} Bóng</div>
                </div>
                <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '14px', fontWeight: 600, borderRadius: '8px' }}>
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
  );
}
