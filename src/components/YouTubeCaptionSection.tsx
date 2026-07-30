'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MatchCaption, YouTubeVideoConfig } from '@/types/youtube';
import { parseTimeToSeconds, formatSecondsToTime } from '@/lib/youtube-utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import {
  Trash2, Share2, Play, RefreshCw, MessageSquare,
  Check, User
} from 'lucide-react';

interface Props {
  matchId?: string;
  configs?: YouTubeVideoConfig[];
  onSeek: (slot: 1 | 2, seconds: number) => void;
  isAdmin?: boolean;
  targetCaptionId?: string | null;
  getCurrentVideoTime?: () => { time1: number; time2: number };
}

export const YouTubeCaptionSection: React.FC<Props> = ({
  matchId = 'default_match',
  configs = [],
  onSeek,
  isAdmin = false,
  targetCaptionId,
  getCurrentVideoTime,
}) => {
  const [captions, setCaptions] = useState<MatchCaption[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [slot, setSlot] = useState<1 | 2>(1);
  const [timeStr, setTimeStr] = useState('');
  const [captionText, setCaptionText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<'all' | 1 | 2>('all');

  const captionListRef = useRef<HTMLDivElement>(null);

  // ── 1. Fetch initial captions ──
  const fetchCaptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/youtube-captions?match_id=${matchId}`);
      const data = await res.json();
      if (data.captions) {
        setCaptions(data.captions);
      }
    } catch {
      toast.error('Lỗi khi tải ghi chú timeline');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchCaptions();
  }, [fetchCaptions]);

  // ── 2. Realtime Supabase Subscription for Captions ──
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-captions-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_captions',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCap = payload.new as MatchCaption;
            setCaptions((prev) => {
              if (prev.some((c) => c.id === newCap.id)) return prev;
              const nextList = [...prev, newCap];
              return nextList.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setCaptions((prev) => prev.filter((c) => c.id !== deletedId));
          } else if (payload.eventType === 'UPDATE') {
            const updatedCap = payload.new as MatchCaption;
            setCaptions((prev) =>
              prev.map((c) => (c.id === updatedCap.id ? updatedCap : c))
                .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // Scroll target caption into view if highlighted
  useEffect(() => {
    if (targetCaptionId) {
      const el = document.getElementById(`caption-${targetCaptionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [targetCaptionId]);

  // ── 3. Helper to Fetch Current Video Time into Form ──
  const handleFetchCurrentTime = () => {
    if (!getCurrentVideoTime) return;
    const times = getCurrentVideoTime();
    const targetSeconds = slot === 1 ? times.time1 : times.time2;
    setTimeStr(formatSecondsToTime(targetSeconds));
    toast.success(`Đã tự lấy mốc thời gian Video ${slot}: ${formatSecondsToTime(targetSeconds)}`);
  };

  // ── 4. Handle Add New Caption (POST) ──
  const handleAddCaption = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!timeStr || !timeStr.trim()) {
      toast.error('Vui lòng nhập mốc thời gian (vd: 15:30)');
      return;
    }
    if (!captionText || !captionText.trim()) {
      toast.error('Vui lòng nhập nội dung ghi chú');
      return;
    }

    const seconds = parseTimeToSeconds(timeStr);
    const formattedTime = formatSecondsToTime(seconds);

    // YouTube ID from configs
    const targetConfig = configs.find((c) => c.slot === slot);
    const youtube_id = targetConfig ? targetConfig.youtube_id : '';

    setSubmitting(true);

    try {
      const res = await fetch('/api/youtube-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          slot,
          youtube_id,
          timestamp_seconds: seconds,
          timestamp_str: formattedTime,
          caption: captionText.trim(),
          created_by: authorName.trim() || (isAdmin ? 'Admin' : 'Thành viên')
        })
      });

      const data = await res.json();
      if (data.success && data.caption) {
        toast.success('Đã thêm dòng ghi chú mốc thời gian!');
        setCaptionText('');

        setCaptions((prev) => {
          if (prev.some((c) => c.id === data.caption.id)) return prev;
          const nextList = [...prev, data.caption];
          return nextList.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
        });
      } else {
        toast.error(data.error || 'Thêm ghi chú thất bại');
      }
    } catch {
      toast.error('Lỗi kết nối khi lưu ghi chú');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 5. Handle Delete Caption (DELETE) ──
  const handleDeleteCaption = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) return;

    try {
      const res = await fetch(`/api/youtube-captions?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã xóa ghi chú!');
        setCaptions((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast.error(data.error || 'Xóa ghi chú thất bại');
      }
    } catch {
      toast.error('Lỗi kết nối khi xóa ghi chú');
    }
  };

  // ── 6. Handle Reset All Captions (Admin) ──
  const handleResetAllCaptions = async () => {
    if (!confirm('CẢNH BÁO ADMIN: Bạn có chắc muốn XÓA TẤT CẢ GHI CHÚ của trận này?')) return;

    setResetting(true);
    try {
      const res = await fetch(`/api/youtube-captions?match_id=${matchId}&reset_all=true`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã xóa sạch tất cả ghi chú timeline!');
        setCaptions([]);
      } else {
        toast.error(data.error || 'Lỗi khi dọn dẹp ghi chú');
      }
    } catch {
      toast.error('Lỗi kết nối khi dọn dẹp ghi chú');
    } finally {
      setResetting(false);
    }
  };

  // ── 7. Handle Share Timestamp Link ──
  const handleShareCaption = (cap: MatchCaption) => {
    if (typeof window === 'undefined') return;
    const currentMatchId = cap.match_id || matchId;
    const shareUrl = `${window.location.origin}/match-video?match_id=${currentMatchId}&slot=${cap.slot}&time=${cap.timestamp_seconds}&caption_id=${cap.id}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(cap.id);
      toast.success('Đã sao chép link mốc thời gian!');
      setTimeout(() => setCopiedId(null), 2500);
    }).catch(() => {
      toast.error('Không thể copy link');
    });
  };

  const handleCardClick = (cap: MatchCaption) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    onSeek(cap.slot, cap.timestamp_seconds);
  };

  const filteredCaptions = selectedSlotFilter === 'all'
    ? captions
    : captions.filter((c) => c.slot === selectedSlotFilter);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      color: '#0f172a',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <style>{`
        .caption-card-item {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          user-select: none;
          position: relative;
        }
        .caption-card-item:hover {
          border-color: #818cf8;
          box-shadow: 0 6px 18px -2px rgba(99, 102, 241, 0.16);
          transform: translateY(-1.5px);
        }
        .caption-card-item.is-highlighted {
          background: linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%);
          border: 2px solid #6366f1;
          box-shadow: 0 8px 24px -4px rgba(99, 102, 241, 0.25);
        }
        .timestamp-play-btn {
          background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 6px 11px;
          font-size: 12px;
          font-family: monospace;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 3px 8px rgba(79, 70, 229, 0.28);
          white-space: nowrap;
          flex-shrink: 0;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .timestamp-play-btn:hover {
          transform: scale(1.04);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        }
      `}</style>

      {/* Section Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        paddingBottom: '14px',
        marginBottom: '14px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            padding: '8px',
            borderRadius: '10px',
            background: '#e0e7ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              2Nike Trận Đấu
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: '#e0e7ff',
                color: '#3730a3',
                border: '1px solid #c7d2fe'
              }}>
                {captions.length} highlight
              </span>
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Bấm mốc thời gian để tua tới đoạn highlight mong muốn
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Slot Filter Pills */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => setSelectedSlotFilter('all')}
              style={{
                border: 'none',
                padding: '4px 10px',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: selectedSlotFilter === 'all' ? '#ffffff' : 'transparent',
                color: selectedSlotFilter === 'all' ? '#0f172a' : '#64748b',
                boxShadow: selectedSlotFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Tất cả ({captions.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSlotFilter(1)}
              style={{
                border: 'none',
                padding: '4px 10px',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: selectedSlotFilter === 1 ? '#ffffff' : 'transparent',
                color: selectedSlotFilter === 1 ? '#047857' : '#64748b',
                boxShadow: selectedSlotFilter === 1 ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Video 1
            </button>
            <button
              type="button"
              onClick={() => setSelectedSlotFilter(2)}
              style={{
                border: 'none',
                padding: '4px 10px',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: selectedSlotFilter === 2 ? '#ffffff' : 'transparent',
                color: selectedSlotFilter === 2 ? '#6d28d9' : '#64748b',
                boxShadow: selectedSlotFilter === 2 ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Video 2
            </button>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={handleResetAllCaptions}
              disabled={resetting || captions.length === 0}
              style={{
                background: '#fff1f2',
                color: '#e11d48',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                padding: '6px 10px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: resetting || captions.length === 0 ? 'not-allowed' : 'pointer',
                opacity: resetting || captions.length === 0 ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Refresh / Xóa sạch caption dữ liệu trận đấu"
            >
              <RefreshCw size={14} className={resetting ? 'animate-spin' : ''} />
              Xóa sạch
            </button>
          )}
        </div>
      </div>

      {/* Captions List Timeline Cards */}
      <div ref={captionListRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <RefreshCw size={16} className="animate-spin" style={{ color: '#4f46e5' }} />
            Đang tải dữ liệu timeline caption...
          </div>
        ) : filteredCaptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            Chưa có ghi chú mốc thời gian nào. Hãy nhập mốc đầu tiên ở trên!
          </div>
        ) : (
          filteredCaptions.map((cap) => {
            const isHighlighted = targetCaptionId === cap.id;

            return (
              <div
                key={cap.id}
                id={`caption-${cap.id}`}
                onClick={() => handleCardClick(cap)}
                className={`caption-card-item ${isHighlighted ? 'is-highlighted' : ''}`}
              >
                {/* Left Content (Single Line) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                  {/* Play Button & Time */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(cap);
                    }}
                    className="timestamp-play-btn"
                    title={`Phát Video ${cap.slot} từ mốc ${cap.timestamp_str}`}
                  >
                    <Play size={11} style={{ fill: '#ffffff' }} />
                    {cap.timestamp_str}
                  </button>

                  {/* Slot Badge */}
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '8px',
                    background: cap.slot === 1 ? '#ecfdf5' : '#f5f3ff',
                    color: cap.slot === 1 ? '#047857' : '#6d28d9',
                    border: `1px solid ${cap.slot === 1 ? '#a7f3d0' : '#ddd6fe'}`,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: cap.slot === 1 ? '#10b981' : '#8b5cf6'
                    }} />
                    Cam {cap.slot}
                  </span>

                  {/* Caption Title Text */}
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#0f172a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flexShrink: 1
                    }}
                    title={cap.caption}
                  >
                    {cap.caption}
                  </span>

                  {/* Author Tag (if any) */}
                  {cap.created_by && (
                    <span style={{
                      fontSize: '11px',
                      color: '#64748b',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      <User size={10} style={{ color: '#64748b' }} />
                      {cap.created_by}
                    </span>
                  )}
                </div>

                {/* Right Actions: Share & Delete */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareCaption(cap);
                    }}
                    style={{
                      background: copiedId === cap.id ? '#d1fae5' : '#f8fafc',
                      border: `1px solid ${copiedId === cap.id ? '#6ee7b7' : '#e2e8f0'}`,
                      color: copiedId === cap.id ? '#047857' : '#475569',
                      borderRadius: '8px',
                      padding: '6px 9px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                    title="Sao chép link chia sẻ mốc thời gian"
                  >
                    {copiedId === cap.id ? (
                      <Check size={13} style={{ color: '#059669' }} />
                    ) : (
                      <Share2 size={13} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCaption(cap.id);
                    }}
                    style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      color: '#e11d48',
                      borderRadius: '8px',
                      padding: '6px 9px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                    title="Xóa ghi chú 2nike"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
