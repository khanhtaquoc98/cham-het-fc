'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Sparkles,
  RotateCcw,
  ZoomIn,
  Move,
  Lock,
  Send,
  Check,
  Zap,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import FutCardPreview from './FutCardPreview';
import AltPositionsEditor from './AltPositionsEditor';
import CardAvatarUploader from './CardAvatarUploader';
import {
  CARD_TEMPLATES,
  PLAYSTYLES_PLUS,
  PlayerCardCustomState,
  calculateFutStatsFromPlayer,
  DEFAULT_PLAYER_AVATAR,
} from '@/lib/fut-card-config';

interface PlayerFutCardSectionProps {
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
    telegram_handle?: string | null;
  } | null;
  playerStats?: {
    wins: number;
    draws: number;
    losses: number;
    totalMatches: number;
    winRate: number;
  } | null;
  initialCardConfig?: PlayerCardCustomState | null;
}

export default function PlayerFutCardSection({
  user,
  linkedPlayer,
  playerStats,
  initialCardConfig,
}: PlayerFutCardSectionProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'position' | 'visuals'>('templates');
  const [templateFilter, setTemplateFilter] = useState<'all' | 'popular' | 'base' | 'icons_heroes' | 'special_promo'>('all');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-scroll to #fut-card-section when navigated via hash
  useEffect(() => {
    const scrollToSection = () => {
      if (typeof window !== 'undefined' && window.location.hash === '#fut-card-section') {
        const el = document.getElementById('fut-card-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    const timer = setTimeout(scrollToSection, 180);
    window.addEventListener('hashchange', scrollToSection);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('hashchange', scrollToSection);
    };
  }, []);

  // Compute player's real avatar URL from Supabase
  const filename = linkedPlayer?.jersey_number != null ? linkedPlayer.jersey_number : linkedPlayer?.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udlhudfxwuwbecjqvvhv.supabase.co';
  const versionParam = linkedPlayer?.avatar_version ? `?v=${linkedPlayer.avatar_version}` : '';
  const playerAvatarUrl = filename
    ? `${supabaseUrl}/storage/v1/object/public/players/${filename}.webp${versionParam}`
    : DEFAULT_PLAYER_AVATAR;

  const defaultBirthYear = initialCardConfig?.faceStats?.birthYear || 1998;
  const [birthYear, setBirthYear] = useState<number>(defaultBirthYear);

  // Calculate face stats from real database stats
  const calculated = useMemo(() => {
    return calculateFutStatsFromPlayer({
      name: linkedPlayer?.name || user.username,
      wins: playerStats?.wins ?? 0,
      draws: playerStats?.draws ?? 0,
      losses: playerStats?.losses ?? 0,
      totalMatches: playerStats?.totalMatches ?? 0,
      winRate: playerStats?.winRate ?? 0,
      isInjuryProne: Boolean(linkedPlayer?.is_injury_prone),
      birthYear: birthYear,
    });
  }, [linkedPlayer, user.username, playerStats, birthYear]);

  // Player's Custom Card State (Initialized with saved config if exists)
  const [cardState, setCardState] = useState<PlayerCardCustomState>(() => {
    if (initialCardConfig) {
      const isWrong10 =
        linkedPlayer?.jersey_number !== 10 &&
        !linkedPlayer?.name?.toUpperCase().includes('NGHĨA') &&
        (initialCardConfig.avatarUrl?.includes('/10.webp') || initialCardConfig.avatarUrl === '/player/10.webp');
      const finalAvatar = isWrong10 || !initialCardConfig.avatarUrl ? playerAvatarUrl : initialCardConfig.avatarUrl;

      const isDefaultAvatar = !finalAvatar || finalAvatar === DEFAULT_PLAYER_AVATAR || finalAvatar.includes('unknown.webp');
      const defaultJersey = linkedPlayer?.jersey_number != null && linkedPlayer.jersey_number !== 0 ? linkedPlayer.jersey_number : '?';
      return {
        ...initialCardConfig,
        avatarUrl: finalAvatar,
        playerName: (linkedPlayer?.name || user.username || initialCardConfig.playerName || 'CHẤM HẾT FC').toUpperCase(),
        jerseyNumber:
          initialCardConfig.jerseyNumber != null && initialCardConfig.jerseyNumber !== '' && initialCardConfig.jerseyNumber !== 0 && initialCardConfig.jerseyNumber !== '0'
            ? initialCardConfig.jerseyNumber
            : defaultJersey,
        isInjuryProne: Boolean(linkedPlayer?.is_injury_prone),
        scale: isDefaultAvatar && (initialCardConfig.scale === 1.05 || initialCardConfig.scale === 1.0 || !initialCardConfig.scale) ? 0.85 : (initialCardConfig.scale ?? (isDefaultAvatar ? 0.85 : 1.05)),
        offsetX: isDefaultAvatar && initialCardConfig.offsetX === 0 ? 6 : (initialCardConfig.offsetX ?? (isDefaultAvatar ? 6 : 0)),
        offsetY: isDefaultAvatar && initialCardConfig.offsetY === 0 ? 22 : (initialCardConfig.offsetY ?? (isDefaultAvatar ? 22 : 0)),
        altPositions: initialCardConfig.altPositions || ['CAM', 'LW'],
        showAltPositions: initialCardConfig.showAltPositions !== undefined ? initialCardConfig.showAltPositions : true,
        showPlayStyle: false,
        altPositionTextColor: initialCardConfig.altPositionTextColor || '#ffffff',
        altPositionBorderColor: initialCardConfig.altPositionBorderColor || '#ffffff',
        altPositionBgColor: initialCardConfig.altPositionBgColor || '#623B91',
        faceStats: {
          ...initialCardConfig.faceStats,
          no:
            initialCardConfig.faceStats?.no != null && initialCardConfig.faceStats?.no !== '' && initialCardConfig.faceStats?.no !== 0 && initialCardConfig.faceStats?.no !== '0'
              ? initialCardConfig.faceStats.no
              : defaultJersey,
          wr: calculated.faceStats.wr,
          w: calculated.faceStats.w,
          d: calculated.faceStats.d,
          l: calculated.faceStats.l,
          p: calculated.faceStats.p,
        },
      };
    }

    const isDefaultAvatar = !playerAvatarUrl || playerAvatarUrl === DEFAULT_PLAYER_AVATAR || playerAvatarUrl.includes('unknown.webp');
    const defaultJersey = linkedPlayer?.jersey_number != null && linkedPlayer.jersey_number !== 0 ? linkedPlayer.jersey_number : '?';
    return {
      templateId: 'toty',
      rating: calculated.rating,
      position: 'RW',
      roleIntensity: '++',
      altPositions: ['CAM', 'LW'],
      playerName: (linkedPlayer?.name || user.username || 'CHẤM HẾT FC').toUpperCase(),
      jerseyNumber: defaultJersey,
      isInjuryProne: Boolean(linkedPlayer?.is_injury_prone),
      avatarUrl: playerAvatarUrl,
      scale: isDefaultAvatar ? 0.85 : 1.05,
      offsetX: isDefaultAvatar ? 6 : 0,
      offsetY: isDefaultAvatar ? 22 : 0,
      faceStats: {
        ...calculated.faceStats,
        no: defaultJersey,
      },
      skills: 4,
      weakFoot: 4,
      preferredFoot: 'R',
      ratingScore: calculated.ratingScore,
      nationId: 'vietnam',
      clubId: 'cham_het',
      leagueId: 'cham_het_league',
      playStylePlusId: 'technical',
      showClub: false,
      showNation: true,
      showLeague: false,
      showStats: true,
      showPlayStyle: false,
      showAltPositions: true,
      altPositionTextColor: '#ffffff',
      altPositionBorderColor: '#ffffff',
      altPositionBgColor: '#623B91',
    };
  });

  // Save Card Config to DB
  const handleSaveCardConfig = async () => {
    if (!linkedPlayer) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/card-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: linkedPlayer.id,
          config: cardState,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Đã lưu cấu hình Thẻ cầu thủ thành công!');
      } else {
        toast.error(data.error || 'Lỗi khi lưu thẻ');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsSaving(false);
    }
  };

  // Update card stats when jersey number changes
  const handleJerseyNumberChange = (val: string | number) => {
    const raw = typeof val === 'string' ? val.trim() : String(val);
    let finalVal: string | number = '?';
    if (raw === '' || raw === '?' || raw === '0') {
      finalVal = '?';
    } else {
      const parsed = parseInt(raw, 10);
      finalVal = isNaN(parsed) ? '?' : Math.max(1, Math.min(99, parsed));
    }
    setCardState((prev) => ({
      ...prev,
      jerseyNumber: finalVal,
      faceStats: {
        ...prev.faceStats,
        no: finalVal,
      },
    }));
  };

  // Update card stats when birth year changes
  const handleBirthYearChange = (newYear: number) => {
    setBirthYear(newYear);
    const currentYear = new Date().getFullYear();
    const newYo = Math.max(15, currentYear - newYear);
    setCardState((prev) => ({
      ...prev,
      faceStats: {
        ...prev.faceStats,
        yo: newYo,
        birthYear: newYear,
      },
    }));
  };

  // Avatar move handler (dragging on card preview)
  const handleAvatarMove = (dx: number, dy: number) => {
    setCardState((prev) => ({
      ...prev,
      offsetX: Math.max(-140, Math.min(140, prev.offsetX + dx)),
      offsetY: Math.max(-140, Math.min(140, prev.offsetY + dy)),
    }));
  };


  // Filtered templates
  const filteredTemplates = useMemo(() => {
    if (templateFilter === 'all') return CARD_TEMPLATES;
    return CARD_TEMPLATES.filter((t) => t.category === templateFilter);
  }, [templateFilter]);

  const botName = process.env.NEXT_PUBLIC_TELEGRAM_LOGIN_BOT_NAME || 'chamhetweb_bot';

  // If user has NO linked player profile
  if (!linkedPlayer) {
    return (
      <div
        id="fut-card-section"
        style={{
          scrollMarginTop: '85px',
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
          borderRadius: '20px',
          border: '1px solid #fed7aa',
          padding: '28px 24px',
          color: '#9a3412',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#ffedd5',
            border: '2px solid #fed7aa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ea580c',
          }}
        >
          <Lock size={28} />
        </div>
        <div style={{ maxWidth: '540px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 900, margin: '0 0 6px 0', color: '#c2410c' }}>
            🃏 Thẻ Cầu Thủ EA FC 26 Dành Riêng Cho Cầu Thủ Đội Bóng
          </h3>
          <p style={{ fontSize: '13px', color: '#9a3412', lineHeight: 1.5, margin: 0 }}>
            Tài khoản của bạn hiện là <strong>Khán giả</strong> và chưa liên kết hồ sơ cầu thủ. Sau khi liên kết, thẻ cầu thủ EA FC 26 sẽ tự động khởi tạo với tên, số áo, ảnh đại diện và các chỉ số trận đấu thực tế của bạn!
          </p>
        </div>
        <a
          href="https://zalo.me/0934860931"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#0068ff',
            color: '#ffffff',
            padding: '9px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 800,
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(0, 104, 255, 0.28)',
            transition: 'all 0.15s ease',
          }}
        >
          <MessageSquare size={14} />
          Nhắn Zalo Admin Cấp Hồ Sơ (0934.860.931)
        </a>
      </div>
    );
  }

  // Logged-in player with linked profile: Full interactive FUT Card editor (Theme Light)
  return (
    <div
      id="fut-card-section"
      style={{
        scrollMarginTop: '85px',
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        color: '#0f172a',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Header Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
              color: '#ffffff',
            }}
          >
            <Sparkles size={18} />
          </span>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: '#0f172a' }}>
              Thẻ cầu thủ Của Tôi
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Tự động khởi tạo từ ảnh và chỉ số trận đấu thực tế trong cơ sở dữ liệu
            </p>
          </div>
        </div>

        {/* Action Buttons: Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSaveCardConfig}
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#16a34a',
              border: 'none',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Check size={14} />
            {isSaving ? 'Đang lưu...' : 'Lưu Thẻ Của Tôi'}
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Preview (3D Card) + Right Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* ── LEFT COLUMN: 3D CARD PREVIEW ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '16px',
            padding: '24px 16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <FutCardPreview
            state={cardState}
            onAvatarMove={handleAvatarMove}
          />

          <div
            style={{
              fontSize: '11.5px',
              color: '#64748b',
              marginTop: '16px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Move size={12} />
            Kéo chuột / chạm trên ảnh cầu thủ để dịch chuyển vị trí
          </div>
        </div>

        {/* ── RIGHT COLUMN: CUSTOMIZATION CONTROLS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Sub Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              style={{
                flex: '1 0 auto',
                minWidth: 'max-content',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'templates' ? '#ef4444' : 'transparent',
                color: activeTab === 'templates' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'templates' ? '0 2px 6px rgba(239, 68, 68, 0.25)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              🎨 Mẫu Thẻ ({CARD_TEMPLATES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('position')}
              style={{
                flex: '1 0 auto',
                minWidth: 'max-content',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'position' ? '#ef4444' : 'transparent',
                color: activeTab === 'position' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'position' ? '0 2px 6px rgba(239, 68, 68, 0.25)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              ⚡ Vị Trí & Số Áo (No.)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('visuals')}
              style={{
                flex: '1 0 auto',
                minWidth: 'max-content',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'visuals' ? '#ef4444' : 'transparent',
                color: activeTab === 'visuals' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'visuals' ? '0 2px 6px rgba(239, 68, 68, 0.25)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              🔍 Căn Chỉnh Ảnh
            </button>
          </div>

          {/* TAB 1: TEMPLATES SELECTOR */}
          {activeTab === 'templates' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#f8fafc',
                borderRadius: '14px',
                padding: '16px',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'Tất Cả' },
                  { id: 'popular', label: '🔥 Hot Promo' },
                  { id: 'icons_heroes', label: '⭐ Icons & Heroes' },
                  { id: 'base', label: '🏅 Thường (Gold/Silver)' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTemplateFilter(cat.id as any)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: templateFilter === cat.id ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                      background: templateFilter === cat.id ? '#fee2e2' : '#ffffff',
                      color: templateFilter === cat.id ? '#dc2626' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Template Grid (Scrollable) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '10px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {filteredTemplates.map((tmpl) => {
                  const isSelected = cardState.templateId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setCardState((prev) => ({ ...prev, templateId: tmpl.id }))}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 6px',
                        borderRadius: '12px',
                        background: isSelected ? '#fef2f2' : '#ffffff',
                        border: isSelected ? '2px solid #ef4444' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '68px',
                          position: 'relative',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={tmpl.src}
                          alt={tmpl.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: isSelected ? '#dc2626' : '#1e293b',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '90px',
                        }}
                      >
                        {tmpl.name}
                      </span>
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={10} color="#ffffff" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: POSITION, BIRTH YEAR & PLAYSTYLE */}
          {activeTab === 'position' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                background: '#f8fafc',
                borderRadius: '14px',
                padding: '16px',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Position selector */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '8px' }}>
                  VỊ TRÍ THI ĐẤU
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['RW', 'ST', 'CAM', 'CM', 'LW', 'CF', 'CB', 'LB', 'RB', 'CDM', 'GK'].map((pos) => {
                    const isSelected = cardState.position === pos;
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setCardState((prev) => ({ ...prev, position: pos }))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 800,
                          background: isSelected ? '#ef4444' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#334155',
                          border: isSelected ? '1px solid #ef4444' : '1px solid #cbd5e1',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {pos}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role Intensity */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '8px' }}>
                  CẤP ĐỘ VAI TRÒ (ROLE INTENSITY)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: '', label: 'Cơ bản (Không hiển thị)' },
                    { id: '+', label: '+ (Role+)' },
                    { id: '++', label: '++ (Role++)' },
                  ].map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setCardState((prev) => ({ ...prev, roleIntensity: role.id as any }))}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 800,
                        background: cardState.roleIntensity === role.id ? '#fee2e2' : '#ffffff',
                        border: cardState.roleIntensity === role.id ? '1px solid #ef4444' : '1px solid #cbd5e1',
                        color: cardState.roleIntensity === role.id ? '#dc2626' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jersey Number (No. stat on card) */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>👕</span>
                    Số Áo Thi Đấu (Chỉ số No. trên thẻ)
                  </label>
                  <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 800 }}>
                    Số áo: #{cardState.jerseyNumber || cardState.faceStats.no || '?'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="?"
                    value={
                      cardState.jerseyNumber === '?' ||
                      cardState.jerseyNumber === '' ||
                      cardState.jerseyNumber == null ||
                      cardState.jerseyNumber === 0 ||
                      cardState.jerseyNumber === '0'
                        ? '?'
                        : cardState.jerseyNumber
                    }
                    onChange={(e) => handleJerseyNumberChange(e.target.value)}
                    title="Nhập số áo (1-99) hoặc để ? nếu không có số áo"
                    style={{
                      width: '90px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '14px',
                      fontWeight: 900,
                      outline: 'none',
                      textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.4 }}>
                    Chỉ số <strong>No.</strong> hiển thị số áo thi đấu của bạn trực tiếp trên Thẻ cầu thủ.
                  </span>
                </div>
              </div>

              {/* Alt Positions (Vị trí phụ) & 3-Color Customization */}
              <AltPositionsEditor
                cardState={cardState}
                onChange={(updater) => setCardState((prev) => updater(prev))}
              />
            </div>
          )}

          {/* TAB 3: AVATAR VISUAL TUNING */}
          {activeTab === 'visuals' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                background: '#f8fafc',
                borderRadius: '14px',
                padding: '16px',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Avatar Upload with only PNG & remove.bg guide */}
              <CardAvatarUploader
                currentAvatarUrl={cardState.avatarUrl}
                playerName={cardState.playerName}
                playerId={linkedPlayer?.id}
                jerseyNumber={cardState.jerseyNumber}
                onAvatarUploaded={(newUrl) => {
                  setCardState((prev) => ({
                    ...prev,
                    avatarUrl: newUrl,
                    scale: 1.05,
                    offsetX: 0,
                    offsetY: 0,
                  }));
                }}
                onResetDefault={() => {
                  setCardState((prev) => ({
                    ...prev,
                    avatarUrl: DEFAULT_PLAYER_AVATAR,
                    scale: 0.85,
                    offsetX: 6,
                    offsetY: 22,
                  }));
                }}
              />

              {/* Scale / Zoom */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ZoomIn size={14} color="#ef4444" />
                    Độ Phóng To Ảnh (Zoom)
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444' }}>
                    {cardState.scale.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="2.0"
                  step="0.05"
                  value={cardState.scale}
                  onChange={(e) => setCardState((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))}
                  style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
                />
              </div>

              {/* Pan Horizontal (X) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Move size={14} color="#0284c7" />
                    Vị Trí Ngang (Trục X)
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7' }}>
                    {cardState.offsetX}px
                  </span>
                </div>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="2"
                  value={cardState.offsetX}
                  onChange={(e) => setCardState((prev) => ({ ...prev, offsetX: parseInt(e.target.value, 10) }))}
                  style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
                />
              </div>

              {/* Pan Vertical (Y) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Move size={14} color="#0284c7" />
                    Vị Trí Dọc (Trục Y)
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7' }}>
                    {cardState.offsetY}px
                  </span>
                </div>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="2"
                  value={cardState.offsetY}
                  onChange={(e) => setCardState((prev) => ({ ...prev, offsetY: parseInt(e.target.value, 10) }))}
                  style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
                />
              </div>

              {/* Reset Avatar Position */}
              <button
                type="button"
                onClick={() =>
                  setCardState((prev) => {
                    const isDefault =
                      !prev.avatarUrl ||
                      prev.avatarUrl === DEFAULT_PLAYER_AVATAR ||
                      prev.avatarUrl.includes('unknown.webp');
                    return {
                      ...prev,
                      scale: isDefault ? 0.85 : 1.05,
                      offsetX: isDefault ? 6 : 0,
                      offsetY: isDefault ? 22 : 0,
                    };
                  })
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} />
                Đặt lại vị trí ảnh ban đầu
              </button>
            </div>
          )}

          {/* Database stats summary pill info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '11.5px',
              color: '#64748b',
            }}
          >
            <span>
              ⚡ Dữ liệu trận đấu: <strong style={{ color: '#0f172a' }}>{cardState.faceStats.wr}% WR</strong> ({cardState.faceStats.w} Thắng - {cardState.faceStats.d} Hòa - {cardState.faceStats.l} Thua)
            </span>
            <span style={{ color: '#16a34a', fontWeight: 800 }}>
              Tổng: {cardState.faceStats.p} Trận
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
