'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Sparkles,
  RotateCcw,
  ZoomIn,
  Move,
  Check,
  Zap,
  Calendar,
  X,
  Shield,
} from 'lucide-react';
import FutCardPreview from '@/components/FutCardPreview';
import AltPositionsEditor from '@/components/AltPositionsEditor';
import PlayerStatsEditor from '@/components/PlayerStatsEditor';
import CardAvatarUploader from '@/components/CardAvatarUploader';
import {
  CARD_TEMPLATES,
  PLAYSTYLES_PLUS,
  PlayerCardCustomState,
  calculateFutStatsFromPlayer,
  DEFAULT_PLAYER_AVATAR,
} from '@/lib/fut-card-config';

export interface AdminPlayerCardModalProps {
  player: {
    id: string;
    name: string;
    jerseyNumber?: number | null;
    isInjuryProne?: boolean | null;
    avatarVersion?: string | number | null;
    wins?: number;
    draws?: number;
    losses?: number;
  };
  onClose: () => void;
  onSaved?: (config: PlayerCardCustomState) => void;
}

export default function AdminPlayerCardModal({
  player,
  onClose,
  onSaved,
}: AdminPlayerCardModalProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'stats' | 'position' | 'visuals'>('templates');
  const [templateFilter, setTemplateFilter] = useState<'all' | 'popular' | 'base' | 'icons_heroes' | 'special_promo'>('all');

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [birthYear, setBirthYear] = useState<number>(1998);
  const [cardState, setCardState] = useState<PlayerCardCustomState | null>(null);

  // Compute avatar URL
  const filename = player.jerseyNumber != null ? player.jerseyNumber : player.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udlhudfxwuwbecjqvvhv.supabase.co';
  const versionParam = player.avatarVersion ? `?v=${player.avatarVersion}` : '';
  const playerAvatarUrl = filename
    ? `${supabaseUrl}/storage/v1/object/public/players/${filename}.webp${versionParam}`
    : DEFAULT_PLAYER_AVATAR;

  // Real stats
  const wins = player.wins ?? 0;
  const draws = player.draws ?? 0;
  const losses = player.losses ?? 0;
  const totalMatches = wins + draws + losses;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  // Auto-calculated stats
  const calculated = useMemo(() => {
    return calculateFutStatsFromPlayer({
      name: player.name,
      wins,
      draws,
      losses,
      totalMatches,
      winRate,
      isInjuryProne: Boolean(player.isInjuryProne),
      birthYear,
    });
  }, [player.name, wins, draws, losses, totalMatches, winRate, player.isInjuryProne, birthYear]);

  // Load existing config from DB or initialize
  const loadConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch(`/api/card-config?playerId=${player.id}`);
      const data = await res.json();
      const saved: PlayerCardCustomState | null = data.config || null;

      const initialBirthYear = saved?.faceStats?.birthYear || 1998;
      setBirthYear(initialBirthYear);

      const initCalculated = calculateFutStatsFromPlayer({
        name: player.name,
        wins,
        draws,
        losses,
        totalMatches,
        winRate,
        isInjuryProne: Boolean(player.isInjuryProne),
        birthYear: initialBirthYear,
      });

      if (saved) {
        const isWrong10 =
          player.jerseyNumber !== 10 &&
          !player.name.toUpperCase().includes('NGHĨA') &&
          (saved.avatarUrl?.includes('/10.webp') || saved.avatarUrl === '/player/10.webp');
        const effectiveAvatar = isWrong10 || !saved.avatarUrl ? playerAvatarUrl : saved.avatarUrl;
        const isDefaultAvatar = !effectiveAvatar || effectiveAvatar === DEFAULT_PLAYER_AVATAR || effectiveAvatar.includes('unknown.webp');
        setCardState({
          ...saved,
          avatarUrl: effectiveAvatar,
          playerName: saved.playerName || player.name.toUpperCase(),
          rating: saved.rating ?? initCalculated.rating,
          jerseyNumber:
            player.jerseyNumber != null && player.jerseyNumber !== 0
              ? player.jerseyNumber
              : '?',
          isInjuryProne: saved.isInjuryProne !== undefined ? saved.isInjuryProne : Boolean(player.isInjuryProne),
          scale: isDefaultAvatar && (saved.scale === 1.05 || saved.scale === 1.0 || !saved.scale) ? 0.85 : (saved.scale ?? (isDefaultAvatar ? 0.85 : 1.05)),
          offsetX: isDefaultAvatar && saved.offsetX === 0 ? 6 : (saved.offsetX ?? (isDefaultAvatar ? 6 : 0)),
          offsetY: isDefaultAvatar && saved.offsetY === 0 ? 22 : (saved.offsetY ?? (isDefaultAvatar ? 22 : 0)),
          altPositions: saved.altPositions || (player.jerseyNumber === 1 ? [] : ['CAM', 'LW']),
          showAltPositions: saved.showAltPositions !== undefined ? saved.showAltPositions : true,
          showPlayStyle: false,
          altPositionTextColor: saved.altPositionTextColor || '#ffffff',
          altPositionBorderColor: saved.altPositionBorderColor || '#ffffff',
          altPositionBgColor: saved.altPositionBgColor || '#623B91',
          faceStats: {
            ...saved.faceStats,
            wr: initCalculated.faceStats.wr,
            w: initCalculated.faceStats.w,
            d: initCalculated.faceStats.d,
            l: initCalculated.faceStats.l,
            p: initCalculated.faceStats.p,
            no:
              player.jerseyNumber != null && player.jerseyNumber !== 0
                ? player.jerseyNumber
                : '?',
            birthYear: saved.faceStats?.birthYear ?? initialBirthYear,
            yo: initCalculated.faceStats.yo,
          },
          skills: saved.skills ?? 4,
          weakFoot: saved.weakFoot ?? 4,
          preferredFoot: saved.preferredFoot ?? 'R',
          showStats: saved.showStats !== undefined ? saved.showStats : true,
          showNation: saved.showNation !== undefined ? saved.showNation : true,
        });
      } else {
        const isDefaultAvatar = !playerAvatarUrl || playerAvatarUrl === DEFAULT_PLAYER_AVATAR || playerAvatarUrl.includes('unknown.webp');
        const defaultJersey = player.jerseyNumber != null && player.jerseyNumber !== 0 ? player.jerseyNumber : '?';
        setCardState({
          templateId: 'toty',
          rating: initCalculated.rating,
          position: player.jerseyNumber === 1 ? 'GK' : 'RW',
          roleIntensity: '++',
          altPositions: player.jerseyNumber === 1 ? [] : ['CAM', 'LW'],
          playerName: player.name.toUpperCase(),
          jerseyNumber: defaultJersey,
          isInjuryProne: Boolean(player.isInjuryProne),
          avatarUrl: playerAvatarUrl,
          scale: isDefaultAvatar ? 0.85 : 1.05,
          offsetX: isDefaultAvatar ? 6 : 0,
          offsetY: isDefaultAvatar ? 22 : 0,
          faceStats: {
            ...initCalculated.faceStats,
            no: defaultJersey,
          },
          skills: 4,
          weakFoot: 4,
          preferredFoot: 'R',
          ratingScore: initCalculated.ratingScore,
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
        });
      }
    } catch (err) {
      console.error('Failed to load card config:', err);
    } finally {
      setLoadingConfig(false);
    }
  }, [player, wins, draws, losses, totalMatches, winRate, playerAvatarUrl]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Handle Jersey Number change
  const handleJerseyNumberChange = (val: string | number) => {
    const raw = typeof val === 'string' ? val.trim() : String(val);
    let finalVal: string | number = '?';
    if (raw === '' || raw === '?' || raw === '0') {
      finalVal = '?';
    } else {
      const parsed = parseInt(raw, 10);
      finalVal = isNaN(parsed) ? '?' : Math.max(1, Math.min(99, parsed));
    }
    setCardState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        jerseyNumber: finalVal,
        faceStats: {
          ...prev.faceStats,
          no: finalVal,
        },
      };
    });
  };

  // Handle Birth Year change
  const handleBirthYearChange = (newYear: number) => {
    setBirthYear(newYear);
    const currentYear = new Date().getFullYear();
    const newYo = Math.max(15, currentYear - newYear);
    setCardState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        faceStats: {
          ...prev.faceStats,
          yo: newYo,
          birthYear: newYear,
        },
      };
    });
  };

  // Recalculate stats from real match database
  const handleRecalculateStats = () => {
    const currentBirthYear = cardState?.faceStats?.birthYear || birthYear || 1998;
    const calc = calculateFutStatsFromPlayer({
      name: player.name,
      wins,
      draws,
      losses,
      totalMatches,
      winRate,
      isInjuryProne: Boolean(player.isInjuryProne),
      birthYear: currentBirthYear,
    });
    setCardState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        rating: calc.rating,
        faceStats: {
          ...prev.faceStats,
          wr: calc.faceStats.wr,
          w: calc.faceStats.w,
          d: calc.faceStats.d,
          l: calc.faceStats.l,
          p: calc.faceStats.p,
          yo: calc.faceStats.yo,
        },
      };
    });
    toast.success('Đã cập nhật lại chỉ số theo thống kê trận đấu thực tế!');
  };

  // Avatar move handler
  const handleAvatarMove = (dx: number, dy: number) => {
    setCardState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        offsetX: Math.max(-140, Math.min(140, prev.offsetX + dx)),
        offsetY: Math.max(-140, Math.min(140, prev.offsetY + dy)),
      };
    });
  };

  // Save Card to DB
  const handleSave = async () => {
    if (!cardState) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/card-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-request': 'true',
        },
        body: JSON.stringify({
          playerId: player.id,
          config: cardState,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Đã lưu cấu hình thẻ cho cầu thủ ${player.name}!`);
        if (onSaved) onSaved(cardState);
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

  // Reset to default calculated state
  const handleReset = () => {
    const defaultYear = 1998;
    setBirthYear(defaultYear);
    setCardState({
      templateId: 'toty',
      rating: calculated.rating,
      position: player.jerseyNumber === 1 ? 'GK' : 'RW',
      roleIntensity: '++',
      altPositions: player.jerseyNumber === 1 ? [] : ['CAM', 'LW'],
      playerName: player.name.toUpperCase(),
      jerseyNumber: player.jerseyNumber ?? 10,
      isInjuryProne: Boolean(player.isInjuryProne),
      avatarUrl: playerAvatarUrl,
      scale: (!playerAvatarUrl || playerAvatarUrl === DEFAULT_PLAYER_AVATAR || playerAvatarUrl.includes('unknown.webp')) ? 0.85 : 1.05,
      offsetX: (!playerAvatarUrl || playerAvatarUrl === DEFAULT_PLAYER_AVATAR || playerAvatarUrl.includes('unknown.webp')) ? 6 : 0,
      offsetY: (!playerAvatarUrl || playerAvatarUrl === DEFAULT_PLAYER_AVATAR || playerAvatarUrl.includes('unknown.webp')) ? 22 : 0,
      faceStats: calculated.faceStats,
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
    });
    toast.success('Đã khôi phục cài đặt thẻ mặc định!');
  };


  // Filtered templates
  const filteredTemplates = useMemo(() => {
    if (templateFilter === 'all') return CARD_TEMPLATES;
    return CARD_TEMPLATES.filter((t) => t.category === templateFilter);
  }, [templateFilter]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── MODAL HEADER ── */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #8e0000 0%, #c62828 50%, #e53935 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <img
                src={playerAvatarUrl}
                alt={player.name}
                style={{ width: '100%', height: '100%', objectFit: 'scale-down' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=ffffff&bold=true`;
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, letterSpacing: '0.5px' }}>
                  Thẻ cầu thủ: {player.name}
                </h2>
                {player.jerseyNumber != null && (
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.25)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    #{player.jerseyNumber}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '12px', opacity: 0.9, margin: '2px 0 0 0' }}>
                Dữ liệu trận đấu: <strong>{winRate}% WR</strong> ({wins} Thắng - {draws} Hòa - {losses} Thua, Tổng {totalMatches} trận)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── MODAL BODY (Scrollable) ── */}
        <div className="admin-card-modal-content" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loadingConfig || !cardState ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
              <p style={{ fontSize: '14px', fontWeight: 700 }}>Đang tải cấu hình thẻ...</p>
            </div>
          ) : (
            <div
              className="admin-card-studio"
              style={{
                alignItems: 'start',
              }}
            >
              {/* ── LEFT: 3D CARD PREVIEW ── */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '16px',
                  padding: '20px 14px',
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
                    marginTop: '14px',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Move size={12} />
                  Kéo chuột trực tiếp trên thẻ để chỉnh vị trí ảnh cầu thủ
                </div>
              </div>

              {/* ── RIGHT: STUDIO CONTROLS ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Tabs */}
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
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: activeTab === 'templates' ? '#ef4444' : 'transparent',
                      color: activeTab === 'templates' ? '#ffffff' : '#475569',
                      fontWeight: 800,
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: activeTab === 'templates' ? '0 2px 6px rgba(239, 68, 68, 0.25)' : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🎨 Mẫu Thẻ
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('stats')}
                    style={{
                      flex: '1 0 auto',
                      minWidth: 'max-content',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: activeTab === 'stats' ? '#ef4444' : 'transparent',
                      color: activeTab === 'stats' ? '#ffffff' : '#475569',
                      fontWeight: 800,
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: activeTab === 'stats' ? '0 2px 6px rgba(239, 68, 68, 0.25)' : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    📊 Chỉ Số Cầu Thủ
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('position')}
                    style={{
                      flex: '1 0 auto',
                      minWidth: 'max-content',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: activeTab === 'position' ? '#ef4444' : 'transparent',
                      color: activeTab === 'position' ? '#ffffff' : '#475569',
                      fontWeight: 800,
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: activeTab === 'position' ? '0 2px 6px rgba(239, 68, 68, 0.25)' : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ⚡ Vị Trí & Alt Pos
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('visuals')}
                    style={{
                      flex: '1 0 auto',
                      minWidth: 'max-content',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: activeTab === 'visuals' ? '#ef4444' : 'transparent',
                      color: activeTab === 'visuals' ? '#ffffff' : '#475569',
                      fontWeight: 800,
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: activeTab === 'visuals' ? '0 2px 6px rgba(239, 68, 68, 0.25)' : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🔍 Căn Chỉnh Ảnh
                  </button>
                </div>

                {/* TAB 1: TEMPLATES */}
                {activeTab === 'templates' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '14px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {/* Category Filter Pills */}
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'all', label: 'Tất Cả' },
                        { id: 'popular', label: '🔥 Hot Promo' },
                        { id: 'icons_heroes', label: '⭐ Icons & Heroes' },
                        { id: 'base', label: '🏅 Thường' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setTemplateFilter(cat.id as any)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: templateFilter === cat.id ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                            background: templateFilter === cat.id ? '#fee2e2' : '#ffffff',
                            color: templateFilter === cat.id ? '#dc2626' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Template Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
                        gap: '8px',
                        maxHeight: '290px',
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
                            onClick={() => setCardState((prev) => (prev ? { ...prev, templateId: tmpl.id } : null))}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 4px',
                              borderRadius: '10px',
                              background: isSelected ? '#fef2f2' : '#ffffff',
                              border: isSelected ? '2px solid #ef4444' : '1px solid #e2e8f0',
                              cursor: 'pointer',
                              position: 'relative',
                            }}
                          >
                            <div style={{ width: '42px', height: '60px', position: 'relative' }}>
                              <img
                                src={tmpl.src}
                                alt={tmpl.name}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: isSelected ? '#dc2626' : '#1e293b',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '80px',
                              }}
                            >
                              {tmpl.name}
                            </span>
                            {isSelected && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '3px',
                                  right: '3px',
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  background: '#ef4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Check size={9} color="#ffffff" strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB: PLAYER STATS EDITOR */}
                {activeTab === 'stats' && cardState && (
                  <PlayerStatsEditor
                    cardState={cardState}
                    onChange={(updater) => setCardState((prev) => (prev ? updater(prev) : null))}
                    onRecalculateAuto={handleRecalculateStats}
                  />
                )}

                {/* TAB 3: POSITION & ALT POS */}
                {activeTab === 'position' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '14px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {/* Position */}
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>
                        VỊ TRÍ THI ĐẤU
                      </label>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {['RW', 'ST', 'CAM', 'CM', 'LW', 'CF', 'CB', 'LB', 'RB', 'CDM', 'GK'].map((pos) => {
                          const isSelected = cardState.position === pos;
                          return (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setCardState((prev) => (prev ? { ...prev, position: pos } : null))}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 800,
                                background: isSelected ? '#ef4444' : '#ffffff',
                                color: isSelected ? '#ffffff' : '#334155',
                                border: isSelected ? '1px solid #ef4444' : '1px solid #cbd5e1',
                                cursor: 'pointer',
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
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>
                        CẤP ĐỘ VAI TRÒ (ROLE INTENSITY)
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { id: '', label: 'Cơ bản' },
                          { id: '+', label: '+ (Role+)' },
                          { id: '++', label: '++ (Role++)' },
                        ].map((role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => setCardState((prev) => (prev ? { ...prev, roleIntensity: role.id as any } : null))}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
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
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '13px' }}>👕</span>
                          Số Áo Thi Đấu (Chỉ số No.)
                        </label>
                        <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 800 }}>
                          Số áo: #{cardState.jerseyNumber || cardState.faceStats.no || '?'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                            width: '80px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '13px',
                            fontWeight: 900,
                            outline: 'none',
                            textAlign: 'center',
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Chỉ số <strong>No.</strong> hiển thị số áo trên thẻ
                        </span>
                      </div>
                    </div>

                    {/* Alt Positions (Vị trí phụ) & 3-Color Customization */}
                    <AltPositionsEditor
                      cardState={cardState}
                      onChange={(updater) => setCardState((prev) => (prev ? updater(prev) : null))}
                    />
                  </div>
                )}

                {/* TAB 3: VISUALS */}
                {activeTab === 'visuals' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '14px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {/* Avatar Upload with only PNG & remove.bg guide */}
                    <CardAvatarUploader
                      currentAvatarUrl={cardState.avatarUrl}
                      playerName={cardState.playerName}
                      playerId={player.id}
                      jerseyNumber={cardState.jerseyNumber}
                      onAvatarUploaded={(newUrl) => {
                        setCardState((prev) => (prev ? {
                          ...prev,
                          avatarUrl: newUrl,
                          scale: 1.05,
                          offsetX: 0,
                          offsetY: 0,
                        } : null));
                      }}
                      onResetDefault={() => {
                        setCardState((prev) => (prev ? {
                          ...prev,
                          avatarUrl: DEFAULT_PLAYER_AVATAR,
                          scale: 0.85,
                          offsetX: 6,
                          offsetY: 22,
                        } : null));
                      }}
                    />

                    {/* Zoom */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <ZoomIn size={13} color="#ef4444" />
                          Độ Phóng To (Zoom)
                        </label>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#ef4444' }}>
                          {cardState.scale.toFixed(2)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.6"
                        max="2.0"
                        step="0.05"
                        value={cardState.scale}
                        onChange={(e) => setCardState((prev) => (prev ? { ...prev, scale: parseFloat(e.target.value) } : null))}
                        style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Pan X */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Move size={13} color="#0284c7" />
                          Vị Trí Ngang (Trục X)
                        </label>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0284c7' }}>
                          {cardState.offsetX}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-120"
                        max="120"
                        step="2"
                        value={cardState.offsetX}
                        onChange={(e) => setCardState((prev) => (prev ? { ...prev, offsetX: parseInt(e.target.value, 10) } : null))}
                        style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Pan Y */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Move size={13} color="#0284c7" />
                          Vị Trí Dọc (Trục Y)
                        </label>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0284c7' }}>
                          {cardState.offsetY}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-120"
                        max="120"
                        step="2"
                        value={cardState.offsetY}
                        onChange={(e) => setCardState((prev) => (prev ? { ...prev, offsetY: parseInt(e.target.value, 10) } : null))}
                        style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setCardState((prev) => {
                          if (!prev) return null;
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
                        gap: '5px',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={12} />
                      Đặt lại vị trí ảnh
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── MODAL FOOTER BAR ── */}
        <div
          style={{
            padding: '14px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} />
              Mặc định
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#16a34a',
                border: 'none',
                color: '#ffffff',
                padding: '8px 20px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
              }}
            >
              <Check size={14} />
              {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình Thẻ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
