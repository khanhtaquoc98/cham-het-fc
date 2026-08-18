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
  isInjuryProne?: boolean | null;
  telegramHandle?: string | null;
  updatedAt?: string | number | Date | null;
  avatarVersion?: string | number | null;
  avatarUrl?: string | null;
}

/* =============================================
   WC26 PLAYER CARD (Panini WC26 Sticker Style)
   ============================================= */

export function PlayerCard({ player, style, className, externalRotate }: {
  player: PlayerCardData;
  style?: React.CSSProperties;
  className?: string;
  externalRotate?: { x: number; y: number } | null;
}) {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const [cacheBuster, setCacheBuster] = useState(() => Date.now());
  const filename = player?.jerseyNumber != null ? player.jerseyNumber : (player?.playerId || 'unknown');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const versionParam = player?.updatedAt
    ? `?v=${new Date(player.updatedAt).getTime()}`
    : player?.avatarVersion
    ? `?v=${player.avatarVersion}`
    : `?v=${cacheBuster}`;

  const rawImgSrc = player?.avatarUrl
    ? player.avatarUrl
    : supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/players/${filename}.webp`
    : `/player/${filename}.webp`;

  const imgSrc = rawImgSrc.startsWith('data:')
    ? rawImgSrc
    : rawImgSrc.includes('?')
    ? `${rawImgSrc}&t=${cacheBuster}`
    : `${rawImgSrc}${versionParam}`;

  const fallbackSrc = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/players/unknown.webp`
    : `/player/unknown.webp`;
  const hasImage = !imgError;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(false);
    setImgError(false);
    setCacheBuster(Date.now());
  }, [player?.avatarVersion, player?.avatarUrl, player?.updatedAt, player?.jerseyNumber, player?.playerId]);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (externalRotate !== undefined) return;
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = (x / rect.width) - 0.5;
    const py = (y / rect.height) - 0.5;

    // Maximum tilt angles (20 degrees)
    const maxRotate = 20;
    const rotateY = px * maxRotate; 
    const rotateX = -py * maxRotate; 

    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseEnter = () => {
    if (externalRotate !== undefined) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (externalRotate !== undefined) return;
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
  };

  const backgroundSrc = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/players/background.png`
    : `/player/background.png`;

  const activeRotate = externalRotate !== undefined
    ? (externalRotate || { x: 0, y: 0 })
    : rotate;

  const activeHovered = externalRotate !== undefined
    ? !!externalRotate
    : isHovered;

  const currentTransform = activeHovered
    ? `perspective(1000px) translateY(0) scale(1.05) rotateX(${activeRotate.x}deg) rotateY(${activeRotate.y}deg)`
    : `perspective(1000px) translateY(0) scale(1) rotateX(0deg) rotateY(0deg)`;

  return (
    <div 
      ref={cardRef}
      className={`panini-card ${className || ''}`} 
      style={{ ...style, transform: currentTransform }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* === CARD BODY (background.webp + color tint) === */}
      <div className="panini-card-body" style={{
        backgroundImage: `linear-gradient(${tintColor}, ${tintColor}), url(${backgroundSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        {/* Player image */}
        <div className="panini-player-img">
          {hasImage ? (
            <Image
              unoptimized
              src={imgSrc}
              alt={player.playerName}
              width={200}
              height={220}
              onError={() => setImgError(true)}
              onLoad={() => setIsLoaded(true)}
              loading="lazy"
              style={{
                objectFit: 'cover',
                objectPosition: 'top center',
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.25s ease-in-out',
              }}
              draggable={false}
            />
          ) : (
          <div className="panini-placeholder">
            <Image
              unoptimized
              src={fallbackSrc}
              alt="Unknown player"
              width={200}
              height={220}
              onLoad={() => setIsLoaded(true)}
              loading="lazy"
              style={{
                objectFit: 'cover',
                objectPosition: 'top center',
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.25s ease-in-out',
              }}
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
          <span className="panini-name">
            {player.playerName}
            {player.isInjuryProne && (
              <span
                title="Cầu thủ dễ chấn thương (Injury Prone)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  marginLeft: '6px',
                  verticalAlign: 'middle',
                  boxShadow: '0 2px 5px rgba(220, 38, 38, 0.5)',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
                </svg>
              </span>
            )}
          </span>
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
  playerConfigs: { id: string; name: string; jerseyNumber: number | null; isInjuryProne?: boolean | null; telegramHandle?: string | null; updatedAt?: string | number | Date | null; avatarVersion?: string | number | null; avatarUrl?: string | null }[];
}) {
  const allPlayers = playerConfigs
    .filter(config => {
      const num = config.jerseyNumber;
      return num !== null && num !== undefined && !isNaN(Number(num)) && Number(num) > 0 && Number(num) !== 19;
    })
    .map(config => {
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
        jerseyNumber: config.jerseyNumber ?? null,
        isInjuryProne: config.isInjuryProne ?? stat?.isInjuryProne ?? false,
        telegramHandle: config.telegramHandle || stat?.telegramHandle || null,
        updatedAt: config.updatedAt || null,
        avatarVersion: config.avatarVersion || null,
        avatarUrl: config.avatarUrl || null,
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
  const [rotate, setRotate] = useState<{ x: number; y: number } | null>(null);
  
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = (x / rect.width) - 0.5;
    const py = (y / rect.height) - 0.5;

    // Maximum tilt angles (20 degrees)
    const maxRotate = 20;
    const rotateY = px * maxRotate; 
    const rotateX = -py * maxRotate; 

    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setShow(false);
    setRotate(null);
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
        <PlayerCard player={player} className="wc26-hover-card" externalRotate={rotate} />
      </div>,
      document.body
    )
  ) : null;

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
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      {tooltipElement}
    </div>
  );
}
