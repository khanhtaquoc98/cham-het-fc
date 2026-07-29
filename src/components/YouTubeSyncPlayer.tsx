'use client';

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { YouTubeVideoConfig } from '@/types/youtube';
import { extractYouTubeId, formatSecondsToHHMMSS } from '@/lib/youtube-utils';
import { Play, Pause, Sliders, Video, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PlayerInstance {
  getCurrentTime?: () => number;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  getPlayerState?: () => number;
  mute?: () => void;
  unMute?: () => void;
}

export interface YouTubeSyncPlayerRef {
  seekTo: (slot: 1 | 2, seconds: number, autoPlay?: boolean) => void;
  seekBothWithOffset: (masterSeconds: number, autoPlay?: boolean) => void;
  getCurrentTimes: () => { time1: number; time2: number };
}

interface Props {
  configs: YouTubeVideoConfig[];
  isAdmin?: boolean;
  onOffsetChange?: (slot: 1 | 2, offsetSeconds: number) => void;
  activeTargetSlot?: number;
  highlightCaptionTime?: number | null;
  autoPlayOnLoad?: boolean;
}

const DEFAULT_CONFIG_1: YouTubeVideoConfig = {
  slot: 1,
  match_id: '',
  youtube_url: '',
  youtube_id: '',
  title: 'Slot 1: Hiệp 1 / Cam 1',
  start_offset_seconds: 0,
};

const DEFAULT_CONFIG_2: YouTubeVideoConfig = {
  slot: 2,
  match_id: '',
  youtube_url: '',
  youtube_id: '',
  title: 'Slot 2: Hiệp 2 / Cam 2',
  start_offset_seconds: 0,
};

export const YouTubeSyncPlayer = forwardRef<YouTubeSyncPlayerRef, Props>(({
  configs,
  isAdmin = false,
  onOffsetChange,
  activeTargetSlot,
  highlightCaptionTime: _highlightCaptionTime,
  autoPlayOnLoad = true
}, ref) => {
  const cfg1 = configs.find(c => c.slot === 1) || DEFAULT_CONFIG_1;
  const cfg2 = configs.find(c => c.slot === 2) || DEFAULT_CONFIG_2;

  const player1Ref = useRef<PlayerInstance | null>(null);
  const player2Ref = useRef<PlayerInstance | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [syncPointModalOpen, setSyncPointModalOpen] = useState(false);
  const [modalTimes, setModalTimes] = useState<{ time1: number; time2: number }>({ time1: 0, time2: 0 });

  // Player Ready tracking (Wait for BOTH players before playing)
  const [isPlayer1Ready, setIsPlayer1Ready] = useState(false);
  const [isPlayer2Ready, setIsPlayer2Ready] = useState(false);

  useEffect(() => {
    setIsPlayer1Ready(false);
    setIsPlayer2Ready(false);
  }, [cfg1.youtube_id, cfg2.youtube_id]);

  const isBothReady = Boolean(
    (cfg1.youtube_id ? isPlayer1Ready : true) &&
    (cfg2.youtube_id ? isPlayer2Ready : true)
  );

  const handleOpenSyncModal = () => {
    let t1 = 0;
    let t2 = 0;
    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        t1 = player1Ref.current.getCurrentTime() || 0;
      }
      if (player2Ref.current && typeof player2Ref.current.getCurrentTime === 'function') {
        t2 = player2Ref.current.getCurrentTime() || 0;
      }
    } catch {}
    setModalTimes({ time1: Math.floor(t1), time2: Math.floor(t2) });
    setSyncPointModalOpen(true);
  };

  // Player Options (autoplay & playsinline for mobile/web browsers)
  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      rel: 0,
      controls: 1,
      playsinline: 1,
    },
  };

  const onPlayerReady1 = (event: { target: PlayerInstance }) => {
    player1Ref.current = event.target;
    setIsPlayer1Ready(true);
  };

  const onPlayerReady2 = (event: { target: PlayerInstance }) => {
    player2Ref.current = event.target;
    // Mute Video 2 by default so audio doesn't double/echo & browser autoplay succeeds
    try {
      if (typeof event.target.mute === 'function') {
        event.target.mute();
      }
    } catch {}
    setIsPlayer2Ready(true);
  };

  // ── Sync Loop: Ensures Video 2 waits at 0s until Video 1 reaches start_offset_seconds ──
  useEffect(() => {
    if (!isPlaying || !isBothReady) return;

    const interval = setInterval(() => {
      try {
        if (player1Ref.current && player2Ref.current) {
          const t1 = typeof player1Ref.current.getCurrentTime === 'function' ? (player1Ref.current.getCurrentTime() || 0) : 0;
          const t2 = typeof player2Ref.current.getCurrentTime === 'function' ? (player2Ref.current.getCurrentTime() || 0) : 0;
          const offset = cfg2.start_offset_seconds || 0;

          if (t1 < offset) {
            // Video 1 hasn't reached offset yet (e.g. t1 < 320s). Video 2 stays paused at 0s
            const state2 = typeof player2Ref.current.getPlayerState === 'function' ? player2Ref.current.getPlayerState() : -1;
            if (state2 === 1) { // if currently playing, pause it
              if (typeof player2Ref.current.pauseVideo === 'function') player2Ref.current.pauseVideo();
              if (typeof player2Ref.current.seekTo === 'function') player2Ref.current.seekTo(0, true);
            }
          } else {
            // Video 1 reached or passed offset (e.g. t1 >= 320s). Video 2 should play from t1 - offset
            const expectedT2 = t1 - offset;
            const state2 = typeof player2Ref.current.getPlayerState === 'function' ? player2Ref.current.getPlayerState() : -1;

            if (state2 !== 1) {
              if (typeof player2Ref.current.seekTo === 'function') player2Ref.current.seekTo(expectedT2, true);
              if (typeof player2Ref.current.playVideo === 'function') player2Ref.current.playVideo();
            } else if (Math.abs(t2 - expectedT2) > 1.5) {
              if (typeof player2Ref.current.seekTo === 'function') player2Ref.current.seekTo(expectedT2, true);
            }
          }
        }
      } catch {}
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isBothReady, cfg2.start_offset_seconds]);

  const pendingSeekRef = useRef<{ slot: 1 | 2; seconds: number; autoPlay: boolean } | null>(null);

  const doSeek = useCallback((slot: 1 | 2, seconds: number, autoPlay: boolean = true) => {
    const offset = cfg2.start_offset_seconds || 0;
    let targetTime1 = 0;
    let targetTime2 = 0;

    if (slot === 1) {
      targetTime1 = seconds;
      targetTime2 = seconds - offset;
    } else {
      targetTime2 = seconds;
      targetTime1 = seconds + offset;
    }

    if (player1Ref.current && typeof player1Ref.current.seekTo === 'function') {
      player1Ref.current.seekTo(Math.max(0, targetTime1), true);
      if (autoPlay && typeof player1Ref.current.playVideo === 'function') {
        try {
          player1Ref.current.playVideo();
        } catch {}
      }
    }

    if (player2Ref.current) {
      if (targetTime2 < 0) {
        if (typeof player2Ref.current.seekTo === 'function') {
          player2Ref.current.seekTo(0, true);
        }
        if (typeof player2Ref.current.pauseVideo === 'function') {
          player2Ref.current.pauseVideo();
        }
      } else {
        if (typeof player2Ref.current.seekTo === 'function') {
          player2Ref.current.seekTo(targetTime2, true);
        }
        if (autoPlay && typeof player2Ref.current.playVideo === 'function') {
          try {
            player2Ref.current.playVideo();
          } catch {}
        }
      }
    }

    if (autoPlay) setIsPlaying(true);
  }, [cfg2.start_offset_seconds]);

  // Execute pending seek or auto-start once both players are ready
  useEffect(() => {
    if (!isBothReady) return;

    if (pendingSeekRef.current) {
      const { slot, seconds, autoPlay } = pendingSeekRef.current;
      pendingSeekRef.current = null;
      const timer = setTimeout(() => {
        doSeek(slot, seconds, autoPlay);
      }, 300);
      return () => clearTimeout(timer);
    } else if (autoPlayOnLoad && (cfg1.youtube_id || cfg2.youtube_id)) {
      const timer = setTimeout(() => {
        doSeek(1, 0, true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isBothReady, doSeek, autoPlayOnLoad, cfg1.youtube_id, cfg2.youtube_id]);

  // ── Imperative Ref Methods ──
  useImperativeHandle(ref, () => ({
    seekTo: (slot: 1 | 2, seconds: number, autoPlay: boolean = true) => {
      if (!isBothReady) {
        pendingSeekRef.current = { slot, seconds, autoPlay };
        return;
      }
      doSeek(slot, seconds, autoPlay);
    },
    seekBothWithOffset: (masterSeconds: number, autoPlay: boolean = true) => {
      if (!isBothReady) {
        pendingSeekRef.current = { slot: 1, seconds: masterSeconds, autoPlay };
        return;
      }
      doSeek(1, masterSeconds, autoPlay);
    },
    getCurrentTimes: () => {
      let t1 = 0;
      let t2 = 0;
      try {
        if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
          t1 = player1Ref.current.getCurrentTime() || 0;
        }
        if (player2Ref.current && typeof player2Ref.current.getCurrentTime === 'function') {
          t2 = player2Ref.current.getCurrentTime() || 0;
        }
      } catch {}
      return { time1: Math.floor(t1), time2: Math.floor(t2) };
    }
  }));

  // ── Master Play Both ──
  const togglePlayBoth = () => {
    if (!isBothReady) {
      toast.error('Đang chuẩn bị nạp 2 player... Vui lòng đợi trong giây lát!', { icon: '⏳' });
      return;
    }

    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    const offset = cfg2.start_offset_seconds || 0;

    let time1 = 0;
    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        time1 = player1Ref.current.getCurrentTime() || 0;
      }
    } catch {}

    if (player1Ref.current) {
      if (nextPlaying) {
        if (typeof player1Ref.current.playVideo === 'function') player1Ref.current.playVideo();
      } else {
        if (typeof player1Ref.current.pauseVideo === 'function') player1Ref.current.pauseVideo();
      }
    }

    if (player2Ref.current) {
      if (nextPlaying) {
        if (time1 < offset) {
          // Video 1 is still before Video 2 offset (t1 < offset). Video 2 pauses at 0s
          if (typeof player2Ref.current.seekTo === 'function') {
            player2Ref.current.seekTo(0, true);
          }
          if (typeof player2Ref.current.pauseVideo === 'function') {
            player2Ref.current.pauseVideo();
          }
        } else {
          const targetTime2 = time1 - offset;
          if (typeof player2Ref.current.seekTo === 'function') {
            player2Ref.current.seekTo(targetTime2, true);
          }
          if (typeof player2Ref.current.playVideo === 'function') {
            player2Ref.current.playVideo();
          }
        }
      } else {
        if (typeof player2Ref.current.pauseVideo === 'function') {
          player2Ref.current.pauseVideo();
        }
      }
    }
  };

  // ── Auto Sync Point Tool Logic ──
  const handleAutoCalculateSyncPoint = () => {
    let time1 = 0;
    let time2 = 0;
    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        time1 = player1Ref.current.getCurrentTime() || 0;
      }
      if (player2Ref.current && typeof player2Ref.current.getCurrentTime === 'function') {
        time2 = player2Ref.current.getCurrentTime() || 0;
      }
    } catch {}

    // Offset of Video 2 relative to Video 1 (time1 - time2)
    const newOffset = Math.round(time1 - time2);
    if (onOffsetChange) {
      onOffsetChange(2, newOffset);
    }
    setSyncPointModalOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-sm text-slate-900 w-full">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Video size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 m-0">
              Màn Hình Phát Multi-Cam
            </h3>
          </div>
        </div>

        {/* Sync Controls & Player Status */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {!isBothReady && (cfg1.youtube_id || cfg2.youtube_id) ? (
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold w-full sm:w-auto">
              <RefreshCw size={14} className="animate-spin" />
              Đang nạp 2 player đồng bộ...
            </div>
          ) : (cfg1.youtube_id || cfg2.youtube_id) ? (
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold w-full sm:w-auto">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Đã nạp xong 2 Player
            </div>
          ) : null}

          {cfg1.youtube_id && cfg2.youtube_id && (
            <button
              type="button"
              onClick={togglePlayBoth}
              disabled={!isBothReady}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto ${
                isPlaying
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700'
              }`}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} className="fill-current" />}
              {isPlaying ? 'Tạm Dừng Cả 2 Video' : 'Phát Đồng Bộ Cả 2 Video'}
            </button>
          )}

          {isAdmin && cfg1.youtube_id && cfg2.youtube_id && (
            <button
              type="button"
              onClick={handleOpenSyncModal}
              disabled={!isBothReady}
              className="bg-slate-100 text-slate-700 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-all w-full sm:w-auto"
              title="Căn mốc đồng bộ tự động"
            >
              <Sliders size={14} className="text-indigo-600" />
              Căn Độ Trễ Auto
            </button>
          )}
        </div>
      </div>

      {/* Video Players Grid: 50% / 50% on PC, Full Width on Mobile */}
      <div className={`grid grid-cols-1 ${cfg1.youtube_id && cfg2.youtube_id ? 'md:grid-cols-2' : ''} gap-3 sm:gap-4`}>
        {/* Video Slot 1 */}
        <div className={`bg-slate-50 rounded-xl overflow-hidden flex flex-col border ${
          activeTargetSlot === 1 ? 'border-2 border-indigo-600 shadow-md' : 'border-slate-200'
        }`}>
          <div className="px-3.5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-extrabold text-slate-700">
            <span className="flex items-center gap-1.5">
              <span className="w-2 height-2 rounded-full bg-emerald-500" />
              {cfg1.title || 'Slot 1: Hiệp 1 / Cam 1'}
            </span>
            <span className="text-[11px] text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">
              Master Standard
            </span>
          </div>

          <div className="relative w-full pt-[56.25%] bg-black">
            {cfg1.youtube_id ? (
              <div className="absolute inset-0">
                <YouTube
                  videoId={extractYouTubeId(cfg1.youtube_id)}
                  opts={opts}
                  onReady={onPlayerReady1}
                  style={{ width: '100%', height: '100%' }}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Video size={36} className="opacity-50" />
                <span className="text-xs font-semibold">Chưa cấu hình URL Video Slot 1</span>
              </div>
            )}
          </div>
        </div>

        {/* Video Slot 2 */}
        {cfg2.youtube_id && (
          <div className={`bg-slate-50 rounded-xl overflow-hidden flex flex-col border ${
            activeTargetSlot === 2 ? 'border-2 border-indigo-600 shadow-md' : 'border-slate-200'
          }`}>
            <div className="px-3.5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-extrabold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2 height-2 rounded-full bg-indigo-500" />
                {cfg2.title || 'Slot 2: Hiệp 2 / Cam 2'}
              </span>
              <span className="text-[11px] text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
                Độ trễ: {formatSecondsToHHMMSS(cfg2.start_offset_seconds || 0)}
              </span>
            </div>

            <div className="relative w-full pt-[56.25%] bg-black">
              <div className="absolute inset-0">
                <YouTube
                  videoId={extractYouTubeId(cfg2.youtube_id)}
                  opts={opts}
                  onReady={onPlayerReady2}
                  style={{ width: '100%', height: '100%' }}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Auto Sync Modal */}
      {syncPointModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-slate-900">
            <h3 className="text-base sm:text-lg font-extrabold m-0 mb-3 text-slate-900">
              Tool Căn Độ Trễ Tự Động (Auto Offset Calibration)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed m-0 mb-4">
              Hãy bấm <strong>Play</strong> trên cả 2 video, tìm đến một tình huống diễn ra cùng lúc (ví dụ: quả phạt góc hoặc bàn thắng), sau đó tạm dừng cả 2 video đúng thời điểm đó và nhấn nút bên dưới.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs sm:text-sm mb-5">
              <div>
                <strong>Video 1 (Mốc):</strong> {formatSecondsToHHMMSS(modalTimes.time1)}
              </div>
              <div className="mt-1.5">
                <strong>Video 2 (Tình huống tương ứng):</strong> {formatSecondsToHHMMSS(modalTimes.time2)}
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSyncPointModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-600 font-semibold text-xs cursor-pointer hover:bg-slate-50 transition-all"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAutoCalculateSyncPoint}
                className="px-4 py-2 rounded-xl border-none bg-indigo-600 text-white font-bold text-xs cursor-pointer hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20"
              >
                Tính & Lưu Độ Trễ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

YouTubeSyncPlayer.displayName = 'YouTubeSyncPlayer';
