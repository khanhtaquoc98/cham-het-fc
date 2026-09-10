'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  Sparkles,
  RotateCcw,
  ZoomIn,
  Move,
  Check,
  Zap,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Sliders,
  ExternalLink,
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
import { PlayerConfig } from '@/types/player';

interface StatsSummary {
  playerName: string;
  playerId: string | null;
  wins: number;
  losses: number;
  draws: number;
  totalMatches: number;
  winRate: number;
}

function AdminCardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [players, setPlayers] = useState<PlayerConfig[]>([]);
  const [statsMap, setStatsMap] = useState<Map<string, StatsSummary>>(new Map());
  const [configsMap, setConfigsMap] = useState<Record<string, PlayerCardCustomState>>({});
  const [loading, setLoading] = useState(true);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'templates' | 'stats' | 'position' | 'visuals'>('templates');
  const [templateFilter, setTemplateFilter] = useState<'all' | 'popular' | 'base' | 'icons_heroes' | 'special_promo'>('all');

  const [cardState, setCardState] = useState<PlayerCardCustomState | null>(null);
  const [birthYear, setBirthYear] = useState<number>(1998);

  const [isSaving, setIsSaving] = useState(false);

  // Fetch all players, stats, and card configs
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [playersRes, statsRes, configsRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/stats'),
        fetch('/api/card-config'),
      ]);

      const playersData: PlayerConfig[] = await playersRes.json();
      const statsData: { players: StatsSummary[] } = await statsRes.json();
      const configsData = await configsRes.json();

      const sMap = new Map<string, StatsSummary>();
      for (const s of statsData.players || []) {
        if (s.playerId) sMap.set(s.playerId, s);
        if (s.playerName) sMap.set(s.playerName.trim().toLowerCase(), s);
      }
      setStatsMap(sMap);
      setPlayers(playersData || []);

      const cfgMap: Record<string, PlayerCardCustomState> = configsData.configs || {};
      setConfigsMap(cfgMap);

      // Select initial player (either from URL param or first player)
      const paramId = searchParams.get('playerId');
      const initialPlayer = paramId
        ? playersData.find((p) => p.id === paramId) || playersData[0]
        : playersData[0];

      if (initialPlayer) {
        setSelectedPlayerId(initialPlayer.id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải dữ liệu cầu thủ');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Currently selected player
  const selectedPlayer = useMemo(() => {
    return players.find((p) => p.id === selectedPlayerId) || null;
  }, [players, selectedPlayerId]);

  // Selected player stats
  const selectedStats = useMemo(() => {
    if (!selectedPlayer) return null;
    return statsMap.get(selectedPlayer.id) || statsMap.get(selectedPlayer.name.trim().toLowerCase()) || null;
  }, [selectedPlayer, statsMap]);

  // Selected player avatar URL
  const selectedAvatarUrl = useMemo(() => {
    if (!selectedPlayer) return DEFAULT_PLAYER_AVATAR;
    const filename = selectedPlayer.jerseyNumber != null ? selectedPlayer.jerseyNumber : selectedPlayer.id;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udlhudfxwuwbecjqvvhv.supabase.co';
    const versionParam = selectedPlayer.avatarVersion ? `?v=${selectedPlayer.avatarVersion}` : '';
    return filename
      ? `${supabaseUrl}/storage/v1/object/public/players/${filename}.webp${versionParam}`
      : DEFAULT_PLAYER_AVATAR;
  }, [selectedPlayer]);

  // Initialize card state when selected player changes
  useEffect(() => {
    if (!selectedPlayer) return;

    const savedConfig = configsMap[selectedPlayer.id];
    const initialBirthYear = savedConfig?.faceStats?.birthYear || 1998;
    setBirthYear(initialBirthYear);

    const calculated = calculateFutStatsFromPlayer({
      name: selectedPlayer.name,
      wins: selectedStats?.wins ?? 0,
      draws: selectedStats?.draws ?? 0,
      losses: selectedStats?.losses ?? 0,
      totalMatches: selectedStats?.totalMatches ?? 0,
      winRate: selectedStats?.winRate ?? 0,
      isInjuryProne: Boolean(selectedPlayer.isInjuryProne),
      birthYear: initialBirthYear,
    });

    if (savedConfig) {
      const isWrong10 =
        selectedPlayer.jerseyNumber !== 10 &&
        !selectedPlayer.name.toUpperCase().includes('NGHĨA') &&
        (savedConfig.avatarUrl?.includes('/10.webp') || savedConfig.avatarUrl === '/player/10.webp');
      const finalAvatar = isWrong10 || !savedConfig.avatarUrl ? selectedAvatarUrl : savedConfig.avatarUrl;
      const isDefaultAvatar = !finalAvatar || finalAvatar === DEFAULT_PLAYER_AVATAR || finalAvatar.includes('unknown.webp');

      setCardState({
        ...savedConfig,
        avatarUrl: finalAvatar,
        playerName: savedConfig.playerName || selectedPlayer.name.toUpperCase(),
        rating: savedConfig.rating ?? calculated.rating,
        jerseyNumber:
          selectedPlayer.jerseyNumber != null && selectedPlayer.jerseyNumber !== 0
            ? selectedPlayer.jerseyNumber
            : '?',
        isInjuryProne: savedConfig.isInjuryProne !== undefined ? savedConfig.isInjuryProne : Boolean(selectedPlayer.isInjuryProne),
        scale: isDefaultAvatar && (savedConfig.scale === 1.05 || savedConfig.scale === 1.0 || !savedConfig.scale) ? 0.85 : (savedConfig.scale ?? (isDefaultAvatar ? 0.85 : 1.05)),
        offsetX: isDefaultAvatar && savedConfig.offsetX === 0 ? 6 : (savedConfig.offsetX ?? (isDefaultAvatar ? 6 : 0)),
        offsetY: isDefaultAvatar && savedConfig.offsetY === 0 ? 22 : (savedConfig.offsetY ?? (isDefaultAvatar ? 22 : 0)),
        altPositions: savedConfig.altPositions || (selectedPlayer.jerseyNumber === 1 ? [] : ['CAM', 'LW']),
        showAltPositions: savedConfig.showAltPositions !== undefined ? savedConfig.showAltPositions : true,
        showPlayStyle: false,
        altPositionTextColor: savedConfig.altPositionTextColor || '#ffffff',
        altPositionBorderColor: savedConfig.altPositionBorderColor || '#ffffff',
        altPositionBgColor: savedConfig.altPositionBgColor || '#623B91',
        faceStats: {
          ...savedConfig.faceStats,
          wr: calculated.faceStats.wr,
          w: calculated.faceStats.w,
          d: calculated.faceStats.d,
          l: calculated.faceStats.l,
          p: calculated.faceStats.p,
          no:
            selectedPlayer.jerseyNumber != null && selectedPlayer.jerseyNumber !== 0
              ? selectedPlayer.jerseyNumber
              : '?',
          birthYear: savedConfig.faceStats?.birthYear ?? initialBirthYear,
          yo: calculated.faceStats.yo,
        },
        skills: savedConfig.skills ?? 4,
        weakFoot: savedConfig.weakFoot ?? 4,
        preferredFoot: savedConfig.preferredFoot ?? 'R',
        showStats: savedConfig.showStats !== undefined ? savedConfig.showStats : true,
        showNation: savedConfig.showNation !== undefined ? savedConfig.showNation : true,
      });
    } else {
      const isDefaultAvatar = !selectedAvatarUrl || selectedAvatarUrl === DEFAULT_PLAYER_AVATAR || selectedAvatarUrl.includes('unknown.webp');
      const defaultJersey = selectedPlayer.jerseyNumber != null && selectedPlayer.jerseyNumber !== 0 ? selectedPlayer.jerseyNumber : '?';
      setCardState({
        templateId: 'toty',
        rating: calculated.rating,
        position: selectedPlayer.jerseyNumber === 1 ? 'GK' : 'RW',
        roleIntensity: '++',
        altPositions: selectedPlayer.jerseyNumber === 1 ? [] : ['CAM', 'LW'],
        playerName: selectedPlayer.name.toUpperCase(),
        jerseyNumber: defaultJersey,
        isInjuryProne: Boolean(selectedPlayer.isInjuryProne),
        avatarUrl: selectedAvatarUrl,
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
      });
    }
  }, [selectedPlayer, selectedStats, selectedAvatarUrl, configsMap]);

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
    if (!selectedPlayer) return;
    const currentBirthYear = cardState?.faceStats?.birthYear || birthYear || 1998;
    const calculated = calculateFutStatsFromPlayer({
      name: selectedPlayer.name,
      wins: selectedStats?.wins ?? 0,
      draws: selectedStats?.draws ?? 0,
      losses: selectedStats?.losses ?? 0,
      totalMatches: selectedStats?.totalMatches ?? 0,
      winRate: selectedStats?.winRate ?? 0,
      isInjuryProne: Boolean(selectedPlayer.isInjuryProne),
      birthYear: currentBirthYear,
    });
    setCardState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        rating: calculated.rating,
        faceStats: {
          ...prev.faceStats,
          wr: calculated.faceStats.wr,
          w: calculated.faceStats.w,
          d: calculated.faceStats.d,
          l: calculated.faceStats.l,
          p: calculated.faceStats.p,
          yo: calculated.faceStats.yo,
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
  const handleSaveCard = async () => {
    if (!selectedPlayer || !cardState) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/card-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-request': 'true',
        },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          config: cardState,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Đã lưu Thẻ cầu thủ cho cầu thủ ${selectedPlayer.name}!`);
        // Update local configsMap
        setConfigsMap((prev) => ({
          ...prev,
          [selectedPlayer.id]: cardState,
        }));
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

  // Reset to auto defaults
  const handleResetDefaults = () => {
    if (!selectedPlayer) return;
    const defaultYear = 1998;
    setBirthYear(defaultYear);
    const calculated = calculateFutStatsFromPlayer({
      name: selectedPlayer.name,
      wins: selectedStats?.wins ?? 0,
      draws: selectedStats?.draws ?? 0,
      losses: selectedStats?.losses ?? 0,
      totalMatches: selectedStats?.totalMatches ?? 0,
      winRate: selectedStats?.winRate ?? 0,
      isInjuryProne: Boolean(selectedPlayer.isInjuryProne),
      birthYear: defaultYear,
    });

    const isDefaultAvatar = !selectedAvatarUrl || selectedAvatarUrl === DEFAULT_PLAYER_AVATAR || selectedAvatarUrl.includes('unknown.webp');
    setCardState({
      templateId: 'toty',
      rating: calculated.rating,
      position: selectedPlayer.jerseyNumber === 1 ? 'GK' : 'RW',
      roleIntensity: '++',
      altPositions: selectedPlayer.jerseyNumber === 1 ? [] : ['CAM', 'LW'],
      playerName: selectedPlayer.name.toUpperCase(),
      jerseyNumber: selectedPlayer.jerseyNumber ?? 10,
      isInjuryProne: Boolean(selectedPlayer.isInjuryProne),
      avatarUrl: selectedAvatarUrl,
      scale: isDefaultAvatar ? 0.85 : 1.05,
      offsetX: isDefaultAvatar ? 6 : 0,
      offsetY: isDefaultAvatar ? 22 : 0,
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


  // Filtered player list
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const q = searchQuery.trim().toLowerCase();
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.jerseyNumber != null && String(p.jerseyNumber).includes(q)) ||
        (p.telegramHandle || '').toLowerCase().includes(q)
    );
  }, [players, searchQuery]);

  // Previous & Next navigation between players
  const currentIndex = useMemo(() => {
    return players.findIndex((p) => p.id === selectedPlayerId);
  }, [players, selectedPlayerId]);

  const handlePrevPlayer = () => {
    if (currentIndex > 0) {
      setSelectedPlayerId(players[currentIndex - 1].id);
    }
  };

  const handleNextPlayer = () => {
    if (currentIndex < players.length - 1) {
      setSelectedPlayerId(players[currentIndex + 1].id);
    }
  };

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    if (templateFilter === 'all') return CARD_TEMPLATES;
    return CARD_TEMPLATES.filter((t) => t.category === templateFilter);
  }, [templateFilter]);

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <p style={{ fontSize: '15px', fontWeight: 700 }}>Đang tải danh sách cầu thủ & dữ liệu thẻ...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* ── TOP HEADER BAR ── */}
      <div
        className="admin-card-header"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                color: '#ffffff',
              }}
            >
              <Sparkles size={16} />
            </span>
            <h1 style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Quản Lý Thẻ cầu thủ Cho Cầu Thủ ({players.length} Cầu Thủ)
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Admin có quyền tùy chỉnh mẫu thẻ, vị trí, căn chỉnh ảnh và lưu cấu hình cho từng cầu thủ trong đội
          </p>
        </div>

        {/* Action Buttons: Save, Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RotateCcw size={13} />
            Mặc định
          </button>
          <button
            type="button"
            onClick={handleSaveCard}
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#16a34a',
              border: 'none',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Check size={15} />
            {isSaving ? 'Đang lưu...' : 'Lưu Thẻ Cầu Thủ Này'}
          </button>
        </div>
      </div>

      {/* ── PLAYER SELECTOR CAROUSEL & SEARCH ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>
              👤 Chọn Cầu Thủ Để Chỉnh Thẻ:
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={handlePrevPlayer}
                disabled={currentIndex <= 0}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: currentIndex <= 0 ? '#f1f5f9' : '#ffffff',
                  color: currentIndex <= 0 ? '#94a3b8' : '#334155',
                  cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextPlayer}
                disabled={currentIndex >= players.length - 1}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: currentIndex >= players.length - 1 ? '#f1f5f9' : '#ffffff',
                  color: currentIndex >= players.length - 1 ? '#94a3b8' : '#334155',
                  cursor: currentIndex >= players.length - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text"
              placeholder="Tìm theo tên, số áo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                outline: 'none',
                background: '#f8fafc',
              }}
            />
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
          </div>
        </div>

        {/* Player Chips Row (Horizontal Scroll) */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            paddingBottom: '6px',
            paddingTop: '2px',
          }}
        >
          {filteredPlayers.map((player) => {
            const isSelected = player.id === selectedPlayerId;
            const hasCustomConfig = Boolean(configsMap[player.id]);
            const pAvatar = player.jerseyNumber != null
              ? `https://udlhudfxwuwbecjqvvhv.supabase.co/storage/v1/object/public/players/${player.jerseyNumber}.webp`
              : DEFAULT_PLAYER_AVATAR;

            return (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedPlayerId(player.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  background: isSelected ? '#fef2f2' : '#ffffff',
                  color: isSelected ? '#dc2626' : '#1e293b',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(239, 68, 68, 0.15)' : 'none',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#0f172a',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={pAvatar}
                    alt={player.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=ffffff&bold=true`;
                    }}
                  />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {player.name}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                    #{player.jerseyNumber || '?'}
                  </div>
                </div>
                {hasCustomConfig && (
                  <span
                    title="Đã lưu cấu hình thẻ riêng"
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#16a34a',
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN STUDIO SECTION (3D PREVIEW + CONTROLS) ── */}
      {cardState && selectedPlayer && (
        <div
          className="admin-card-studio"
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
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
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                Thẻ cầu thủ: {selectedPlayer.name} #{selectedPlayer.jerseyNumber || ''}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                {selectedStats ? `${selectedStats.winRate}% WR (${selectedStats.wins}T-${selectedStats.draws}H-${selectedStats.losses}B)` : 'Chưa có dữ liệu trận đấu'}
              </div>
            </div>

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
              Kéo chuột / chạm trực tiếp trên thẻ để chỉnh vị trí ảnh cầu thủ
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
                  fontSize: '11.5px',
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
                onClick={() => setActiveTab('stats')}
                style={{
                  flex: '1 0 auto',
                  minWidth: 'max-content',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'stats' ? '#ef4444' : 'transparent',
                  color: activeTab === 'stats' ? '#ffffff' : '#475569',
                  fontWeight: 800,
                  fontSize: '11.5px',
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
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'position' ? '#ef4444' : 'transparent',
                  color: activeTab === 'position' ? '#ffffff' : '#475569',
                  fontWeight: 800,
                  fontSize: '11.5px',
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
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'visuals' ? '#ef4444' : 'transparent',
                  color: activeTab === 'visuals' ? '#ffffff' : '#475569',
                  fontWeight: 800,
                  fontSize: '11.5px',
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

                {/* Template Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
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
                        onClick={() => setCardState((prev) => (prev ? { ...prev, templateId: tmpl.id } : null))}
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
                        }}
                      >
                        <div style={{ width: '48px', height: '68px', position: 'relative' }}>
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
                            maxWidth: '85px',
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

            {/* TAB: PLAYER STATS EDITOR */}
            {activeTab === 'stats' && (
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
                          onClick={() => setCardState((prev) => (prev ? { ...prev, position: pos } : null))}
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
                        onClick={() => setCardState((prev) => (prev ? { ...prev, roleIntensity: role.id as any } : null))}
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
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                      Chỉ số <strong>No.</strong> hiển thị số áo thi đấu của cầu thủ trực tiếp trên thẻ.
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
                  playerId={selectedPlayer?.id}
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
                    onChange={(e) => setCardState((prev) => (prev ? { ...prev, scale: parseFloat(e.target.value) } : null))}
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
                    onChange={(e) => setCardState((prev) => (prev ? { ...prev, offsetX: parseInt(e.target.value, 10) } : null))}
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
                    onChange={(e) => setCardState((prev) => (prev ? { ...prev, offsetY: parseInt(e.target.value, 10) } : null))}
                    style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
                  />
                </div>

                {/* Reset Avatar Position */}
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

            {/* Database stats summary info */}
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
                ⚡ Chỉ số trận đấu: <strong style={{ color: '#0f172a' }}>{cardState.faceStats.wr}% WR</strong> ({cardState.faceStats.w}T - {cardState.faceStats.d}H - {cardState.faceStats.l}B)
              </span>
              <span style={{ color: '#16a34a', fontWeight: 800 }}>
                Tổng: {cardState.faceStats.p} Trận
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCardsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <p style={{ fontSize: '15px', fontWeight: 700 }}>Đang tải danh sách cầu thủ & dữ liệu thẻ...</p>
        </div>
      }
    >
      <AdminCardsContent />
    </Suspense>
  );
}
