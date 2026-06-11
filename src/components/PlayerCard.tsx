'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

export interface PlayerCardData {
  playerName: string;
  playerId?: string | null;
  wins: number;
  draws: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  jerseyNumber?: number | null;
  telegramHandle?: string | null;
}

/* =============================================
   WC26 PLAYER CARD (Panini WC26 Sticker Style)
   ============================================= */

export function PlayerCard({ player, style, className }: {
  player: PlayerCardData;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const filename = player?.jerseyNumber || player?.playerId || 'unknown';
  const imgSrc = `/player/${filename}.webp`;
  const hasImage = !imgError;

  const winRateColor = player.winRate >= 50 ? '#4CAF50' : player.winRate >= 30 ? '#FF9800' : '#F44336';
  const winRateBg = player.winRate >= 50 ? 'rgba(76,175,80,0.15)' : player.winRate >= 30 ? 'rgba(255,152,0,0.15)' : 'rgba(244,67,54,0.15)';

  // Random WC26 color tint per player (stable by name)
  const WC26_TINTS = [
    'rgba(0,137,123,0.25)',    // teal
    'rgba(21,101,192,0.2)',   // blue
    'rgba(233,30,99,0.2)',    // coral/pink
    'rgba(46,125,50,0.2)',    // green
    'rgba(130,119,23,0.2)',   // lime
    'rgba(13,27,42,0.2)',     // navy
    'rgba(0,105,92,0.2)',     // dark teal
    'rgba(183,28,28,0.2)',    // red
  ];
  const nameHash = player.playerName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const tintColor = WC26_TINTS[nameHash % WC26_TINTS.length];

  return (
    <div className={`panini-card ${className || ''}`} style={style}>
      {/* === CARD BODY (background.webp + color tint) === */}
      <div className="panini-card-body" style={{
        backgroundImage: `linear-gradient(${tintColor}, ${tintColor}), url(/player/background.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>

        {/* Player image */}
        <div className="panini-player-img">
          {hasImage ? (
            <Image
              src={imgSrc}
              alt={player.playerName}
              width={200}
              height={220}
              onError={() => setImgError(true)}
              style={{ objectFit: 'cover', objectPosition: 'top center' }}
              unoptimized
              draggable={false}
            />
          ) : (
          <div className="panini-placeholder">
            <Image
              src="/player/unknown.webp"
              alt="Unknown player"
              width={200}
              height={220}
              style={{ objectFit: 'cover', objectPosition: 'top center' }}
              unoptimized
              draggable={false}
            />
          </div>
          )}
        </div>
      </div>

      {/* === INFO STRIP (dark teal) === */}
      <div className="panini-info">
        {/* Jersey number badge */}
        {player.jerseyNumber && (
          <div className="panini-jersey">#{player.jerseyNumber}</div>
        )}

        {/* Name bar */}
        <div className="panini-name-bar">
          <span className="panini-name">{player.playerName}</span>
        </div>

        {/* Telegram handle */}
        {/* {player.telegramHandle && (
          <div className="panini-telegram">{player.telegramHandle}</div>
        )} */}

        {/* Stats row */}
        <div className="panini-stats">
          <span className="panini-winrate" style={{ color: winRateColor, background: winRateBg }}>
            {player.winRate}%
          </span>
          <span className="panini-matches">{player.totalMatches} trận</span>
          <span className="panini-wdl">
            <span style={{ color: '#66BB6A' }}>{player.wins}W</span>{' '}
            <span style={{ color: '#90A4AE' }}>{player.draws}D</span>{' '}
            <span style={{ color: '#EF5350' }}>{player.losses}L</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* =============================================
   PLAYER CARD CAROUSEL (for empty state)
   ============================================= */

export function PlayerCardCarousel({ playerStats, playerConfigs }: {
  playerStats: PlayerCardData[];
  playerConfigs: { id: string; name: string; jerseyNumber: number | null; telegramHandle?: string | null }[];
}) {
  const allPlayers = playerConfigs.map(config => {
    const stat = playerStats.find(s =>
      s.playerId === config.id ||
      s.playerName.trim().toLowerCase() === config.name.trim().toLowerCase()
    );

    return {
      playerName: config.name,
      playerId: config.id,
      wins: stat?.wins || 0,
      draws: stat?.draws || 0,
      losses: stat?.losses || 0,
      totalMatches: stat?.totalMatches || 0,
      winRate: stat?.winRate || 0,
      jerseyNumber: config.jerseyNumber || null,
      telegramHandle: config.telegramHandle || stat?.telegramHandle || null,
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
    <div className="wc26-players-section">
      <div className="wc26-players-header">
        <span className="wc26-carousel-badge mt-4">⭐ Cầu thủ nổi bật</span>
      </div>
      <div className="wc26-players-grid">
        {allPlayers.map((p, i) => (
          <div
            key={p.playerName}
            className="wc26-grid-item"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <PlayerCard player={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* =============================================
   HOVER CARD (tooltip popup on player)
   ============================================= */

export function PlayerHoverCard({ player, children, style }: {
  player: PlayerCardData | null;
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
    
    const tooltipWidth = 170;
    const tooltipHeight = 310;
    const padding = 12;

    // Default: position on the right, centered vertically
    let placement: 'right' | 'left' | 'top' | 'bottom' = 'right';
    let left = rect.right + padding;
    let top = rect.top + rect.height / 2 - tooltipHeight / 2;

    // If it overflows right edge
    if (left + tooltipWidth > window.innerWidth) {
      // Try left
      placement = 'left';
      left = rect.left - tooltipWidth - padding;
    }

    // If it also overflows left edge, or if screen is small (mobile layout)
    if (left < 0 || window.innerWidth <= 768) {
      // Place above
      placement = 'top';
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      top = rect.top - tooltipHeight - padding;

      // If it overflows top edge, place below
      if (top < 0) {
        placement = 'bottom';
        top = rect.bottom + padding;
      }
    }

    // Keep it vertically within viewport if placing left/right
    if (placement === 'right' || placement === 'left') {
      const minTop = 10;
      const maxTop = window.innerHeight - tooltipHeight - 10;
      top = Math.max(minTop, Math.min(maxTop, top));
    } else {
      // Keep it horizontally within viewport if placing top/bottom
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

  // Hide on scroll/resize to keep UI clean
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

  const tooltipElement = show && mounted && coords ? (
    createPortal(
      <div
        className={`wc26-hover-portal-popup placement-${coords.placement}`}
        style={{
          position: 'fixed',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          zIndex: 999999,
          pointerEvents: 'none',
        }}
      >
        <PlayerCard player={player} className="wc26-hover-card" />
      </div>,
      document.body
    )
  ) : null;

  return (
    <div
      ref={triggerRef}
      className="wc26-hover-wrapper"
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {tooltipElement}
    </div>
  );
}
