'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MatchCaption, YouTubeVideoConfig } from '@/types/youtube';
import { parseTimeToSeconds, formatSecondsToTime } from '@/lib/youtube-utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import {
  Clock, Plus, Trash2, Share2, Play, RefreshCw, MessageSquare,
  Sparkles, Check, User
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
    const shareUrl = `${window.location.origin}${window.location.pathname}?slot=${cap.slot}&time=${cap.timestamp_seconds}&caption_id=${cap.id}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(cap.id);
      toast.success('Đã sao chép link mốc thời gian!');
      setTimeout(() => setCopiedId(null), 2500);
    }).catch(() => {
      toast.error('Không thể copy link');
    });
  };

  const filteredCaptions = selectedSlotFilter === 'all'
    ? captions
    : captions.filter((c) => c.slot === selectedSlotFilter);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      color: '#0f172a'
    }}>
      {/* Section Header */}
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
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Timeline Ghi Chú Trận Đấu
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '16px',
                background: '#e0e7ff',
                color: '#3730a3',
                border: '1px solid #c7d2fe'
              }}>
                {captions.length} mốc
              </span>
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Bấm vào mốc thời gian để nhảy trực tiếp video tới pha bóng mong muốn
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Slot Filter Pills */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <button
              type="button"
              onClick={() => setSelectedSlotFilter('all')}
              style={{
                padding: '5px 12px',
                borderRadius: '7px',
                border: 'none',
                background: selectedSlotFilter === 'all' ? '#ffffff' : 'transparent',
                color: selectedSlotFilter === 'all' ? '#0f172a' : '#64748b',
                fontWeight: selectedSlotFilter === 'all' ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: selectedSlotFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Tất cả ({captions.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSlotFilter(1)}
              style={{
                padding: '5px 12px',
                borderRadius: '7px',
                border: 'none',
                background: selectedSlotFilter === 1 ? '#ffffff' : 'transparent',
                color: selectedSlotFilter === 1 ? '#047857' : '#64748b',
                fontWeight: selectedSlotFilter === 1 ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: selectedSlotFilter === 1 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Video 1
            </button>
            <button
              type="button"
              onClick={() => setSelectedSlotFilter(2)}
              style={{
                padding: '5px 12px',
                borderRadius: '7px',
                border: 'none',
                background: selectedSlotFilter === 2 ? '#ffffff' : 'transparent',
                color: selectedSlotFilter === 2 ? '#6d28d9' : '#64748b',
                fontWeight: selectedSlotFilter === 2 ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: selectedSlotFilter === 2 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
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
                borderRadius: '10px',
                padding: '7px 12px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: resetting || captions.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: resetting || captions.length === 0 ? 0.5 : 1
              }}
              title="Refresh / Xóa sạch caption dữ liệu trận đấu"
            >
              <RefreshCw size={14} className={resetting ? 'animate-spin' : ''} />
              Xóa sạch
            </button>
          )}
        </div>
      </div>

      {/* Add New Caption Form */}
      <form onSubmit={handleAddCaption} style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        padding: '18px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800 }}>
          <span style={{ color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} style={{ color: '#4f46e5' }} /> Thêm Dòng Ghi Chú Mới (Realtime)
          </span>
          <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>Tự động lưu & đồng bộ tức thì</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {/* Target Video Slot */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Góc Video
            </label>
            <select
              value={slot}
              onChange={(e) => setSlot(Number(e.target.value) as 1 | 2)}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <option value={1}>Video 1: {configs.find((c) => c.slot === 1)?.title || 'Hiệp 1 / Cam 1'}</option>
              <option value={2}>Video 2: {configs.find((c) => c.slot === 2)?.title || 'Hiệp 2 / Cam 2'}</option>
            </select>
          </div>

          {/* Timestamp Input */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Thời gian (HH:MM:SS)</label>
              {getCurrentVideoTime && (
                <button
                  type="button"
                  onClick={handleFetchCurrentTime}
                  style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '11px', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  🎯 Lấy giờ video
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="00:15:30"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  borderRadius: '10px',
                  padding: '9px 12px 9px 32px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              />
              <Clock size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
            </div>
          </div>

          {/* Author Name */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Người tạo (Tùy chọn)
            </label>
            <input
              type="text"
              placeholder={isAdmin ? 'Admin' : 'Tên bạn...'}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            />
          </div>
        </div>

        {/* Caption Text Input & Submit */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Nội dung ghi chú (vd: Pha bóng nguy hiểm, Bàn thắng mở tỷ số...)"
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            style={{
              flex: 1,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          />
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontWeight: 800,
              fontSize: '13px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              opacity: submitting ? 0.6 : 1,
              transition: 'transform 0.15s ease'
            }}
          >
            <Plus size={16} />
            Lưu Realtime
          </button>
        </div>
      </form>

      {/* Captions List Timeline Cards */}
      <div ref={captionListRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <RefreshCw size={16} className="animate-spin" style={{ color: '#4f46e5' }} />
            Đang tải dữ liệu timeline caption...
          </div>
        ) : filteredCaptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: '13px', background: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
            Chưa có ghi chú mốc thời gian nào. Hãy nhập mốc đầu tiên ở trên!
          </div>
        ) : (
          filteredCaptions.map((cap) => {
            const isHighlighted = targetCaptionId === cap.id;

            return (
              <div
                key={cap.id}
                id={`caption-${cap.id}`}
                style={{
                  background: isHighlighted ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' : '#ffffff',
                  border: isHighlighted ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: isHighlighted ? '0 8px 20px -4px rgba(99, 102, 241, 0.25)' : '0 2px 8px rgba(15, 23, 42, 0.03)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative'
                }}
              >
                {/* Left Side: Play Button & Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                  {/* Timestamp Gradient Play Button */}
                  <button
                    type="button"
                    onClick={() => onSeek(cap.slot, cap.timestamp_seconds)}
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                      transition: 'transform 0.15s ease, boxShadow 0.15s ease'
                    }}
                    title={`Phát Video ${cap.slot} từ mốc ${cap.timestamp_str}`}
                  >
                    <Play size={13} style={{ fill: '#ffffff' }} />
                    {cap.timestamp_str}
                  </button>

                  {/* Caption Text & Badges */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: '0 0 6px 0',
                      wordBreak: 'break-word',
                      lineHeight: '1.4'
                    }}>
                      {cap.caption}
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Video Slot Badge */}
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: cap.slot === 1 ? '#ecfdf5' : '#f5f3ff',
                        color: cap.slot === 1 ? '#047857' : '#6d28d9',
                        border: `1px solid ${cap.slot === 1 ? '#a7f3d0' : '#ddd6fe'}`
                      }}>
                        Video {cap.slot}
                      </span>

                      {/* Author Tag */}
                      {cap.created_by && (
                        <span style={{
                          fontSize: '11px',
                          color: '#64748b',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <User size={11} style={{ color: '#94a3b8' }} />
                          bởi <strong style={{ color: '#334155' }}>{cap.created_by}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side Actions: Share & Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleShareCaption(cap)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '9px',
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      transition: 'all 0.15s ease'
                    }}
                    title="Sao chép link chia sẻ mốc thời gian"
                  >
                    {copiedId === cap.id ? (
                      <Check size={14} style={{ color: '#059669' }} />
                    ) : (
                      <Share2 size={14} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCaption(cap.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '9px',
                      background: '#fff1f2',
                      color: '#e11d48',
                      border: '1px solid #fecdd3',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      transition: 'all 0.15s ease'
                    }}
                    title="Xóa ghi chú (Realtime)"
                  >
                    <Trash2 size={14} />
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
