'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import FutCardPreview from './FutCardPreview';
import {
  PlayerCardCustomState,
  calculateFutStatsFromPlayer,
  DEFAULT_PLAYER_AVATAR,
} from '@/lib/fut-card-config';

export interface PlayerCardData {
  playerName: string;
  playerId?: string | null;
  wins: number;
  draws: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  jerseyNumber?: number | null;
  isInjuryProne?: boolean | null;
  telegramHandle?: string | null;
  updatedAt?: string | number | Date | null;
  avatarVersion?: string | number | null;
  avatarUrl?: string | null;
  cardConfig?: PlayerCardCustomState | null;
}

/* =============================================
   EA FC 26 PLAYER CARD COMPONENT
   ============================================= */

export function PlayerCard({
  player,
  cardConfig,
  cardWidth = 260,
  hidePillBar = false,
  interactive = true,
  className,
  style,
}: {
  player: PlayerCardData;
  cardConfig?: PlayerCardCustomState | null;
  cardWidth?: number;
  hidePillBar?: boolean;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  externalRotate?: { x: number; y: number } | null;
}) {
  // Determine avatar URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udlhudfxwuwbecjqvvhv.supabase.co';
  const versionParam = player?.avatarVersion ? `?v=${player.avatarVersion}` : '';
  let resolvedAvatar = player?.avatarUrl;
  if (!resolvedAvatar && player?.jerseyNumber != null) {
    resolvedAvatar = `${supabaseUrl}/storage/v1/object/public/players/${player.jerseyNumber}.webp${versionParam}`;
  } else if (!resolvedAvatar && player?.playerId) {
    resolvedAvatar = `${supabaseUrl}/storage/v1/object/public/players/${player.playerId}.webp${versionParam}`;
  }
  if (!resolvedAvatar) {
    resolvedAvatar = DEFAULT_PLAYER_AVATAR;
  }

  // Use provided cardConfig, or compute default EA FC card from stats
  const effectiveConfig: PlayerCardCustomState = React.useMemo(() => {
    const rawAvatar = cardConfig?.avatarUrl || player.cardConfig?.avatarUrl || resolvedAvatar;
    const isWrong10 =
      player?.jerseyNumber !== 10 &&
      !player?.playerName?.toUpperCase().includes('NGHĨA') &&
      (rawAvatar?.includes('/10.webp') || rawAvatar === '/player/10.webp');
    const finalAvatar = isWrong10 || !rawAvatar ? DEFAULT_PLAYER_AVATAR : rawAvatar;
    const isDefaultAvatar = !finalAvatar || finalAvatar === DEFAULT_PLAYER_AVATAR || finalAvatar.includes('unknown.webp');

    if (cardConfig) {
      return {
        ...cardConfig,
        avatarUrl: finalAvatar,
        showPlayStyle: false,
        scale: isDefaultAvatar && (cardConfig.scale === 1.05 || cardConfig.scale === 1.0 || !cardConfig.scale) ? 0.85 : cardConfig.scale,
        offsetX: isDefaultAvatar && cardConfig.offsetX === 0 ? 6 : cardConfig.offsetX,
        offsetY: isDefaultAvatar && cardConfig.offsetY === 0 ? 22 : cardConfig.offsetY,
      };
    }
    if (player.cardConfig) {
      return {
        ...player.cardConfig,
        avatarUrl: finalAvatar,
        showPlayStyle: false,
        scale: isDefaultAvatar && (player.cardConfig.scale === 1.05 || player.cardConfig.scale === 1.0 || !player.cardConfig.scale) ? 0.85 : player.cardConfig.scale,
        offsetX: isDefaultAvatar && player.cardConfig.offsetX === 0 ? 6 : player.cardConfig.offsetX,
        offsetY: isDefaultAvatar && player.cardConfig.offsetY === 0 ? 22 : player.cardConfig.offsetY,
      };
    }

    const calculated = calculateFutStatsFromPlayer({
      name: player.playerName,
      wins: player.wins,
      draws: player.draws,
      losses: player.losses,
      totalMatches: player.totalMatches,
      winRate: player.winRate,
      isInjuryProne: Boolean(player.isInjuryProne),
      birthYear: 1998,
    });

    const isGk = player.playerName.toLowerCase().includes('gk');
    const position = isGk ? 'GK' : 'RW';
    const templateId = calculated.rating >= 88 ? 'toty' : calculated.rating >= 82 ? 'champions_red' : 'rare_gold';

    return {
      templateId,
      rating: calculated.rating,
      position,
      roleIntensity: (calculated.rating >= 85 ? '++' : '+') as '' | '+' | '++',
      altPositions: isGk ? [] : ['CAM', 'LW'],
      playerName: player.playerName.toUpperCase(),
      jerseyNumber: player.jerseyNumber != null && player.jerseyNumber !== 0 ? player.jerseyNumber : '?',
      isInjuryProne: Boolean(player.isInjuryProne),
      avatarUrl: finalAvatar,
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
    };
  }, [cardConfig, player, resolvedAvatar]);

  return (
    <FutCardPreview
      state={effectiveConfig}
      cardWidth={cardWidth}
      hidePillBar={hidePillBar}
      interactive={interactive}
      className={className}
      style={style}
    />
  );
}

/* =============================================
   PLAYER CARD CAROUSEL (Showcase Grid)
   ============================================= */

export function PlayerCardCarousel({
  playerStats,
  playerConfigs,
  cardConfigs: propCardConfigs,
}: {
  playerStats: PlayerCardData[];
  playerConfigs: {
    id: string;
    name: string;
    jerseyNumber: number | null;
    isInjuryProne?: boolean | null;
    telegramHandle?: string | null;
    updatedAt?: string | number | Date | null;
    avatarVersion?: string | number | null;
    avatarUrl?: string | null;
  }[];
  cardConfigs?: Record<string, PlayerCardCustomState>;
}) {
  const [dbCardConfigs, setDbCardConfigs] = useState<Record<string, PlayerCardCustomState>>(propCardConfigs || {});

  // Fetch card configs from DB if not passed in props
  useEffect(() => {
    if (propCardConfigs && Object.keys(propCardConfigs).length > 0) {
      setDbCardConfigs(propCardConfigs);
      return;
    }

    fetch('/api/card-config')
      .then((res) => res.json())
      .then((data) => {
        if (data.configs) {
          setDbCardConfigs(data.configs);
        }
      })
      .catch(() => {});
  }, [propCardConfigs]);

  const allPlayers = playerConfigs
    .filter((config) => {
      const num = config.jerseyNumber;
      return num !== null && num !== undefined && !isNaN(Number(num)) && Number(num) > 0 && Number(num) !== 19;
    })
    .map((config) => {
      const stat = playerStats.find(
        (s) =>
          s.playerId === config.id ||
          s.playerName.trim().toLowerCase() === config.name.trim().toLowerCase()
      );

      const savedConfig =
        dbCardConfigs[config.id] ||
        dbCardConfigs[config.name.trim().toLowerCase()] ||
        null;

      return {
        playerName: config.name,
        playerId: config.id,
        wins: stat?.wins || 0,
        draws: stat?.draws || 0,
        losses: stat?.losses || 0,
        totalMatches: stat?.totalMatches || 0,
        winRate: stat?.winRate || 0,
        jerseyNumber: config.jerseyNumber ?? null,
        isInjuryProne: config.isInjuryProne ?? stat?.isInjuryProne ?? false,
        telegramHandle: config.telegramHandle || stat?.telegramHandle || null,
        updatedAt: config.updatedAt || null,
        avatarVersion: config.avatarVersion || null,
        avatarUrl: config.avatarUrl || null,
        cardConfig: savedConfig,
      };
    });

  if (allPlayers.length === 0) return null;

  // Sort by total matches desc, then win rate desc, then name
  allPlayers.sort((a, b) => {
    if (a.winRate !== b.winRate) {
      return b.winRate - a.winRate;
    }
    if (a.totalMatches !== b.totalMatches) {
      return b.totalMatches - a.totalMatches;
    }
    return a.playerName.localeCompare(b.playerName);
  });

  return (
    <div className="wc26-players-section" style={{ padding: '24px 0 16px' }}>
      <div className="wc26-players-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <span
          className="wc26-carousel-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.9) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '9999px',
            fontSize: '13.5px',
            fontWeight: 800,
            color: '#ffffff',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          }}
        >
          <span>🃏</span>
          <span>Thẻ Cầu Thủ EA FC 26 - Chấm Hết FC</span>
        </span>
      </div>

      <div
        className="wc26-players-grid"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        {allPlayers.map((p, i) => (
          <div
            key={p.playerName}
            className="wc26-grid-item"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <PlayerCard
              player={p}
              cardConfig={p.cardConfig}
              cardWidth={260}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* =============================================
   HOVER CARD (Tooltip Popup on Player Name)
   ============================================= */

export function PlayerHoverCard({
  player,
  cardConfig,
  children,
  style,
}: {
  player: PlayerCardData | null;
  cardConfig?: PlayerCardCustomState | null;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'right' | 'left' | 'top' | 'bottom';
  } | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    const tooltipWidth = 220;
    const tooltipHeight = 350;
    const padding = 12;

    let placement: 'right' | 'left' | 'top' | 'bottom' = 'right';
    let left = rect.right + padding;
    let top = rect.top + rect.height / 2 - tooltipHeight / 2;

    if (left + tooltipWidth > window.innerWidth) {
      placement = 'left';
      left = rect.left - tooltipWidth - padding;
    }

    if (left < 0 || window.innerWidth <= 768) {
      placement = 'top';
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      top = rect.top - tooltipHeight - padding;

      if (top < 0) {
        placement = 'bottom';
        top = rect.bottom + padding;
      }
    }

    if (placement === 'right' || placement === 'left') {
      const minTop = 10;
      const maxTop = window.innerHeight - tooltipHeight - 10;
      top = Math.max(minTop, Math.min(maxTop, top));
    } else {
      const minLeft = 10;
      const maxLeft = window.innerWidth - tooltipWidth - 10;
      left = Math.max(minLeft, Math.min(maxLeft, left));
    }

    setCoords({ top, left, placement });
  };

  const handleMouseEnter = () => {
    updatePosition();
    setShow(true);
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  useEffect(() => {
    if (!show) return;
    const handleScrollOrResize = () => {
      setShow(false);
    };
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [show]);

  if (!player) {
    return <>{children}</>;
  }

  const tooltipElement =
    show && mounted && coords
      ? createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 999999,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 15px 35px rgba(0, 0, 0, 0.6))',
              animation: 'wc26-card-appear 0.2s ease-out both',
            }}
          >
            <PlayerCard
              player={player}
              cardConfig={cardConfig || player.cardConfig}
              cardWidth={220}
              hidePillBar={false}
              interactive={false}
            />
          </div>,
          document.body
        )
      : null;

  const handleClick = () => {
    if (!show) {
      updatePosition();
      setShow(true);
    } else {
      setShow(false);
    }
  };

  return (
    <div
      ref={triggerRef}
      className="wc26-hover-wrapper"
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      {tooltipElement}
    </div>
  );
}
