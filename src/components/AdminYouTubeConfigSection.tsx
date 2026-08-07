'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { YouTubeVideoConfig } from '@/types/youtube';
import { extractYouTubeId } from '@/lib/youtube-utils';
import { YouTubeSyncPlayer, YouTubeSyncPlayerRef } from '@/components/YouTubeSyncPlayer';
import { YouTubeCaptionSection } from '@/components/YouTubeCaptionSection';
import { MatchHighlightSelector } from '@/components/MatchHighlightSelector';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Video, Save, Settings, Repeat, RefreshCw } from 'lucide-react';

interface Props {
  matchId?: string;
}

interface HistoryMatchOption {
  id: string;
  matchDate?: string;
  matchTime?: string;
  venue?: string;
}

export const AdminYouTubeConfigSection: React.FC<Props> = ({ matchId = 'default_match' }) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matchId);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [syncing, setSyncing] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [historyMatches, setHistoryMatches] = useState<HistoryMatchOption[]>([]);
  const [selectedTargetMatchId, setSelectedTargetMatchId] = useState<string>('');

  const handleSelectMatch = (mId: string) => {
    setSelectedMatchId(mId);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
  };

  const handleOpenSyncModal = async () => {
    try {
      const res = await fetch('/api/history?pageSize=50');
      const data = await res.json();
      const list = data.matches || [];
      setHistoryMatches(list);
      if (list.length > 0) {
        setSelectedTargetMatchId(list[0].id);
      }
      setSyncModalOpen(true);
    } catch {
      toast.error('Không thể tải danh sách trận đấu');
    }
  };

  const handleConfirmSyncToTargetMatch = async () => {
    if (!selectedTargetMatchId) {
      toast.error('Vui lòng chọn trận đấu mục tiêu');
      return;
    }
    try {
      setSyncing(true);
      const res = await fetch('/api/youtube-config/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_match_id: 'default_match',
          target_match_id: selectedTargetMatchId
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          `Đã đồng bộ toàn bộ Video & Ghi chú 2nike sang ${data.target_match_label || 'trận đã chọn'}!`,
          { icon: '🎉' }
        );
        setSyncModalOpen(false);
        setSelectedMatchId(selectedTargetMatchId);
        setViewMode('detail');
      } else {
        toast.error(data.error || 'Lỗi khi đồng bộ data');
      }
    } catch {
      toast.error('Không thể kết nối máy chủ');
    } finally {
      setSyncing(false);
    }
  };

  const [configs, setConfigs] = useState<YouTubeVideoConfig[]>([
    { slot: 1, match_id: selectedMatchId, youtube_url: '', youtube_id: '', title: 'Cam 1', start_offset_seconds: 0 },
    { slot: 2, match_id: selectedMatchId, youtube_url: '', youtube_id: '', title: 'Cam 2', start_offset_seconds: 0 },
  ]);

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const playerRef = useRef<YouTubeSyncPlayerRef>(null);

  // ── Load Configs from DB ──
  const fetchConfigs = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch(`/api/youtube-config?match_id=${selectedMatchId}`);
      const data = await res.json();
      if (data.configs && data.configs.length > 0) {
        const slot1 = data.configs.find((c: YouTubeVideoConfig) => c.slot === 1) || { slot: 1, match_id: selectedMatchId, youtube_url: '', youtube_id: '', title: 'Cam 1', start_offset_seconds: 0 };
        const slot2 = data.configs.find((c: YouTubeVideoConfig) => c.slot === 2) || { slot: 2, match_id: selectedMatchId, youtube_url: '', youtube_id: '', title: 'Cam 2', start_offset_seconds: 0 };
        setConfigs([slot1, slot2]);
      } else {
        setConfigs([
          { slot: 1, match_id: selectedMatchId, youtube_url: '', youtube_id: '', title: 'Cam 1', start_offset_seconds: 0 },
          { slot: 2, match_id: selectedMatchId, youtube_url: '', youtube_id: '', title: 'Cam 2', start_offset_seconds: 0 }
        ]);
      }
    } catch {
      console.error('Error fetching YouTube config');
    } finally {
      setLoadingConfig(false);
    }
  }, [selectedMatchId]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // ── Save Configs to DB ──
  const handleSaveConfigs = async (e?: React.FormEvent, customConfigs?: YouTubeVideoConfig[]) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const targetConfigs = customConfigs || configs;
      const preparedConfigs = targetConfigs.map(c => ({
        ...c,
        match_id: selectedMatchId,
        youtube_id: extractYouTubeId(c.youtube_url),
        start_offset_seconds: Number(c.start_offset_seconds) || 0,
      }));

      const res = await fetch('/api/youtube-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: selectedMatchId,
          configs: preparedConfigs
        })
      });

      const data = await res.json();
      if (data.success) {
        setConfigs(data.configs);
        toast.success(`Đã lưu cấu hình 2 Video YouTube cho trận ${selectedMatchId}!`);
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
    const updated = configs.map(c => c.slot === slot ? { ...c, start_offset_seconds: newOffset } : c);
    setConfigs(updated);
    handleSaveConfigs(undefined, updated);
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
      {viewMode === 'list' ? (
        /* View Mode 1: Match Cards List Selector */
        <MatchHighlightSelector
          selectedMatchId={selectedMatchId}
          onSelectMatch={handleSelectMatch}
          isAdmin={true}
        />
      ) : (
        /* View Mode 2: Admin Match Detail & Video Configuration */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Bar with Back Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            padding: '12px 18px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <button
              type="button"
              onClick={handleBackToList}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '8px 16px',
                color: '#334155',
                fontWeight: 800,
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowLeft size={16} />
              Quay lại danh sách trận đấu
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, color: '#4f46e5' }}>
              <Settings size={18} />
              <span>Đang cấu hình: {selectedMatchId === 'default_match' ? 'Trận Trực Tiếp / Mới Nhất' : selectedMatchId}</span>
            </div>
          </div>

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
                Cấu Hình 2 Video YouTube ({selectedMatchId})
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {selectedMatchId === 'default_match' && (
              <button
                type="button"
                onClick={handleOpenSyncModal}
                disabled={syncing}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  opacity: syncing ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {syncing ? <RefreshCw size={16} className="animate-spin" /> : <Repeat size={16} />}
                Sync Data Qua Trận Đấu...
              </button>
            )}

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
                Slot 1 (Cam 1)
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#047857',
                background: '#d1fae5',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #a7f3d0',
                fontFamily: 'monospace'
              }}>
                Delay: {configs[0]?.start_offset_seconds || 0}s
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
                placeholder="Cam 1..."
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

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Độ trễ giây (Offset Seconds)
              </label>
              <input
                type="number"
                value={configs[0]?.start_offset_seconds || 0}
                onChange={(e) => {
                  const sec = Number(e.target.value) || 0;
                  setConfigs(prev => [ { ...prev[0], start_offset_seconds: sec }, prev[1] ]);
                }}
                placeholder="0"
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#047857',
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
                Slot 2 (Cam 2)
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
                placeholder="Cam 2..."
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
        matchId={selectedMatchId}
        isAdmin={true}
        onOffsetChange={handleOffsetChange}
      />

      <YouTubeCaptionSection
        matchId={selectedMatchId}
        configs={configs}
        isAdmin={true}
        onSeek={handleSeekFromCaption}
        getCurrentVideoTime={handleGetCurrentVideoTime}
      />
      {/* Sync Target Match Modal */}
      {syncModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            color: '#0f172a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Repeat size={18} style={{ color: '#059669' }} />
                Đồng Bộ Data Video Sang Trận Đấu
              </h3>
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', fontWeight: 700, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Chọn trận đấu trong lịch sử mà bạn muốn sao chép toàn bộ <strong>Link Video YouTube, Độ trễ Delay</strong> và <strong>Ghi chú timeline 2nike</strong> từ trận mặc định sang:
            </p>

            {/* Target Match Select Dropdown */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Chọn trận đấu mục tiêu:
              </label>
              {historyMatches.length === 0 ? (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '13px', color: '#64748b' }}>
                  Không tìm thấy trận đấu nào trong lịch sử.
                </div>
              ) : (
                <select
                  value={selectedTargetMatchId}
                  onChange={(e) => setSelectedTargetMatchId(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  {historyMatches.map((m: HistoryMatchOption, idx: number) => {
                    const label = m.matchDate ? `Trận ${m.matchDate}${m.matchTime ? ' (' + m.matchTime + ')' : ''}${m.venue ? ' - ' + m.venue : ''}` : `Trận #${idx + 1} (${m.id})`;
                    return (
                      <option key={m.id} value={m.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmSyncToTargetMatch}
                disabled={syncing || !selectedTargetMatchId}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: (syncing || !selectedTargetMatchId) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  opacity: (syncing || !selectedTargetMatchId) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {syncing ? <RefreshCw size={14} className="animate-spin" /> : <Repeat size={14} />}
                Xác Nhận Sync Data
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};
