'use client';

import React from 'react';
import { PlayerCardCustomState } from '@/lib/fut-card-config';
import { User } from 'lucide-react';

export interface PlayerStatsEditorProps {
  cardState: PlayerCardCustomState;
  onChange: (updater: (prev: PlayerCardCustomState) => PlayerCardCustomState) => void;
  onRecalculateAuto?: () => void;
}

export default function PlayerStatsEditor({
  cardState,
  onChange,
  onRecalculateAuto,
}: PlayerStatsEditorProps) {


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ── 1. TÊN CẦU THỦ & CHỈ SỐ TỔNG (OVR RATING) ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <User size={15} color="#ef4444" />
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e293b' }}>
            THÔNG TIN CƠ BẢN TRÊN THẺ
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
          {/* Player Name */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>
              TÊN HIỂN THỊ TRÊN THẺ
            </label>
            <input
              type="text"
              value={cardState.playerName}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, playerName: e.target.value.toUpperCase() }))
              }
              placeholder="VD: NGHĨA, MESSI, RONALDO..."
              maxLength={20}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 900,
                textTransform: 'uppercase',
                background: '#f8fafc',
                outline: 'none',
              }}
            />
          </div>

          {/* OVR Rating */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
                CHỈ SỐ TỔNG (OVR RATING)
              </label>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#ef4444' }}>
                {cardState.rating} OVR
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                min={45}
                max={99}
                value={cardState.rating}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const num = isNaN(val) ? 75 : Math.max(45, Math.min(99, val));
                  onChange((prev) => ({ ...prev, rating: num }));
                }}
                style={{
                  width: '65px',
                  padding: '7px 8px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 900,
                  textAlign: 'center',
                  background: '#f8fafc',
                  outline: 'none',
                }}
              />
              <input
                type="range"
                min={45}
                max={99}
                value={cardState.rating}
                onChange={(e) => {
                  const num = parseInt(e.target.value, 10);
                  onChange((prev) => ({ ...prev, rating: num }));
                }}
                style={{ flex: 1, accentColor: '#ef4444', cursor: 'pointer' }}
              />
            </div>
            {/* Quick rating presets */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              {[75, 82, 86, 90, 94, 99].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, rating: preset }))}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '5px',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    background: cardState.rating === preset ? '#fee2e2' : '#f1f5f9',
                    color: cardState.rating === preset ? '#dc2626' : '#475569',
                    border: cardState.rating === preset ? '1px solid #ef4444' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. 6 CHỈ SỐ MẶT THẺ (FACE STATS) - TỰ ĐỘNG TỪ TRẬN ĐẤU THỰC TẾ ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px' }}>📊</span>
              <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e293b' }}>
                6 CHỈ SỐ MẶT THẺ (FACE STATS)
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: '#16a34a',
                  background: '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0',
                }}
              >
                Tự động từ dữ liệu thực tế
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'block' }}>
              Hiển thị ở hàng dưới cùng trên thẻ: WR, W, D, L, P, No. (Tự động lấy theo thống kê trận đấu & số áo cầu thủ)
            </span>
          </div>
        </div>

        {/* 6 Face Stats Grid - Read-only visual cards (Responsive 6 cols on desktop, 3 cols on mobile) */}
        <div className="player-face-stats-grid">
          {/* WR */}
          <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              % THẮNG (WR)
            </span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#16a34a' }}>
              {cardState.faceStats?.wr ?? 0}%
            </span>
          </div>

          {/* W (Wins) */}
          <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#16a34a', display: 'block', marginBottom: '4px' }}>
              THẮNG (W)
            </span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#16a34a' }}>
              {cardState.faceStats?.w ?? 0}
            </span>
          </div>

          {/* D (Draws) */}
          <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#d97706', display: 'block', marginBottom: '4px' }}>
              HÒA (D)
            </span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#d97706' }}>
              {cardState.faceStats?.d ?? 0}
            </span>
          </div>

          {/* L (Losses) */}
          <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#dc2626', display: 'block', marginBottom: '4px' }}>
              THUA (L)
            </span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#dc2626' }}>
              {cardState.faceStats?.l ?? 0}
            </span>
          </div>

          {/* P (Played) */}
          <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#2563eb', display: 'block', marginBottom: '4px' }}>
              TRẬN (P)
            </span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#2563eb' }}>
              {cardState.faceStats?.p ?? 0}
            </span>
          </div>

          {/* NO (Jersey Number) */}
          <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#7c3aed', display: 'block', marginBottom: '4px' }}>
              SỐ ÁO (NO.)
            </span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#7c3aed' }}>
              {cardState.faceStats?.no ?? cardState.jerseyNumber ?? '?'}
            </span>
          </div>
        </div>
      </div>



      {/* ── 3. TÙY CHỌN HIỂN THỊ & TRẠNG THÁI ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Injury Prone Toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={Boolean(cardState.isInjuryProne)}
            onChange={(e) => onChange((prev) => ({ ...prev, isInjuryProne: e.target.checked }))}
            style={{ width: '16px', height: '16px', accentColor: '#ef4444', cursor: 'pointer' }}
          />
          <div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>
              🩹 Dễ Chấn Thương (Injury Prone)
            </span>
            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
              Hiển thị icon băng gạc đỏ cạnh tên cầu thủ
            </span>
          </div>
        </label>

        {/* Show Stats Toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={cardState.showStats !== false}
            onChange={(e) => onChange((prev) => ({ ...prev, showStats: e.target.checked }))}
            style={{ width: '16px', height: '16px', accentColor: '#0284c7', cursor: 'pointer' }}
          />
          <div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>
              📊 Hàng 6 Chỉ Số (Face Stats)
            </span>
            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
              Bật/tắt hàng chỉ số WR, W, D, L, P, No.
            </span>
          </div>
        </label>

        {/* Show Nation Flag & Club Logo Toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={cardState.showNation !== false}
            onChange={(e) => onChange((prev) => ({ ...prev, showNation: e.target.checked }))}
            style={{ width: '16px', height: '16px', accentColor: '#ef4444', cursor: 'pointer' }}
          />
          <div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>
              🇻🇳 Cờ Quốc Gia (Việt Nam) & Logo CLB (.HẾT)
            </span>
            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
              Hiển thị cờ Việt Nam và logo Chấm Hết FC ở cạnh dưới thẻ
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}
