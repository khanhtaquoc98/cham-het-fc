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
    <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-sm text-slate-900 w-full">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 m-0 flex items-center gap-2">
              Timeline Ghi Chú Trận Đấu
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                {captions.length} mốc
              </span>
            </h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Bấm mốc thời gian để tua tới đoạn highlight mong muốn
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Slot Filter Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedSlotFilter('all')}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedSlotFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Tất cả ({captions.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSlotFilter(1)}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedSlotFilter === 1
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Video 1
            </button>
            <button
              type="button"
              onClick={() => setSelectedSlotFilter(2)}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedSlotFilter === 2
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Video 2
            </button>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={handleResetAllCaptions}
              disabled={resetting || captions.length === 0}
              className="bg-rose-50 text-rose-600 border border-rose-200 rounded-xl px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-100 transition-all"
              title="Refresh / Xóa sạch caption dữ liệu trận đấu"
            >
              <RefreshCw size={14} className={resetting ? 'animate-spin' : ''} />
              Xóa sạch
            </button>
          )}
        </div>
      </div>

      {/* Add New Caption Form */}
      <form onSubmit={handleAddCaption} className="bg-gradient-to-b from-slate-50 to-slate-100/70 p-3.5 sm:p-4 rounded-xl border border-slate-200 mb-5 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-indigo-800 flex items-center gap-1.5">
            <Sparkles size={16} className="text-indigo-600" /> Thêm Dòng Ghi Chú Mới (Realtime)
          </span>
          <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">Tự động lưu & đồng bộ tức thì</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Target Video Slot */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Góc Video
            </label>
            <select
              value={slot}
              onChange={(e) => setSlot(Number(e.target.value) as 1 | 2)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500 shadow-2xs"
            >
              <option value={1}>Video 1: {configs.find((c) => c.slot === 1)?.title || 'Hiệp 1 / Cam 1'}</option>
              <option value={2}>Video 2: {configs.find((c) => c.slot === 2)?.title || 'Hiệp 2 / Cam 2'}</option>
            </select>
          </div>

          {/* Timestamp Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600">Thời gian (HH:MM:SS)</label>
              {getCurrentVideoTime && (
                <button
                  type="button"
                  onClick={handleFetchCurrentTime}
                  className="bg-none border-none text-indigo-600 text-[11px] font-extrabold cursor-pointer hover:underline"
                >
                  🎯 Lấy giờ video
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="00:15:30"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-8 pr-3 py-2 text-xs font-mono font-bold outline-none focus:border-indigo-500 shadow-2xs"
              />
              <Clock size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>

          {/* Author Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Người tạo (Tùy chọn)
            </label>
            <input
              type="text"
              placeholder={isAdmin ? 'Admin' : 'Tên bạn...'}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Caption Text Input & Submit */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            placeholder="Nội dung ghi chú (vd: Pha bóng nguy hiểm, Bàn thắng mở tỷ số...)"
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            className="flex-1 bg-white border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2 text-xs outline-none focus:border-indigo-500 shadow-2xs"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-none rounded-lg px-5 py-2 font-extrabold text-xs cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shadow-md shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-indigo-800 transition-all w-full sm:w-auto"
          >
            <Plus size={16} />
            Lưu Realtime
          </button>
        </div>
      </form>

      {/* Captions List Timeline Cards */}
      <div ref={captionListRef} className="flex flex-col gap-2.5 max-h-[480px] overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center py-9 text-slate-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-indigo-600" />
            Đang tải dữ liệu timeline caption...
          </div>
        ) : filteredCaptions.length === 0 ? (
          <div className="text-center py-9 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-300">
            Chưa có ghi chú mốc thời gian nào. Hãy nhập mốc đầu tiên ở trên!
          </div>
        ) : (
          filteredCaptions.map((cap) => {
            const isHighlighted = targetCaptionId === cap.id;

            return (
              <div
                key={cap.id}
                id={`caption-${cap.id}`}
                className={`rounded-xl p-3 sm:p-4 flex flex-col gap-2.5 shadow-2xs transition-all ${
                  isHighlighted
                    ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/70 border-2 border-indigo-500 shadow-md shadow-indigo-500/20'
                    : 'bg-white border border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Top Row: Play Button, Slot Badge & Actions */}
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onSeek(cap.slot, cap.timestamp_seconds)}
                      className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white border-none rounded-lg px-3 py-1.5 text-xs font-mono font-extrabold cursor-pointer inline-flex items-center gap-1.5 shrink-0 shadow-xs shadow-indigo-600/30 active:scale-95 transition-all"
                      title={`Phát Video ${cap.slot} từ mốc ${cap.timestamp_str}`}
                    >
                      <Play size={12} className="fill-white" />
                      {cap.timestamp_str}
                    </button>

                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                      cap.slot === 1
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-purple-50 text-purple-800 border-purple-200'
                    }`}>
                      Video {cap.slot}
                    </span>
                  </div>

                  {/* Share & Delete Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleShareCaption(cap)}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer inline-flex items-center gap-1 text-xs font-semibold hover:bg-slate-200 active:scale-95 transition-all"
                      title="Sao chép link chia sẻ mốc thời gian"
                    >
                      {copiedId === cap.id ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Share2 size={14} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCaption(cap.id)}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 cursor-pointer inline-flex items-center gap-1 text-xs font-semibold hover:bg-rose-100 active:scale-95 transition-all"
                      title="Xóa ghi chú (Realtime)"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Caption Description & Author Tag */}
                <div className="w-full min-w-0 pt-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 m-0 leading-relaxed break-words">
                    {cap.caption}
                  </h4>

                  {cap.created_by && (
                    <span className="text-[11px] text-slate-500 inline-flex items-center gap-1 mt-1">
                      <User size={11} className="text-slate-400" />
                      bởi <strong className="text-slate-700">{cap.created_by}</strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
