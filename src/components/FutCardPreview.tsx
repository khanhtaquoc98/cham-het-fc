'use client';

import React, { useRef, useState } from 'react';
import { PlayerCardCustomState, CARD_TEMPLATES, NATIONS, CLUBS, PLAYSTYLES_PLUS, DEFAULT_PLAYER_AVATAR } from '@/lib/fut-card-config';

interface FutCardPreviewProps {
  state: PlayerCardCustomState;
  onAvatarMove?: (dx: number, dy: number) => void;
  cardWidth?: number;
  hidePillBar?: boolean;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function FutCardPreview({
  state,
  onAvatarMove,
  cardWidth,
  hidePillBar = false,
  interactive = true,
  className,
  style,
}: FutCardPreviewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const template = CARD_TEMPLATES.find((t) => t.id === state.templateId) || CARD_TEMPLATES[0];

  const textColor = state.customTextColor
    ? state.customTextColor
    : template.textTheme === 'dark'
    ? '#2f240e'
    : '#ffffff';

  const subTextColor = template.textTheme === 'dark' ? 'rgba(47, 36, 14, 0.75)' : 'rgba(255, 255, 255, 0.85)';

  // 3D Tilt Effect on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isDraggingAvatar) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = x / rect.width - 0.5;
    const py = y / rect.height - 0.5;

    const maxRotate = 16;
    setRotate({
      x: -py * maxRotate,
      y: px * maxRotate,
    });

    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.25,
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  // Drag player avatar directly on card
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLButtonElement) return;
    setIsDraggingAvatar(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingAvatar || !onAvatarMove) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    onAvatarMove(dx, dy);
  };

  const handleMouseUp = () => {
    setIsDraggingAvatar(false);
  };

  // Club & Nation selection
  const selectedClub = CLUBS.find((c) => c.id === state.clubId);
  const clubLogo = state.customClubUrl || selectedClub?.logoUrl || '/fut-cards/clubs/cham_het_fc.png';

  const selectedNation = NATIONS.find((n) => n.id === state.nationId);
  const nationFlag = state.customNationUrl || selectedNation?.flagUrl || '/fut-cards/nations/Vietnam.png';

  const selectedPlayStyle = PLAYSTYLES_PLUS.find((p) => p.id === state.playStylePlusId);

  // 6 Face Stats (Horizontal row: WR, W, D, L, P, No.)
  const rawNo = state.faceStats?.no ?? state.jerseyNumber;
  const displayNo = (rawNo !== undefined && rawNo !== null && rawNo !== '' && rawNo !== 0 && rawNo !== '0' && rawNo !== '?')
    ? rawNo
    : '?';

  const faceStatsList = [
    { label: 'WR', val: state.faceStats?.wr ?? 68 },
    { label: 'W', val: state.faceStats?.w ?? 12 },
    { label: 'D', val: state.faceStats?.d ?? 4 },
    { label: 'L', val: state.faceStats?.l ?? 3 },
    { label: 'P', val: state.faceStats?.p ?? 19 },
    { label: 'No.', val: displayNo },
  ];

  const scaleRatio = cardWidth ? cardWidth / 300 : 1;
  const baseCardWidth = 300;
  const baseCardHeight = 417; // 300 * (894 / 644)
  const outerWidth = cardWidth || baseCardWidth;
  const outerHeight = Math.round(baseCardHeight * scaleRatio);

  return (
    <div
      style={{
        width: `${outerWidth}px`,
        height: `${outerHeight}px`,
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflow: 'visible',
        ...style,
      }}
      className={className}
      onMouseMove={interactive ? handleGlobalMouseMove : undefined}
      onMouseUp={interactive ? handleMouseUp : undefined}
    >
      <div
        style={{
          width: `${baseCardWidth}px`,
          height: `${baseCardHeight}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: scaleRatio !== 1 ? `scale(${scaleRatio})` : undefined,
          transformOrigin: 'top center',
          userSelect: 'none',
        }}
      >
        {/* ── CARD SHIELD CONTAINER ── */}
        <div
          ref={cardRef}
          className="fut-card-shield-root"
          onMouseMove={interactive ? handleMouseMove : undefined}
          onMouseLeave={interactive ? handleMouseLeave : undefined}
          onMouseDown={interactive ? handleMouseDown : undefined}
          style={{
            width: `${baseCardWidth}px`,
            height: `${baseCardHeight}px`,
            position: 'relative',
            background: 'transparent',
            transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
            transition: isDraggingAvatar ? 'none' : 'transform 0.15s ease-out, filter 0.2s ease',
            filter: isDraggingAvatar
              ? 'none'
              : `drop-shadow(0 14px 28px rgba(0,0,0,0.42)) ${template.accentColor ? `drop-shadow(0 0 16px ${template.accentColor}33)` : ''}`,
            cursor: isDraggingAvatar ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          {/* Holographic Glare Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              pointerEvents: 'none',
              borderRadius: '24px',
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0) 70%)`,
              opacity: glare.opacity,
              transition: 'opacity 0.2s ease',
            }}
          />

          {/* 1. Base Card Template Image Layer (Background) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <img
              src={template.src}
              alt={template.name}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.src.includes('rare_gold.png')) {
                  img.src = '/fut-cards/templates/rare_gold.png';
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* 2. Player Cutout Image Layer (clipped cleanly inside shield above Name) */}
          <div
            style={{
              position: 'absolute',
              top: '12%',
              left: '10%',
              right: '10%',
              bottom: '36.5%', // stops right at the Name banner (63.83%)
              overflow: 'hidden',
              zIndex: 2,
              maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
              pointerEvents: 'none',
            }}
          >
            {(() => {
              const rawAvatar = state.avatarUrl?.trim();
              const isWrong10 =
                state.jerseyNumber !== 10 &&
                !state.playerName?.toUpperCase().includes('NGHĨA') &&
                (rawAvatar?.includes('/10.webp') || rawAvatar === '/player/10.webp');
              const displayAvatar = !rawAvatar || isWrong10 ? DEFAULT_PLAYER_AVATAR : rawAvatar;

              return (
                <div
                  style={{
                    position: 'absolute',
                    top: `calc(50% + ${state.offsetY}px)`,
                    left: `calc(50% + ${state.offsetX}px)`,
                    transform: `translate(-50%, -50%) scale(${state.scale})`,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <img
                    src={displayAvatar}
                    alt={state.playerName}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (!img.src.includes('unknown.webp')) {
                        img.src = DEFAULT_PLAYER_AVATAR;
                      }
                    }}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.35))',
                    }}
                  />
                </div>
              );
            })()}
          </div>

          {/* 3. Card Typography & Badges Overlay Layer (Precise FUTBIN Layout) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 3,
              pointerEvents: 'none',
              color: textColor,
              fontFamily: '"Barlow Condensed", "Saira Condensed", "DIN Alternate", sans-serif',
            }}
          >
            {/* Top Left: OVR, Position, Role (FUTBIN coordinates: 22.29% top, 17.00% left) */}
            <div
              style={{
                position: 'absolute',
                top: '22.29%',
                left: '17.00%',
                width: '13.3%',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                lineHeight: 1,
              }}
            >
              {/* OVR */}
              <span
                style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  letterSpacing: '-1px',
                  lineHeight: '0.88',
                  textShadow: template.textTheme === 'dark' ? '0 1px 2px rgba(255,255,255,0.4)' : '0 1px 3px rgba(0,0,0,0.6)',
                }}
              >
                {state.rating}
              </span>

              {/* Position */}
              <span
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  lineHeight: '1',
                  marginTop: '2px',
                  textShadow: template.textTheme === 'dark' ? '0 1px 2px rgba(255,255,255,0.4)' : '0 1px 3px rgba(0,0,0,0.6)',
                }}
              >
                {state.position.toUpperCase()}
              </span>

              {/* Role Intensity */}
              {state.roleIntensity && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    lineHeight: '1',
                    marginTop: '2px',
                    color: template.accentColor || '#ef4444',
                    textShadow: '0 0 4px rgba(0,0,0,0.7)',
                  }}
                >
                  {state.roleIntensity}
                </span>
              )}
            </div>

            {/* Top Right: Alt Positions Badges (EA FC 26 Hexagon Polygon Style) */}
            {state.showAltPositions && state.altPositions && state.altPositions.length > 0 && (() => {
              const positions = state.altPositions.filter((p) => p && p.trim().length > 0);
              if (positions.length === 0) return null;

              const count = positions.length;
              const badgeW = 38;
              const itemH = 22;
              const badgeH = itemH * count;
              const chev = 6;
              const strokeW = 1.5;

              const textColor = state.altPositionTextColor || '#ffffff';
              const borderColor = state.altPositionBorderColor || '#ffffff';
              const bgColor = state.altPositionBgColor || '#623B91';

              const pathD = `M 1,${chev} L ${badgeW / 2},1 L ${badgeW - 1},${chev} L ${badgeW - 1},${badgeH - chev} L ${badgeW / 2},${badgeH - 1} L 1,${badgeH - chev} Z`;

              return (
                <div
                  style={{
                    position: 'absolute',
                    top: '25.5%',
                    right: '3.8%',
                    width: `${badgeW}px`,
                    height: `${badgeH}px`,
                    filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
                    pointerEvents: 'none',
                    zIndex: 6,
                  }}
                >
                  <svg
                    width={badgeW}
                    height={badgeH}
                    viewBox={`0 0 ${badgeW} ${badgeH}`}
                    style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
                  >
                    {/* Badge Background & Outer Border */}
                    <path
                      d={pathD}
                      fill={bgColor}
                      stroke={borderColor}
                      strokeWidth={strokeW}
                      strokeLinejoin="miter"
                    />
                    {/* Horizontal Dividing Lines */}
                    {positions.slice(0, -1).map((_, idx) => {
                      const lineY = (idx + 1) * itemH;
                      return (
                        <line
                          key={idx}
                          x1={1}
                          y1={lineY}
                          x2={badgeW - 1}
                          y2={lineY}
                          stroke={borderColor}
                          strokeWidth={strokeW}
                        />
                      );
                    })}
                  </svg>

                  {/* Position Text Elements */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      fontFamily: '"Barlow Condensed", "Saira Condensed", "DIN Alternate", sans-serif',
                      fontWeight: 700,
                      color: textColor,
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                    }}
                  >
                    {positions.map((pos, idx) => (
                      <div
                        key={idx}
                        style={{
                          height: `${itemH}px`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: pos.length > 3 ? '10px' : '12px',
                          lineHeight: 1,
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          paddingTop: idx === 0 ? '2px' : 0,
                          paddingBottom: idx === count - 1 ? '2px' : 0,
                        }}
                      >
                        {pos}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Center Name Banner (FUTBIN coordinates: 63.83% top, 11% left, 78% width) */}
            <div
              style={{
                position: 'absolute',
                top: '63.83%',
                left: '11.00%',
                width: '78.00%',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  textShadow: template.textTheme === 'dark' ? '0 1px 2px rgba(255,255,255,0.4)' : '0 1px 4px rgba(0,0,0,0.7)',
                }}
              >
                {state.playerName || 'CẦU THỦ'}
              </span>

              {state.isInjuryProne && (
                <span
                  title="Cầu thủ dễ chấn thương"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                    borderRadius: '5px',
                    padding: '1px 4px',
                    fontSize: '10px',
                    color: 'white',
                    fontWeight: 900,
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)',
                    border: '1px solid rgba(255,255,255,0.6)',
                  }}
                >
                  🩹
                </span>
              )}
            </div>

            {/* 6 Face Stats Row (FUTBIN coordinates: 71.31% top, 11% left, 78% width) */}
            {state.showStats && (
              <div
                style={{
                  position: 'absolute',
                  top: '71.31%',
                  left: '11.00%',
                  width: '78.00%',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  textAlign: 'center',
                }}
              >
                {faceStatsList.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        color: subTextColor,
                        letterSpacing: '0.3px',
                        lineHeight: 1.1,
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        lineHeight: 1.1,
                        marginTop: '1px',
                        textShadow: template.textTheme === 'dark' ? '0 1px 2px rgba(255,255,255,0.3)' : '0 1px 3px rgba(0,0,0,0.6)',
                      }}
                    >
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Badges: Vietnam Flag + Chấm Hết FC (.HẾT) Logo (FUTBIN coordinates: 81.37% top, centered) */}
            <div
              style={{
                position: 'absolute',
                top: '81.37%',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                zIndex: 4,
              }}
            >
              {/* Vietnam Flag */}
              {state.showNation !== false && (
                <div
                  style={{
                    width: '24px',
                    height: '16px',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#da251d',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={nationFlag}
                    alt={selectedNation?.name || 'Việt Nam'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              {/* Chấm Hết FC Logo (.HẾT) */}
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.5))',
                }}
              >
                <img
                  src={clubLogo || '/fut-cards/clubs/cham_het_fc.png'}
                  alt="Chấm Hết FC"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
