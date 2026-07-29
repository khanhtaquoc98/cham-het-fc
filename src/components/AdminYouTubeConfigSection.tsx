'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { YouTubeVideoConfig } from '@/types/youtube';
import { extractYouTubeId } from '@/lib/youtube-utils';
import { YouTubeSyncPlayer, YouTubeSyncPlayerRef } from '@/components/YouTubeSyncPlayer';
import { YouTubeCaptionSection } from '@/components/YouTubeCaptionSection';
import { toast } from 'react-hot-toast';
import { Video, Save } from 'lucide-react';

interface Props {
  matchId?: string;
}

export const AdminYouTubeConfigSection: React.FC<Props> = ({ matchId = 'default_match' }) => {
  const [configs, setConfigs] = useState<YouTubeVideoConfig[]>([
    { slot: 1, match_id: matchId, youtube_url: '', youtube_id: '', title: 'Hiệp 1 / Cam 1', start_offset_seconds: 0 },
    { slot: 2, match_id: matchId, youtube_url: '', youtube_id: '', title: 'Hiệp 2 / Cam 2', start_offset_seconds: 0 },
  ]);

  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const playerRef = useRef<YouTubeSyncPlayerRef>(null);

  // ── Load Configs from DB ──
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/youtube-config?match_id=${matchId}`);
      const data = await res.json();
      if (data.configs && data.configs.length > 0) {
        const slot1 = data.configs.find((c: YouTubeVideoConfig) => c.slot === 1) || { slot: 1, match_id: matchId, youtube_url: '', youtube_id: '', title: 'Hiệp 1 / Cam 1', start_offset_seconds: 0 };
        const slot2 = data.configs.find((c: YouTubeVideoConfig) => c.slot === 2) || { slot: 2, match_id: matchId, youtube_url: '', youtube_id: '', title: 'Hiệp 2 / Cam 2', start_offset_seconds: 0 };
        setConfigs([slot1, slot2]);
      }
    } catch {
      console.error('Error fetching YouTube config');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // ── Save Configs to DB ──
  const handleSaveConfigs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const preparedConfigs = configs.map(c => ({
        ...c,
        youtube_id: extractYouTubeId(c.youtube_url)
      }));

      const res = await fetch('/api/youtube-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          configs: preparedConfigs
        })
      });

      const data = await res.json();
      if (data.success) {
        setConfigs(data.configs);
        toast.success('Đã lưu cấu hình 2 Video YouTube!');
      } else {
        toast.error(data.error || 'Lỗi khi lưu cấu hình');
      }
    } catch {
      toast.error('Lỗi kết nối khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  // ── Offset Change Callback from Player ──
  const handleOffsetChange = (slot: 1 | 2, newOffset: number) => {
    setConfigs(prev => prev.map(c => c.slot === slot ? { ...c, start_offset_seconds: newOffset } : c));
    toast.success(`Đã tự động tính độ trễ Video 2: ${newOffset}s`);
    setTimeout(() => handleSaveConfigs(), 300);
  };

  const handleSeekFromCaption = (slot: 1 | 2, seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(slot, seconds, true);
    }
  };

  const handleGetCurrentVideoTime = () => {
    if (playerRef.current) {
      return playerRef.current.getCurrentTimes();
    }
    return { time1: 0, time2: 0 };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Admin Config Card (Explicit Light Theme Styles) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        color: '#0f172a'
      }}>
        {/* Card Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '16px',
          marginBottom: '16px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '10px',
              borderRadius: '12px',
              background: '#e0e7ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Video size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Cấu Hình 2 Video YouTube Trận Đấu
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '16px',
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a'
                }}>
                  Tối Đa 2 Link Video
                </span>
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Nhập link YouTube và căn độ trễ trực tiếp trên cùng màn hình
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveConfigs}
            disabled={saving}
            style={{
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              opacity: saving ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            <Save size={16} />
            {saving ? 'Đang Lưu...' : 'Lưu Cấu Hình Video'}
          </button>
        </div>

        {/* Inputs Grid for 2 Video Slots */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Slot 1 Input */}
          <div style={{
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800 }}>
              <span style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                Slot 1 (Video Mốc Chuẩn)
              </span>
              <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace', marginLeft: 'auto' }}>
                Master Offset: 0s
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Tiêu đề Video 1
              </label>
              <input
                type="text"
                value={configs[0]?.title || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setConfigs(prev => [ { ...prev[0], title: val }, prev[1] ]);
                }}
                placeholder="Hiệp 1 / Cam 1..."
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Link YouTube Video 1
              </label>
              <input
                type="text"
                value={configs[0]?.youtube_url || ''}
                onChange={(e) => {
                  const url = e.target.value;
                  setConfigs(prev => [ { ...prev[0], youtube_url: url, youtube_id: extractYouTubeId(url) }, prev[1] ]);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Slot 2 Input */}
          <div style={{
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800 }}>
              <span style={{ color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
                Slot 2 (Video Phụ / Multi-Cam)
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#92400e',
                background: '#fef3c7',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #fde68a',
                fontFamily: 'monospace'
              }}>
                Delay: {configs[1]?.start_offset_seconds || 0}s
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Tiêu đề Video 2
              </label>
              <input
                type="text"
                value={configs[1]?.title || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setConfigs(prev => [ prev[0], { ...prev[1], title: val } ]);
                }}
                placeholder="Hiệp 2 / Cam 2..."
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Link YouTube Video 2
              </label>
              <input
                type="text"
                value={configs[1]?.youtube_url || ''}
                onChange={(e) => {
                  const url = e.target.value;
                  setConfigs(prev => [ prev[0], { ...prev[1], youtube_url: url, youtube_id: extractYouTubeId(url) } ]);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Độ trễ giây (Offset Seconds)
              </label>
              <input
                type="number"
                value={configs[1]?.start_offset_seconds || 0}
                onChange={(e) => {
                  const sec = Number(e.target.value) || 0;
                  setConfigs(prev => [ prev[0], { ...prev[1], start_offset_seconds: sec } ]);
                }}
                placeholder="0"
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#4338ca',
                  fontWeight: 800,
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Admin Sync Player */}
      <YouTubeSyncPlayer
        ref={playerRef}
        configs={configs}
        isAdmin={true}
        onOffsetChange={handleOffsetChange}
      />

      {/* Embedded Admin Caption Section with Refresh Data Button */}
      <YouTubeCaptionSection
        matchId={matchId}
        configs={configs}
        isAdmin={true}
        onSeek={handleSeekFromCaption}
        getCurrentVideoTime={handleGetCurrentVideoTime}
      />
    </div>
  );
};
