"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { User, Shield, MessageSquare, AlertCircle, Film, Send, Trophy } from 'lucide-react';

export interface PlayerMatchItem {
  id: string;
  matchHistoryId: string;
  matchDate?: string | null;
  matchTime?: string | null;
  teamName?: string | null;
  result?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
}

export interface PlayerStatsInfo {
  wins: number;
  draws: number;
  losses: number;
  totalMatches: number;
  winRate: number;
}

interface UserProfileSectionProps {
  user: {
    id: string;
    username: string;
    telegram_id?: string | null;
  };
  linkedPlayer?: {
    id: string;
    name: string;
    jersey_number?: number | null;
    is_injury_prone?: boolean | null;
    avatar_version?: string | number | null;
  } | null;
  recentMatches?: PlayerMatchItem[];
  playerStats?: PlayerStatsInfo | null;
}

export default function UserProfileSection({ user, linkedPlayer, recentMatches = [], playerStats }: UserProfileSectionProps) {
  const router = useRouter();
  const [avatarVer] = useState<number | string | null>(null);

  // Telegram link form state
  const [isEditingTele, setIsEditingTele] = useState(false);
  const [teleStep, setTeleStep] = useState<1 | 2>(1);
  const [inputTeleId, setInputTeleId] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [teleLoading, setTeleLoading] = useState(false);

  const botName = process.env.NEXT_PUBLIC_TELEGRAM_LOGIN_BOT_NAME || "chamhetweb_bot";

  // Avatar URL (Deterministic version to prevent SSR hydration mismatch)
  const filename = linkedPlayer?.jersey_number != null ? linkedPlayer.jersey_number : linkedPlayer?.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udlhudfxwuwbecjqvvhv.supabase.co';
  const versionParam = avatarVer ? `?v=${avatarVer}` : (linkedPlayer?.avatar_version ? `?v=${linkedPlayer.avatar_version}` : '');
  const avatarUrl = filename ? `${supabaseUrl}/storage/v1/object/public/players/${filename}.webp${versionParam}` : null;



  const handleSendTeleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTeleId) {
      toast.error("Vui lòng nhập Telegram ID");
      return;
    }
    setTeleLoading(true);
    try {
      const res = await fetch("/api/auth/telegram-login/send-otp", {
        method: "POST",
        body: JSON.stringify({ telegramId: inputTeleId }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setVerificationToken(data.verificationToken);
        setTeleStep(2);
        toast.success("Mã OTP đã được gửi tới Telegram của bạn!");
      } else {
        toast.error(data.error || "Gửi OTP thất bại");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setTeleLoading(false);
    }
  };

  const handleConfirmTeleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast.error("Vui lòng nhập OTP");
      return;
    }
    setTeleLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({ telegramId: inputTeleId, otp, verificationToken }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Liên kết Telegram thành công!");
        setIsEditingTele(false);
        router.refresh();
      } else {
        toast.error(data.error || "Lỗi liên kết Telegram");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setTeleLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{
      padding: '24px',
      borderRadius: '20px',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Card Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <User size={20} style={{ color: '#dc2626' }} />
          Thông Tin Tài Khoản
        </h3>
        {linkedPlayer ? (
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '9999px' }}>
            Cầu thủ #{linkedPlayer.jersey_number || ''}
          </span>
        ) : (
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '9999px' }}>
            Khán giả
          </span>
        )}
      </div>

      {/* Main Profile Info Row (Avatar + Name + Jersey) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Avatar Circle with Floating Pencil Edit Badge */}
        <div style={{
          position: 'relative',
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          padding: '3px',
          background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
          boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)',
          flexShrink: 0
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.username}
                style={{ width: '100%', height: '100%', objectFit: 'scale-down' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=0f172a&color=ffffff&bold=true`;
                }}
              />
            ) : (
              <div style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900 }}>
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* User & Player Meta */}
        <div style={{ flex: 1, minWidth: '150px' }}>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
            {linkedPlayer ? linkedPlayer.name : user.username}
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span>@{user.username}</span>
            {linkedPlayer?.jersey_number != null && (
              <>
                <span>•</span>
                <span style={{ color: '#dc2626', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Shield size={13} /> Áo số #{linkedPlayer.jersey_number}
                </span>
              </>
            )}
            {linkedPlayer?.is_injury_prone && (
              <>
                <span>•</span>
                <span
                  title="Dễ chấn thương (Injury Prone)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '5px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </>
            )}
          </div>

          {/* Player Winrate Badge */}
          {playerStats && playerStats.totalMatches > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #fef2f2 0%, #ffe4e6 100%)',
                border: '1px solid #fecdd3',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                color: '#be123c'
              }}>
                <Trophy size={13} style={{ color: '#e11d48' }} />
                <span>Winrate: {playerStats.winRate}%</span>
                <span style={{ fontSize: '11px', color: '#9f1239', fontWeight: 600 }}>
                  ({playerStats.wins}T - {playerStats.draws}H - {playerStats.losses}B)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notice Banner when NOT linked to a player */}
      {!linkedPlayer && (
        <div style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
          border: '1px solid #fed7aa',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c', fontWeight: 800, fontSize: '13.5px' }}>
            <AlertCircle size={18} />
            <span>Tài khoản chưa liên kết Hồ Sơ Cầu Thủ</span>
          </div>
          <p style={{ fontSize: '12.5px', color: '#9a3412', margin: 0, lineHeight: 1.5 }}>
            Hãy liên hệ với Admin để được thêm hồ sơ cầu thủ, tính điểm chỉ số trận đấu và tải avatar riêng!
          </p>
          <div style={{ marginTop: '2px' }}>
            <a
              href={`https://t.me/${botName}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ea580c',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={13} />
              Liên Hệ Admin Thêm Hồ Sơ
            </a>
          </div>
        </div>
      )}

      {/* Integrated Telegram Link Section */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 800, color: user.telegram_id ? '#15803d' : '#2563eb' }}>
            <MessageSquare size={16} />
            {user.telegram_id ? "Đã liên kết Telegram" : "Liên kết Telegram"}
          </div>
          {user.telegram_id && !isEditingTele && (
            <button
              type="button"
              onClick={() => { setInputTeleId(""); setOtp(""); setTeleStep(1); setIsEditingTele(true); }}
              style={{
                fontSize: '12px', fontWeight: 700, color: '#475569', background: '#ffffff',
                border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer'
              }}
            >
              Thay đổi
            </button>
          )}
        </div>

        {user.telegram_id && !isEditingTele ? (
          <div style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
            Tài khoản đã kết nối thành công với ID Telegram: <code style={{ background: '#ffffff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', color: '#1e293b', fontWeight: 800 }}>{user.telegram_id}</code>
          </div>
        ) : !user.telegram_id && !isEditingTele ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>
              Liên kết ID Telegram để nhận OTP và đăng nhập nhanh chóng.
            </span>
            <button
              type="button"
              onClick={() => { setInputTeleId(""); setOtp(""); setTeleStep(1); setIsEditingTele(true); }}
              style={{
                fontSize: '12px', fontWeight: 800, color: '#ffffff', background: '#0284c7',
                border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
              }}
            >
              Kết nối ngay
            </button>
          </div>
        ) : (
          /* Inline Telegram Link / Edit Form */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
            {teleStep === 1 ? (
              <form onSubmit={handleSendTeleOtp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11.5px', color: '#475569', lineHeight: 1.5 }}>
                  💡 <strong>Cách lấy Telegram ID:</strong>
                  <br />
                  1. Gửi <code>/start</code> tới <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', fontWeight: 800 }}>@userinfobot</a> để lấy ID.
                  <br />
                  2. Gửi <code>/start</code> tới <a href={`https://t.me/${botName}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', fontWeight: 800 }}>@{botName}</a> để bật OTP.
                </div>
                <input
                  type="text"
                  value={inputTeleId}
                  onChange={(e) => setInputTeleId(e.target.value)}
                  placeholder="Nhập ID Telegram của bạn (Ví dụ: 8429266599)"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a',
                    fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                  }}
                  required
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    disabled={teleLoading}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: '8px', background: '#0284c7',
                      color: '#ffffff', fontWeight: 800, fontSize: '12.5px', border: 'none', cursor: teleLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {teleLoading ? 'Đang gửi...' : 'Gửi mã xác thực'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingTele(false)}
                    style={{
                      padding: '8px 12px', borderRadius: '8px', background: '#ffffff',
                      color: '#64748b', fontWeight: 700, fontSize: '12.5px', border: '1px solid #cbd5e1', cursor: 'pointer'
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmTeleLink} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: '#0369a1', background: '#e0f2fe', padding: '8px 10px', borderRadius: '6px' }}>
                  Nhập mã OTP 6 chữ số đã gửi về ứng dụng Telegram của bạn:
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="X X X X X X"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a',
                    fontSize: '16px', fontWeight: 800, letterSpacing: '4px', textAlign: 'center', outline: 'none', boxSizing: 'border-box'
                  }}
                  required
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setTeleStep(1)}
                    style={{
                      padding: '8px 12px', borderRadius: '8px', background: '#f1f5f9',
                      color: '#475569', fontWeight: 700, fontSize: '12px', border: '1px solid #cbd5e1', cursor: 'pointer'
                    }}
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={teleLoading}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: '8px', background: '#16a34a',
                      color: '#ffffff', fontWeight: 800, fontSize: '12.5px', border: 'none', cursor: teleLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {teleLoading ? 'Đang xử lý...' : 'Xác nhận liên kết'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* If Linked: 5 Recent Matches for Player */}
      {linkedPlayer && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Film size={16} style={{ color: '#dc2626' }} />
              5 Trận Đấu Gần Nhất Của Cầu Thủ
            </h4>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
              {recentMatches?.length || 0} trận
            </span>
          </div>

          {(!recentMatches || recentMatches.length === 0) ? (
            <div style={{ fontSize: '12.5px', color: '#64748b', textAlign: 'center', padding: '16px 0' }}>
              Chưa có dữ liệu trận đấu gần đây.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentMatches.map((m, idx) => (
                <div key={m.id || idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: m.result === 'win' ? '#dcfce7' : m.result === 'draw' ? '#f1f5f9' : '#fee2e2',
                      color: m.result === 'win' ? '#15803d' : m.result === 'draw' ? '#475569' : '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '11px',
                      flexShrink: 0
                    }}>
                      {m.result === 'win' ? 'W' : m.result === 'draw' ? 'D' : 'L'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.matchDate ? `Trận ${m.matchDate}` : `Trận đấu #${idx + 1}`} {m.matchTime ? `• ${m.matchTime}` : ''}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                        {m.teamName || 'Đội bóng'}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/match-video?match_id=${m.matchHistoryId}`}
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      color: '#ffffff',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(220, 38, 38, 0.2)'
                    }}
                  >
                    🍿 2nike
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
