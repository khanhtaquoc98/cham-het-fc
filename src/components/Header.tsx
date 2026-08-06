"use client";

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Settings, Coins, LogOut, Video, LayoutGrid, Menu, X, ChevronRight } from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowUserMenu(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    setUser(null);
    setMobileMenuOpen(false);
    toast.success("Đã đăng xuất");
    window.location.href = "/";
  };

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
              0% { transform: translateX(0%); }
              100% { transform: translateX(-100%); }
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

        {/* Desktop Navigation */}
        <div className="header-desktop-nav" style={{ alignItems: 'center', gap: '8px', zIndex: 10 }}>
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
                }}
              >
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
                    onClick={handleSignOut}
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

        {/* Mobile Toggle Button (3-gạch hamburger) */}
        <div className="header-mobile-toggle" style={{ zIndex: 10 }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
            style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#ffffff',
              padding: '8px 10px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Right Bar Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9998,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Mobile Right Bar Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '290px',
          maxWidth: '85vw',
          background: 'var(--bg-card, #141414)',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 18px',
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto',
          borderLeft: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          color: 'var(--text-primary)',
        }}
      >
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Image src="/logo.png" alt="Chấm Hết FC" width={32} height={32} style={{ borderRadius: '8px' }} />
            <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>Chấm Hết FC</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '18px' }}>
          
          {/* User / Auth Section */}
          <div style={{
            background: 'var(--bg-secondary, rgba(255, 255, 255, 0.04))',
            borderRadius: '16px',
            padding: '14px',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          }}>
            {statsLoading ? (
              <div className="stat-skeleton" style={{ width: '100%', height: '48px', borderRadius: '12px' }} />
            ) : user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        objectFit: 'scale-down',
                        border: '2px solid var(--accent)',
                        flexShrink: 0
                      }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%',
                      background: 'var(--accent)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '18px',
                      flexShrink: 0
                    }}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.username}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Coins size={13} /> {user.balance.toLocaleString()} Bóng
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))' }}>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '8px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={15} /> Tài khoản</span>
                    <ChevronRight size={14} style={{ opacity: 0.5 }} />
                  </Link>

                  <Link
                    href="/dashboard/deposit"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '8px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Coins size={15} /> Thêm bóng</span>
                    <ChevronRight size={14} style={{ opacity: 0.5 }} />
                  </Link>

                  <div
                    onClick={handleSignOut}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      color: '#e53935',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: '8px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><LogOut size={15} /> Đăng xuất</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Đăng nhập để xem thông tin và thêm bóng
                </div>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    background: 'var(--accent, #c62828)',
                    color: 'white',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(198, 40, 40, 0.3)',
                    display: 'block',
                  }}
                >
                  Đăng Nhập
                </Link>
              </div>
            )}
          </div>

          {/* Feature Links Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', paddingLeft: '4px' }}>
              Tính năng
            </div>

            {/* Chiến Thuật Link */}
            <Link
              href="/tactical-board"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-primary)',
                padding: '12px 14px',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'rgba(198, 40, 40, 0.15)',
                  color: 'var(--accent)',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <LayoutGrid size={18} />
                </div>
                <span>Chiến Thuật</span>
              </div>
              <ChevronRight size={16} style={{ opacity: 0.5 }} />
            </Link>

            {/* Highlight Link */}
            <Link
              href="/match-video"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 152, 0, 0.15))',
                color: 'var(--text-primary)',
                padding: '12px 14px',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #ffd700, #ff9800)',
                  color: '#1a1a2e',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)'
                }}>
                  <Video size={18} />
                </div>
                <span>Highlight</span>
              </div>
              <ChevronRight size={16} style={{ opacity: 0.5 }} />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

