'use client';

import React from 'react';
import { PitchType, UserRole } from './types';
import { FORMATION_PRESETS, getRequiredOutfieldCount } from './formations';
import {
  RotateCcw,
  Trash2,
  TrendingUp,
  Palette,
  Undo2,
} from 'lucide-react';

interface ControlPanelProps {
  role: UserRole;
  pitchType: PitchType;
  formationA: string;
  formationB: string;
  teamAColor: string;
  teamBColor: string;
  gkColor: string;
  arrowColor: string;
  isDrawingMode: boolean;
  arrowCount: number;
  onChangePitchType: (type: PitchType) => void;
  onChangeFormationA: (formation: string) => void;
  onChangeFormationB: (formation: string) => void;
  onChangeTeamAColor: (color: string) => void;
  onChangeTeamBColor: (color: string) => void;
  onChangeGkColor: (color: string) => void;
  onChangeArrowColor: (color: string) => void;
  onToggleDrawingMode: () => void;
  onUndoLastArrow: () => void;
  onClearAllArrows: () => void;
  onResetFormation: () => void;
  onLogout: () => void;
}

const COLOR_PRESETS = [
  { name: 'Đỏ', hex: '#ef4444' },
  { name: 'Trắng', hex: '#ffffff' },
  { name: 'Đen', hex: '#111827' },
  { name: 'Vàng', hex: '#f59e0b' },
  { name: 'Xanh dương', hex: '#3b82f6' },
  { name: 'Xanh lá', hex: '#10b981' },
  { name: 'Tím', hex: '#8b5cf6' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  role,
  pitchType,
  formationA,
  formationB,
  teamAColor,
  teamBColor,
  gkColor,
  arrowColor,
  isDrawingMode,
  arrowCount,
  onChangePitchType,
  onChangeFormationA,
  onChangeFormationB,
  onChangeTeamAColor,
  onChangeTeamBColor,
  onChangeGkColor,
  onChangeArrowColor,
  onToggleDrawingMode,
  onUndoLastArrow,
  onClearAllArrows,
  onResetFormation,
  onLogout,
}) => {
  const isHlv = role === 'hlv';

  const isPresetA = FORMATION_PRESETS[pitchType].includes(formationA);
  const isPresetB = FORMATION_PRESETS[pitchType].includes(formationB);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>


      {/* HLV Toolbar Controls (Stacked Single Column for Left Sidebar) */}
      {isHlv ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Pitch Type Selector */}
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
              ⚽ CHỌN KÍCH THƯỚC SÂN
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {([5, 7, 11] as PitchType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => onChangePitchType(type)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: pitchType === type ? '2px solid #ef4444' : '1px solid #cbd5e1',
                    background: pitchType === type ? '#ef4444' : '#ffffff',
                    color: pitchType === type ? '#ffffff' : '#1e293b',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: pitchType === type ? '0 2px 6px rgba(239, 68, 68, 0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  Sân {type}
                </button>
              ))}
            </div>
          </div>

          {/* Team Formations Presets */}
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
              📋 ĐỘI HÌNH BAN ĐẦU (SÂN {pitchType})
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Team A Formation */}
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: '3px' }}>
                  ● Đội Đỏ (Team A)
                </span>
                <select
                  value={isPresetA ? formationA : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      const defaultCustom = pitchType === 5 ? '2-1-1' : pitchType === 7 ? '2-2-2' : '4-1-2-3';
                      onChangeFormationA(defaultCustom);
                    } else {
                      onChangeFormationA(val);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: '#ffffff',
                    color: '#1e293b',
                    outline: 'none',
                  }}
                >
                  {FORMATION_PRESETS[pitchType].map((f) => (
                    <option key={f} value={f}>
                      Sơ đồ {f}
                    </option>
                  ))}
                  <option value="custom">⚙️ Tùy chỉnh (Custom)...</option>
                </select>

                {/* Custom Input for Team A */}
                {!isPresetA && (() => {
                  const reqCount = getRequiredOutfieldCount(pitchType);
                  const parts = formationA.split('-').map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
                  const currentSum = parts.reduce((acc, v) => acc + v, 0);
                  const isValid = currentSum === reqCount;

                  return (
                    <div style={{ marginTop: '5px' }}>
                      <input
                        type="text"
                        value={formationA}
                        onChange={(e) => onChangeFormationA(e.target.value)}
                        placeholder={pitchType === 5 ? 'Ví dụ: 2-1-1' : pitchType === 7 ? 'Ví dụ: 2-2-2' : 'Ví dụ: 4-1-2-3'}
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${isValid ? '#16a34a' : '#f87171'}`,
                          fontSize: '12px',
                          fontWeight: 700,
                          outline: 'none',
                          background: '#ffffff',
                          color: '#0f172a',
                        }}
                      />
                      <div style={{ fontSize: '10px', marginTop: '2px', fontWeight: 600 }}>
                        {isValid ? (
                          <span style={{ color: '#16a34a' }}>✔ Hợp lệ! (Tổng = {currentSum}/{reqCount} cầu thủ)</span>
                        ) : (
                          <span style={{ color: '#dc2626' }}>❌ Cần tổng số = {reqCount} (Hiện tại: {currentSum})</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Team B Formation */}
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  ○ Đội Trắng/Đen (Team B)
                </span>
                <select
                  value={isPresetB ? formationB : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      const defaultCustom = pitchType === 5 ? '2-1-1' : pitchType === 7 ? '2-2-2' : '4-1-2-3';
                      onChangeFormationB(defaultCustom);
                    } else {
                      onChangeFormationB(val);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: '#ffffff',
                    color: '#1e293b',
                    outline: 'none',
                  }}
                >
                  {FORMATION_PRESETS[pitchType].map((f) => (
                    <option key={f} value={f}>
                      Sơ đồ {f}
                    </option>
                  ))}
                  <option value="custom">⚙️ Tùy chỉnh (Custom)...</option>
                </select>

                {/* Custom Input for Team B */}
                {!isPresetB && (() => {
                  const reqCount = getRequiredOutfieldCount(pitchType);
                  const parts = formationB.split('-').map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
                  const currentSum = parts.reduce((acc, v) => acc + v, 0);
                  const isValid = currentSum === reqCount;

                  return (
                    <div style={{ marginTop: '5px' }}>
                      <input
                        type="text"
                        value={formationB}
                        onChange={(e) => onChangeFormationB(e.target.value)}
                        placeholder={pitchType === 5 ? 'Ví dụ: 2-1-1' : pitchType === 7 ? 'Ví dụ: 2-2-2' : 'Ví dụ: 4-1-2-3'}
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${isValid ? '#16a34a' : '#f87171'}`,
                          fontSize: '12px',
                          fontWeight: 700,
                          outline: 'none',
                          background: '#ffffff',
                          color: '#0f172a',
                        }}
                      />
                      <div style={{ fontSize: '10px', marginTop: '2px', fontWeight: 600 }}>
                        {isValid ? (
                          <span style={{ color: '#16a34a' }}>✔ Hợp lệ! (Tổng = {currentSum}/{reqCount} cầu thủ)</span>
                        ) : (
                          <span style={{ color: '#dc2626' }}>❌ Cần tổng số = {reqCount} (Hiện tại: {currentSum})</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Row 2: Player Colors & Arrow Tools */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Color Customization */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Palette size={13} style={{ color: '#ef4444' }} /> MÀU CẦU THỦ CIRCLE (Trắng/Đen/Đỏ)
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* Team A Color */}
                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: '3px' }}>● Đội Red (A):</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {COLOR_PRESETS.slice(0, 3).map((c) => (
                      <div
                        key={c.hex}
                        onClick={() => onChangeTeamAColor(c.hex)}
                        title={`Màu ${c.name}`}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: c.hex,
                          border: teamAColor === c.hex ? '2px solid #ef4444' : '1px solid #cbd5e1',
                          cursor: 'pointer',
                          boxShadow: teamAColor === c.hex ? '0 0 0 2px rgba(239,68,68,0.3)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Team B Color */}
                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>○ Đội White (B):</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {COLOR_PRESETS.slice(0, 3).map((c) => (
                      <div
                        key={c.hex}
                        onClick={() => onChangeTeamBColor(c.hex)}
                        title={`Màu ${c.name}`}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: c.hex,
                          border: teamBColor === c.hex ? '2px solid #ef4444' : '1px solid #cbd5e1',
                          cursor: 'pointer',
                          boxShadow: teamBColor === c.hex ? '0 0 0 2px rgba(239,68,68,0.3)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawing & Actions Tools */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                ✏️ VẼ MŨI TÊN & RESET
              </label>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '8px', lineHeight: '1.3' }}>
                💡 Hover vào cầu thủ hoặc bóng trên sân ➔ Nhấn icon mũi tên & kéo ra để vẽ nhanh!
              </div>

              {/* Row 1: Draw Toggle & Color Circle Pickers */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={onToggleDrawingMode}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isDrawingMode ? '#ef4444' : '#3b82f6',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s',
                  }}
                >
                  <TrendingUp size={14} /> {isDrawingMode ? 'Đang Vẽ...' : 'Vẽ Mũi Tên'}
                </button>

                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {COLOR_PRESETS.slice(0, 5).map((c) => (
                    <div
                      key={c.hex}
                      onClick={() => onChangeArrowColor(c.hex)}
                      title={`Màu ${c.name}`}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: c.hex,
                        border: arrowColor === c.hex ? '2px solid #0f172a' : '1px solid #cbd5e1',
                        cursor: 'pointer',
                        boxShadow: arrowColor === c.hex ? '0 0 0 2px rgba(15,23,42,0.2)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Row 2: Action Buttons (Undo & Clear Arrows) */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                {/* Undo Icon Button */}
                <button
                  onClick={onUndoLastArrow}
                  disabled={arrowCount === 0}
                  title="Hoàn tác mũi tên gần nhất (Undo)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#1e293b',
                    cursor: arrowCount === 0 ? 'not-allowed' : 'pointer',
                    opacity: arrowCount === 0 ? 0.4 : 1,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <Undo2 size={16} />
                </button>

                {/* Clear All Arrows Button */}
                <div className="tactical-tooltip-wrapper" style={{ flex: 1 }}>
                  <button
                    onClick={onClearAllArrows}
                    disabled={arrowCount === 0}
                    style={{
                      width: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      height: '32px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid #fecdd3',
                      background: '#fff1f2',
                      color: '#be123c',
                      fontWeight: 700,
                      fontSize: '11.5px',
                      cursor: arrowCount === 0 ? 'not-allowed' : 'pointer',
                      opacity: arrowCount === 0 ? 0.4 : 1,
                    }}
                  >
                    <Trash2 size={14} />
                    Xóa mũi tên
                    {arrowCount > 0 && (
                      <span style={{
                        fontSize: '9.5px',
                        background: '#be123c',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '0px 5px',
                        fontWeight: 800,
                      }}>
                        {arrowCount}
                      </span>
                    )}
                  </button>
                  <div className="tactical-tooltip">Xóa tất cả mũi tên</div>
                </div>
              </div>

              {/* Row 3: Centered Red Button: Reset All Positions & Arrows */}
              <button
                onClick={onResetFormation}
                title="Đặt lại vị trí đội hình ban đầu và xóa tất cả mũi tên"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
                  transition: 'all 0.2s',
                }}
              >
                <RotateCcw size={15} /> Đặt lại tất cả vị trí & mũi tên
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes tacticalPulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .tactical-tooltip-wrapper {
          position: relative;
          display: inline-flex;
        }
        .tactical-tooltip-wrapper .tactical-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-4px);
          background: #111827;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, transform 0.2s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 100;
        }
        .tactical-tooltip-wrapper .tactical-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 4px;
          border-style: solid;
          border-color: #111827 transparent transparent transparent;
        }
        .tactical-tooltip-wrapper:hover .tactical-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(-8px);
        }
      `}</style>
    </div>
  );
};
