'use client';

import React, { useRef, useState, useEffect } from 'react';
import { TacticalPlayer, TacticalArrow, TacticalBall, UserRole } from './types';
import { Edit2, X, Check } from 'lucide-react';

interface TacticalPitchProps {
  role: UserRole;
  players: TacticalPlayer[];
  ball: TacticalBall;
  arrows: TacticalArrow[];
  teamAColor: string;
  teamBColor: string;
  gkColor: string;
  arrowColor: string;
  isDrawingMode: boolean;
  isAnimating?: boolean;
  onUpdatePlayerPos: (id: string, x: number, y: number) => void;
  onUpdateBallPos: (x: number, y: number) => void;
  onAddArrow: (arrow: TacticalArrow) => void;
  onDeleteSingleArrow?: (id: string) => void;
  onUpdatePlayerDetails?: (id: string, number: number | string, name: string) => void;
}

export const TacticalPitch: React.FC<TacticalPitchProps> = ({
  role,
  players,
  ball,
  arrows,
  teamAColor,
  teamBColor,
  gkColor,
  arrowColor,
  isDrawingMode,
  isAnimating = false,
  onUpdatePlayerPos,
  onUpdateBallPos,
  onAddArrow,
  onDeleteSingleArrow,
  onUpdatePlayerDetails,
}) => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const isHlv = role === 'hlv';

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedArrowId, setSelectedArrowId] = useState<string | null>(null);

  // Arrow drawing state
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [currentArrowEnd, setCurrentArrowEnd] = useState<{ x: number; y: number } | null>(null);

  // Player details modal state (for HLV)
  const [editingPlayer, setEditingPlayer] = useState<TacticalPlayer | null>(null);
  const [editNum, setEditNum] = useState<string>('');
  const [editName, setEditName] = useState<string>('');

  // Get percentage coordinates from mouse/touch event
  const getRelativeCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!pitchRef.current) return { x: 50, y: 50 };
    const rect = pitchRef.current.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const x = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 2), 98);
    const y = Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 3), 97);

    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  // Start dragging player or ball
  const handleStartDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    if (!isHlv || isDrawingMode) return;
    e.stopPropagation();
    setSelectedArrowId(null);
    setDraggingId(id);
  };

  // Start arrow drawing or deselect arrow
  const handlePitchMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isHlv) return;
    if (isDrawingMode) {
      const coords = getRelativeCoords(e);
      setDrawingStart(coords);
      setCurrentArrowEnd(coords);
    } else {
      setSelectedArrowId(null);
    }
  };

  // Global mouse/touch move & end listeners when dragging or drawing
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const coords = getRelativeCoords(e);

      if (draggingId) {
        if (draggingId === 'ball') {
          onUpdateBallPos(coords.x, coords.y);
        } else {
          onUpdatePlayerPos(draggingId, coords.x, coords.y);
        }
      } else if (drawingStart) {
        setCurrentArrowEnd(coords);
      }
    };

    const handleEnd = () => {
      if (draggingId) {
        setDraggingId(null);
      }

      if (drawingStart && currentArrowEnd && isHlv) {
        // Calculate distance to ignore micro-clicks
        const dx = currentArrowEnd.x - drawingStart.x;
        const dy = currentArrowEnd.y - drawingStart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 2) {
          onAddArrow({
            id: `arrow_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            startX: drawingStart.x,
            startY: drawingStart.y,
            endX: currentArrowEnd.x,
            endY: currentArrowEnd.y,
            color: arrowColor || '#e53935',
          });
        }
        setDrawingStart(null);
        setCurrentArrowEnd(null);
      }
    };

    if (draggingId || drawingStart) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [draggingId, drawingStart, currentArrowEnd, isHlv, arrowColor]);

  const openPlayerEdit = (player: TacticalPlayer, e: React.MouseEvent) => {
    if (!isHlv) return;
    e.stopPropagation();
    setEditingPlayer(player);
    setEditNum(String(player.number));
    setEditName(player.name);
  };

  const savePlayerEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlayer && onUpdatePlayerDetails) {
      onUpdatePlayerDetails(editingPlayer.id, editNum.trim(), editName.trim());
    }
    setEditingPlayer(null);
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none',
      overflow: 'hidden',
    }}>
      {/* Pitch Canvas Container */}
      <div
        ref={pitchRef}
        onMouseDown={handlePitchMouseDown}
        onTouchStart={handlePitchMouseDown}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '100%',
          aspectRatio: '1.42 / 1',
          margin: 'auto',
          background: 'linear-gradient(180deg, #1b432c 0%, #143622 50%, #0f2a1a 100%)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 0 15px rgba(0, 0, 0, 0.2)',
          border: '3px solid rgba(255,255,255,0.18)',
          cursor: isDrawingMode ? 'crosshair' : isHlv ? 'default' : 'not-allowed',
        }}
      >
        {/* Grass Pattern / Stripes */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(90deg, 
            rgba(255,255,255,0.03) 0px, 
            rgba(255,255,255,0.03) 8%, 
            transparent 8%, 
            transparent 16%)`,
          pointerEvents: 'none',
        }} />

        {/* Pitch Lines (Crisp White Markings) */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <g stroke="rgba(255, 255, 255, 0.75)" strokeWidth="0.5" fill="none">
            {/* Outer Boundary */}
            <rect x="2" y="3" width="96" height="94" rx="0.5" />

            {/* Halfway Line */}
            <line x1="50" y1="3" x2="50" y2="97" />

            {/* Center Circle */}
            <circle cx="50" cy="50" r="13" />
            <circle cx="50" cy="50" r="0.8" fill="rgba(255,255,255,0.85)" stroke="none" />

            {/* Left Penalty Area */}
            <rect x="2" y="22" width="16" height="56" />
            {/* Left Goal Area */}
            <rect x="2" y="36" width="6" height="28" />
            {/* Left Penalty Spot */}
            <circle cx="12" cy="50" r="0.6" fill="rgba(255,255,255,0.85)" stroke="none" />
            {/* Left Penalty Arc */}
            <path d="M 18,38 A 12 12 0 0 1 18,62" />

            {/* Right Penalty Area */}
            <rect x="82" y="22" width="16" height="56" />
            {/* Right Goal Area */}
            <rect x="92" y="36" width="6" height="28" />
            {/* Right Penalty Spot */}
            <circle cx="88" cy="50" r="0.6" fill="rgba(255,255,255,0.85)" stroke="none" />
            {/* Right Penalty Arc */}
            <path d="M 82,38 A 12 12 0 0 0 82,62" />

            {/* Left Goal Post Net */}
            <rect x="0.5" y="42" width="1.5" height="16" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" fill="rgba(255,255,255,0.08)" />
            {/* Right Goal Post Net */}
            <rect x="98" y="42" width="1.5" height="16" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" fill="rgba(255,255,255,0.08)" />

            {/* Corner Arcs */}
            <path d="M 2,6 A 3 3 0 0 0 5,3" />
            <path d="M 2,94 A 3 3 0 0 1 5,97" />
            <path d="M 98,6 A 3 3 0 0 1 95,3" />
            <path d="M 98,94 A 3 3 0 0 0 95,97" />
          </g>
        </svg>

        {/* SVG Arrow Drawing Layer */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Render Saved Arrows */}
          {arrows.map((arr) => {
            const color = arr.color || '#e53935';
            const isSelected = selectedArrowId === arr.id;
            const ASPECT_RATIO = 1.38;
            const dx = (arr.endX - arr.startX) * ASPECT_RATIO;
            const dy = arr.endY - arr.startY;
            const angle = Math.atan2(dy, dx);
            const headLen = 2.4;
            const arrowAngle = 0.35;

            // Line ends at the back center of the arrowhead
            const baseCenterLen = headLen * 0.7;
            const lineEndX = arr.endX - (baseCenterLen * Math.cos(angle)) / ASPECT_RATIO;
            const lineEndY = arr.endY - baseCenterLen * Math.sin(angle);

            const xL = arr.endX - (headLen * Math.cos(angle - arrowAngle)) / ASPECT_RATIO;
            const yL = arr.endY - headLen * Math.sin(angle - arrowAngle);
            const xR = arr.endX - (headLen * Math.cos(angle + arrowAngle)) / ASPECT_RATIO;
            const yR = arr.endY - headLen * Math.sin(angle + arrowAngle);

            const polygonPoints = `${arr.endX},${arr.endY} ${xL},${yL} ${xR},${yR}`;

            return (
              <g key={arr.id}>
                {/* Selection Outline Glow */}
                {isSelected && (
                  <line
                    x1={arr.startX}
                    y1={arr.startY}
                    x2={arr.endX}
                    y2={arr.endY}
                    stroke="#ffd700"
                    strokeWidth="1.8"
                    opacity="0.8"
                    strokeDasharray="1.5, 1"
                  />
                )}

                {/* Arrow Shaft Line */}
                <line
                  x1={arr.startX}
                  y1={arr.startY}
                  x2={lineEndX}
                  y2={lineEndY}
                  stroke={color}
                  strokeWidth="0.55"
                  strokeDasharray={color === '#ffffff' ? '1.5, 1' : 'none'}
                />
                <polygon points={polygonPoints} fill={color} />

                {/* Wide Click/Touch Target Line */}
                <line
                  x1={arr.startX}
                  y1={arr.startY}
                  x2={arr.endX}
                  y2={arr.endY}
                  stroke="transparent"
                  strokeWidth="5"
                  style={{ pointerEvents: isHlv ? 'stroke' : 'none', cursor: isHlv ? 'pointer' : 'default' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isHlv) {
                      setSelectedArrowId(isSelected ? null : arr.id);
                    }
                  }}
                />
              </g>
            );
          })}

          {/* Render Currently Drawing Arrow */}
          {drawingStart && currentArrowEnd && (() => {
            const color = arrowColor || '#e53935';
            const ASPECT_RATIO = 1.38;
            const dx = (currentArrowEnd.x - drawingStart.x) * ASPECT_RATIO;
            const dy = currentArrowEnd.y - drawingStart.y;
            const angle = Math.atan2(dy, dx);
            const headLen = 2.4;
            const arrowAngle = 0.35;

            const baseCenterLen = headLen * 0.7;
            const lineEndX = currentArrowEnd.x - (baseCenterLen * Math.cos(angle)) / ASPECT_RATIO;
            const lineEndY = currentArrowEnd.y - baseCenterLen * Math.sin(angle);

            const xL = currentArrowEnd.x - (headLen * Math.cos(angle - arrowAngle)) / ASPECT_RATIO;
            const yL = currentArrowEnd.y - headLen * Math.sin(angle - arrowAngle);
            const xR = currentArrowEnd.x - (headLen * Math.cos(angle + arrowAngle)) / ASPECT_RATIO;
            const yR = currentArrowEnd.y - headLen * Math.sin(angle + arrowAngle);

            const polygonPoints = `${currentArrowEnd.x},${currentArrowEnd.y} ${xL},${yL} ${xR},${yR}`;

            return (
              <g>
                <line
                  x1={drawingStart.x}
                  y1={drawingStart.y}
                  x2={lineEndX}
                  y2={lineEndY}
                  stroke={color}
                  strokeWidth="0.6"
                  strokeDasharray="2, 1"
                />
                <polygon points={polygonPoints} fill={color} />
              </g>
            );
          })()}
        </svg>

        {/* Floating Delete Button on Selected Arrow Midpoint */}
        {selectedArrowId && isHlv && (() => {
          const selectedArr = arrows.find((a) => a.id === selectedArrowId);
          if (!selectedArr) return null;
          const midX = (selectedArr.startX + selectedArr.endX) / 2;
          const midY = (selectedArr.startY + selectedArr.endY) / 2;

          return (
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (onDeleteSingleArrow) onDeleteSingleArrow(selectedArr.id);
                setSelectedArrowId(null);
              }}
              title="Xóa mũi tên này"
              style={{
                position: 'absolute',
                left: `${midX}%`,
                top: `${midY}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 45,
                background: '#ef4444',
                color: '#ffffff',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5), 0 0 0 2px #ffffff',
                transition: 'transform 0.15s ease',
              }}
            >
              <X size={14} />
            </div>
          );
        })()}

        {/* Players Layer */}
        {players.map((p) => {
          const circleBg = p.team === 'A' ? teamAColor : teamBColor;
          const textColor = (circleBg.toLowerCase() === '#ffffff' || circleBg.toLowerCase() === '#fff') ? '#000000' : '#ffffff';

          const isDraggingThis = draggingId === p.id;

          return (
            <div
              key={p.id}
              onMouseDown={(e) => handleStartDrag(p.id, e)}
              onTouchStart={(e) => handleStartDrag(p.id, e)}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isDraggingThis ? 40 : 20,
                cursor: isHlv && !isDrawingMode ? 'grab' : 'default',
                transition: isDraggingThis ? 'none' : isAnimating ? 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'all 0.15s ease-out',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Player Circle */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: circleBg,
                  color: textColor,
                  border: `2px solid ${p.team === 'A' ? '#ffffff' : '#111827'}`,
                  boxShadow: isDraggingThis
                    ? '0 10px 24px rgba(0,0,0,0.5), 0 0 0 4px rgba(255,255,255,0.4)'
                    : '0 4px 10px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '13px',
                  letterSpacing: '-0.3px',
                  userSelect: 'none',
                  position: 'relative',
                  transform: isDraggingThis ? 'scale(1.2)' : 'scale(1)',
                }}
              >
                {p.number}
                {p.isGk && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#111827',
                    color: '#ffd700',
                    fontSize: '8px',
                    fontWeight: 900,
                    padding: '1px 3px',
                    borderRadius: '4px',
                    border: '1px solid #ffd700',
                  }}>
                    GK
                  </span>
                )}
              </div>

              {/* Player Name Tag */}
              <div
                onClick={(e) => openPlayerEdit(p, e)}
                style={{
                  background: 'rgba(17, 24, 39, 0.85)',
                  backdropFilter: 'blur(4px)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  marginTop: '4px',
                  whiteSpace: 'nowrap',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  cursor: isHlv ? 'pointer' : 'default',
                }}
              >
                <span>{p.name}</span>
                {isHlv && <Edit2 size={9} style={{ opacity: 0.6 }} />}
              </div>
            </div>
          );
        })}

        {/* Soccer Ball Layer (WC 2026 Ball) */}
        <div
          onMouseDown={(e) => handleStartDrag('ball', e)}
          onTouchStart={(e) => handleStartDrag('ball', e)}
          style={{
            position: 'absolute',
            left: `${ball.x}%`,
            top: `${ball.y}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: draggingId === 'ball' ? 50 : 30,
            cursor: isHlv && !isDrawingMode ? 'grab' : 'default',
            transition: draggingId === 'ball' ? 'none' : isAnimating ? 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'all 0.15s ease-out',
          }}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            boxShadow: draggingId === 'ball'
              ? '0 12px 28px rgba(0,0,0,0.8), 0 0 20px #ffd700'
              : '0 6px 16px rgba(0,0,0,0.65), 0 0 12px rgba(255,255,255,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            transform: draggingId === 'ball' ? 'scale(1.25)' : 'scale(1)',
            overflow: 'hidden',
            background: 'transparent',
            border: 'none',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}>
            <img
              src="/wc2026-ball.png"
              alt="World Cup 2026 Ball"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                pointerEvents: 'none',
                transform: 'scale(1.06)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Edit Player Name / Number Modal */}
      {editingPlayer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}>
          <form onSubmit={savePlayerEdit} style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            width: '100%',
            maxWidth: '320px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#111827' }}>
                Sửa Cầu Thủ ({editingPlayer.team === 'A' ? 'Team Red' : 'Team White'})
              </h3>
              <button type="button" onClick={() => setEditingPlayer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Số áo
              </label>
              <input
                type="text"
                value={editNum}
                onChange={(e) => setEditNum(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', fontWeight: 700 }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                Tên cầu thủ
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', fontWeight: 600 }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #ccc', background: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#e53935', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Check size={16} /> Lưu
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @keyframes pitchLivePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.88); }
        }
      `}</style>
    </div>
  );
};
