'use client';

import React, { useState } from 'react';
import { PlayerCardCustomState } from '@/lib/fut-card-config';
import { Plus, X, RotateCcw, Check } from 'lucide-react';

export interface AltPositionsEditorProps {
  cardState: PlayerCardCustomState;
  onChange: (updater: (prev: PlayerCardCustomState) => PlayerCardCustomState) => void;
}

const COMMON_POSITIONS = [
  'ST', 'CF', 'RW', 'LW', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CB', 'LB', 'RB', 'GK'
];

const PRESET_TEXT_COLORS = ['#ffffff', '#fbbf24', '#38bdf8', '#000000'];
const PRESET_BORDER_COLORS = ['#ffffff', '#a855f7', '#fbbf24', '#38bdf8', '#000000'];
const PRESET_BG_COLORS = [
  { label: 'Tím FC 26', color: '#623B91' },
  { label: 'Xanh Navy', color: '#1e1b4b' },
  { label: 'Đen Slate', color: '#0f172a' },
  { label: 'Đỏ Crimson', color: '#831843' },
  { label: 'Xanh Biển', color: '#1e3a8a' },
  { label: 'Xanh Lá', color: '#14532d' },
];

export default function AltPositionsEditor({ cardState, onChange }: AltPositionsEditorProps) {
  const [customPosInput, setCustomPosInput] = useState('');

  const altPositions = cardState.altPositions || [];
  const showAltPositions = cardState.showAltPositions !== false;
  const textColor = cardState.altPositionTextColor || '#ffffff';
  const borderColor = cardState.altPositionBorderColor || '#ffffff';
  const bgColor = cardState.altPositionBgColor || '#623B91';

  // Toggle standard position
  const handleTogglePosition = (pos: string) => {
    onChange((prev) => {
      const current = prev.altPositions || [];
      const updated = current.includes(pos)
        ? current.filter((p) => p !== pos)
        : [...current, pos];
      return {
        ...prev,
        altPositions: updated,
        showAltPositions: true,
      };
    });
  };

  // Add custom position
  const handleAddCustomPos = () => {
    const trimmed = customPosInput.trim().toUpperCase();
    if (!trimmed) return;
    onChange((prev) => {
      const current = prev.altPositions || [];
      if (current.includes(trimmed)) return prev;
      return {
        ...prev,
        altPositions: [...current, trimmed],
        showAltPositions: true,
      };
    });
    setCustomPosInput('');
  };

  // Remove single position
  const handleRemovePosition = (indexToRemove: number) => {
    onChange((prev) => ({
      ...prev,
      altPositions: (prev.altPositions || []).filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Clear all
  const handleClearAll = () => {
    onChange((prev) => ({
      ...prev,
      altPositions: [],
    }));
  };

  // Reset 3 colors to default EA FC 26
  const handleResetColors = () => {
    onChange((prev) => ({
      ...prev,
      altPositionTextColor: '#ffffff',
      altPositionBorderColor: '#ffffff',
      altPositionBgColor: '#623B91',
    }));
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '14px 16px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* ── HEADER WITH ON/OFF TOGGLE ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>⚡</span>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e293b' }}>
              VỊ TRÍ PHỤ (ALT POSITIONS - CẠNH PHẢI THẺ)
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Khung lục giác góc nhọn FC 26, chọn nhiều vị trí & tùy chỉnh 3 màu
          </span>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={showAltPositions}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, showAltPositions: e.target.checked }))
            }
            style={{ width: '16px', height: '16px', accentColor: '#623B91', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', fontWeight: 800, color: showAltPositions ? '#623B91' : '#94a3b8' }}>
            {showAltPositions ? 'Đang bật' : 'Tắt'}
          </span>
        </label>
      </div>

      {/* ── MULTI-SELECT POSITIONS ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
            CHỌN VỊ TRÍ (BẤM ĐỂ CHỌN / BỎ CHỌN NHIỀU):
          </span>
          {altPositions.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              Xóa tất cả ({altPositions.length})
            </button>
          )}
        </div>

        {/* Standard Position Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {COMMON_POSITIONS.map((pos) => {
            const isSelected = altPositions.includes(pos);
            return (
              <button
                key={pos}
                type="button"
                onClick={() => handleTogglePosition(pos)}
                style={{
                  padding: '5px 11px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  background: isSelected ? '#623B91' : '#f8fafc',
                  color: isSelected ? '#ffffff' : '#334155',
                  border: isSelected ? '1px solid #4a2872' : '1px solid #cbd5e1',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 6px rgba(98, 59, 145, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && <Check size={11} strokeWidth={3} />}
                <span>{pos}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CUSTOM POSITION INPUT ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="text"
          placeholder="Thêm vị trí khác (vd: GK, KK, SS...)"
          value={customPosInput}
          onChange={(e) => setCustomPosInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustomPos();
            }
          }}
          maxLength={6}
          style={{
            flex: 1,
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            background: '#f8fafc',
            textTransform: 'uppercase',
            fontWeight: 700,
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={handleAddCustomPos}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            background: '#623B91',
            color: '#ffffff',
            border: 'none',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(98, 59, 145, 0.25)',
          }}
        >
          <Plus size={13} strokeWidth={2.5} />
          <span>Thêm</span>
        </button>
      </div>

      {/* ── SELECTED POSITIONS CHIPS ── */}
      {altPositions.length > 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            padding: '8px 10px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
          }}
        >
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
            Đang hiển thị trên thẻ ({altPositions.length}):
          </span>
          {altPositions.map((p, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: bgColor,
                color: textColor,
                border: `1.5px solid ${borderColor}`,
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 900,
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }}
            >
              {p}
              <button
                type="button"
                onClick={() => handleRemovePosition(idx)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  lineHeight: 1,
                  opacity: 0.8,
                }}
                title={`Xóa ${p}`}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
          * Chưa chọn vị trí phụ nào (khung cạnh phải thẻ sẽ ẩn đi).
        </div>
      )}

      {/* ── 3 COLOR CONTROLS: TEXT, BORDER, BG ── */}
      <div
        style={{
          padding: '12px',
          borderRadius: '10px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155' }}>
            🎨 TÙY CHỈNH 3 MÀU KHUNG VỊ TRÍ PHỤ:
          </span>
          <button
            type="button"
            onClick={handleResetColors}
            style={{
              background: 'none',
              border: 'none',
              color: '#623B91',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCcw size={11} />
            <span>Mặc định (Tím EA)</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
          {/* 1. TEXT COLOR */}
          <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>
              1. Màu Chữ (Text)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={textColor.startsWith('#') && textColor.length === 7 ? textColor : '#ffffff'}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, altPositionTextColor: e.target.value }))
                }
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  padding: '1px',
                }}
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, altPositionTextColor: e.target.value }))
                }
                style={{
                  width: '80px',
                  padding: '5px 6px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 700,
                  textAlign: 'center',
                  background: '#f8fafc',
                }}
              />
            </div>
            {/* Quick swatches */}
            <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
              {PRESET_TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, altPositionTextColor: c }))}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: c,
                    border: textColor.toLowerCase() === c.toLowerCase() ? '2px solid #ef4444' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* 2. BORDER COLOR */}
          <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>
              2. Màu Viền (Border)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={borderColor.startsWith('#') && borderColor.length === 7 ? borderColor : '#ffffff'}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, altPositionBorderColor: e.target.value }))
                }
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  padding: '1px',
                }}
              />
              <input
                type="text"
                value={borderColor}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, altPositionBorderColor: e.target.value }))
                }
                style={{
                  width: '80px',
                  padding: '5px 6px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 700,
                  textAlign: 'center',
                  background: '#f8fafc',
                }}
              />
            </div>
            {/* Quick swatches */}
            <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
              {PRESET_BORDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, altPositionBorderColor: c }))}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: c,
                    border: borderColor.toLowerCase() === c.toLowerCase() ? '2px solid #ef4444' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* 3. BG COLOR */}
          <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>
              3. Màu Nền (Background)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={bgColor.startsWith('#') && bgColor.length === 7 ? bgColor : '#623B91'}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, altPositionBgColor: e.target.value }))
                }
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  padding: '1px',
                }}
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, altPositionBgColor: e.target.value }))
                }
                style={{
                  width: '80px',
                  padding: '5px 6px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 700,
                  textAlign: 'center',
                  background: '#f8fafc',
                }}
              />
            </div>
            {/* Quick swatches */}
            <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
              {PRESET_BG_COLORS.map(({ color, label }) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, altPositionBgColor: color }))}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: color,
                    border: bgColor.toLowerCase() === color.toLowerCase() ? '2px solid #ef4444' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                  }}
                  title={label}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
