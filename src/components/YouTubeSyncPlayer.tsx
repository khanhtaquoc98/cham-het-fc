import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { MatchCaption, YouTubeVideoConfig } from '@/types/youtube';
import { extractYouTubeId, formatSecondsToHHMMSS, parseTimeToSeconds } from '@/lib/youtube-utils';
import { supabase } from '@/lib/supabase';
import { Play, Pause, Sliders, Video, RefreshCw, CheckCircle2, RotateCcw, RotateCw, Undo2, Redo2, SkipBack, SkipForward, Plus, Sparkles, Clock, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PlayerInstance {
  getCurrentTime?: () => number;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  getPlayerState?: () => number;
  mute?: () => void;
  unMute?: () => void;
  getVolume?: () => number;
  setVolume?: (volume: number) => void;
  isMuted?: () => boolean;
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
  matchId?: string;
  captions?: MatchCaption[];
}

const DEFAULT_CONFIG_1: YouTubeVideoConfig = {
  slot: 1,
  match_id: '',
  youtube_url: '',
  youtube_id: '',
  title: 'Cam 1',
  start_offset_seconds: 0,
};

const DEFAULT_CONFIG_2: YouTubeVideoConfig = {
  slot: 2,
  match_id: '',
  youtube_url: '',
  youtube_id: '',
  title: 'Cam 2',
  start_offset_seconds: 0,
};

export const YouTubeSyncPlayer = forwardRef<YouTubeSyncPlayerRef, Props>(({
  configs,
  isAdmin = false,
  onOffsetChange,
  activeTargetSlot,
  highlightCaptionTime: _highlightCaptionTime,
  autoPlayOnLoad = true,
  matchId,
  captions: propsCaptions
}, ref) => {
  const cfg1 = configs.find(c => c.slot === 1) || DEFAULT_CONFIG_1;
  const cfg2 = configs.find(c => c.slot === 2) || DEFAULT_CONFIG_2;

  const player1Ref = useRef<PlayerInstance | null>(null);
  const player2Ref = useRef<PlayerInstance | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [syncPointModalOpen, setSyncPointModalOpen] = useState(false);
  const [modalTimes, setModalTimes] = useState<{ time1: number; time2: number }>({ time1: 0, time2: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  const [captionsList, setCaptionsList] = useState<MatchCaption[]>(propsCaptions || []);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);

  // Add 2nike Modal State
  const [addCaptionModalOpen, setAddCaptionModalOpen] = useState(false);
  const [newCapSlot, setNewCapSlot] = useState<1 | 2>(1);
  const [newCapTimeStr, setNewCapTimeStr] = useState('');
  const [newCapAuthor, setNewCapAuthor] = useState('');
  const [newCapText, setNewCapText] = useState('');
  const [submittingCap, setSubmittingCap] = useState(false);

  const effectiveMatchId = matchId || cfg1.match_id || cfg2.match_id || '';

  useEffect(() => {
    if (propsCaptions) {
      setCaptionsList(propsCaptions);
    }
  }, [propsCaptions]);

  useEffect(() => {
    if (!effectiveMatchId) return;

    async function loadCaptions() {
      try {
        const res = await fetch(`/api/youtube-captions?match_id=${effectiveMatchId}`);
        const data = await res.json();
        if (data.captions) {
          setCaptionsList(data.captions);
        }
      } catch {}
    }

    loadCaptions();

    const channel = supabase
      .channel(`realtime-sync-captions-${effectiveMatchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_captions',
          filter: `match_id=eq.${effectiveMatchId}`
        },
        () => {
          loadCaptions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveMatchId]);

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

  // Track current video time every 1s
  useEffect(() => {
    if (!isBothReady) return;

    const interval = setInterval(() => {
      try {
        if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
          const t1 = player1Ref.current.getCurrentTime() || 0;
          setCurrentVideoTime(t1);
        }
      } catch {}
    }, 1000);

    return () => clearInterval(interval);
  }, [isBothReady]);

  // Compute sorted captions & availability of prev/next note
  const sortedCaptions = React.useMemo(() => {
    return [...captionsList].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  }, [captionsList]);

  const hasPrevNote = React.useMemo(() => {
    if (sortedCaptions.length === 0) return false;
    return sortedCaptions.some(c => c.timestamp_seconds < currentVideoTime - 1.5);
  }, [sortedCaptions, currentVideoTime]);

  const hasNextNote = React.useMemo(() => {
    if (sortedCaptions.length === 0) return false;
    return sortedCaptions.some(c => c.timestamp_seconds > currentVideoTime + 1.5);
  }, [sortedCaptions, currentVideoTime]);

  // Volume States for Video 1 and Video 2
  const [vol1, setVol1] = useState(100);
  const [isMuted1, setIsMuted1] = useState(false);
  const [vol2, setVol2] = useState(100);
  const [isMuted2, setIsMuted2] = useState(true); // Default Video 2 muted
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const volumePopoverRef = useRef<HTMLDivElement>(null);

  // Click outside to close volume popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (volumePopoverRef.current && !volumePopoverRef.current.contains(e.target as Node)) {
        setShowVolumePopover(false);
      }
    };
    if (showVolumePopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVolumePopover]);

  const handleVol1Change = (newVol: number) => {
    setVol1(newVol);
    if (player1Ref.current && typeof player1Ref.current.setVolume === 'function') {
      player1Ref.current.setVolume(newVol);
    }
    if (newVol > 0 && isMuted1) {
      if (player1Ref.current && typeof player1Ref.current.unMute === 'function') {
        player1Ref.current.unMute();
      }
      setIsMuted1(false);
    } else if (newVol === 0 && !isMuted1) {
      if (player1Ref.current && typeof player1Ref.current.mute === 'function') {
        player1Ref.current.mute();
      }
      setIsMuted1(true);
    }
  };

  const toggleMute1 = () => {
    if (isMuted1) {
      if (player1Ref.current && typeof player1Ref.current.unMute === 'function') {
        player1Ref.current.unMute();
      }
      setIsMuted1(false);
      if (vol1 === 0) handleVol1Change(50);
    } else {
      if (player1Ref.current && typeof player1Ref.current.mute === 'function') {
        player1Ref.current.mute();
      }
      setIsMuted1(true);
    }
  };

  const handleVol2Change = (newVol: number) => {
    setVol2(newVol);
    if (player2Ref.current && typeof player2Ref.current.setVolume === 'function') {
      player2Ref.current.setVolume(newVol);
    }
    if (newVol > 0 && isMuted2) {
      if (player2Ref.current && typeof player2Ref.current.unMute === 'function') {
        player2Ref.current.unMute();
      }
      setIsMuted2(false);
    } else if (newVol === 0 && !isMuted2) {
      if (player2Ref.current && typeof player2Ref.current.mute === 'function') {
        player2Ref.current.mute();
      }
      setIsMuted2(true);
    }
  };

  const toggleMute2 = () => {
    if (isMuted2) {
      if (player2Ref.current && typeof player2Ref.current.unMute === 'function') {
        player2Ref.current.unMute();
      }
      setIsMuted2(false);
      if (vol2 === 0) handleVol2Change(50);
    } else {
      if (player2Ref.current && typeof player2Ref.current.mute === 'function') {
        player2Ref.current.mute();
      }
      setIsMuted2(true);
    }
  };

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

  // Player Options (no native controls, disable iframe kb, playsinline)
  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      rel: 0,
      controls: 0,
      playsinline: 1,
      disablekb: 1,
    },
  };

  const onPlayerReady1 = (event: { target: PlayerInstance }) => {
    player1Ref.current = event.target;
    try {
      if (typeof event.target.setVolume === 'function') {
        event.target.setVolume(vol1);
      }
      if (isMuted1 && typeof event.target.mute === 'function') {
        event.target.mute();
      }
    } catch {}
    setIsPlayer1Ready(true);
  };

  const onPlayerReady2 = (event: { target: PlayerInstance }) => {
    player2Ref.current = event.target;
    // Mute Video 2 by default so audio doesn't double/echo & browser autoplay succeeds
    try {
      if (typeof event.target.setVolume === 'function') {
        event.target.setVolume(vol2);
      }
      if (isMuted2 && typeof event.target.mute === 'function') {
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
          const offset1 = cfg1.start_offset_seconds || 0;
          const offset2 = cfg2.start_offset_seconds || 0;
          const expectedT2 = t1 - offset1 + offset2;

          if (expectedT2 < 0) {
            const state2 = typeof player2Ref.current.getPlayerState === 'function' ? player2Ref.current.getPlayerState() : -1;
            if (state2 === 1) {
              if (typeof player2Ref.current.pauseVideo === 'function') player2Ref.current.pauseVideo();
              if (typeof player2Ref.current.seekTo === 'function') player2Ref.current.seekTo(0, true);
            }
          } else {
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
  }, [isPlaying, isBothReady, cfg1.start_offset_seconds, cfg2.start_offset_seconds]);

  const pendingSeekRef = useRef<{ slot: 1 | 2; seconds: number; autoPlay: boolean } | null>(null);

  const doSeek = useCallback((slot: 1 | 2, seconds: number, autoPlay: boolean = true) => {
    const offset1 = cfg1.start_offset_seconds || 0;
    const offset2 = cfg2.start_offset_seconds || 0;
    let targetTime1 = 0;
    let targetTime2 = 0;

    if (slot === 1) {
      targetTime1 = seconds;
      targetTime2 = seconds - offset1 + offset2;
    } else {
      targetTime2 = seconds;
      targetTime1 = seconds - offset2 + offset1;
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
  }, [cfg1.start_offset_seconds, cfg2.start_offset_seconds]);

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

    const offset1 = cfg1.start_offset_seconds || 0;
    const offset2 = cfg2.start_offset_seconds || 0;

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
        const targetTime2 = time1 - offset1 + offset2;
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

  // ── Relative Seek (-10s, -5s, +5s, +10s) ──
  const handleSeekRelative = (deltaSeconds: number) => {
    if (!isBothReady) return;

    let time1 = 0;
    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        time1 = player1Ref.current.getCurrentTime() || 0;
      }
    } catch {}

    const newTime1 = Math.max(0, time1 + deltaSeconds);
    doSeek(1, newTime1, isPlaying);
  };

  // ── Seek to Prev Note / Next Note ──
  const handleSeekPrevNote = useCallback(() => {
    if (!isBothReady || !hasPrevNote || !captionsList || captionsList.length === 0) return;

    let time1 = 0;
    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        time1 = player1Ref.current.getCurrentTime() || 0;
      }
    } catch {}

    const sorted = [...captionsList].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    const prevCap = [...sorted].reverse().find(c => c.timestamp_seconds < time1 - 1.5);

    if (prevCap) {
      doSeek(prevCap.slot, prevCap.timestamp_seconds, isPlaying);
    }
  }, [isBothReady, hasPrevNote, captionsList, isPlaying, doSeek]);

  const handleSeekNextNote = useCallback(() => {
    if (!isBothReady || !hasNextNote || !captionsList || captionsList.length === 0) return;

    let time1 = 0;
    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        time1 = player1Ref.current.getCurrentTime() || 0;
      }
    } catch {}

    const sorted = [...captionsList].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    const nextCap = sorted.find(c => c.timestamp_seconds > time1 + 1.5);

    if (nextCap) {
      doSeek(nextCap.slot, nextCap.timestamp_seconds, isPlaying);
    }
  }, [isBothReady, hasNextNote, captionsList, isPlaying, doSeek]);

  // ── Global Keyboard Shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || (document.activeElement as HTMLElement)?.isContentEditable;
      if (isInput) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlayBoth();
      } else if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeekRelative(-5);
      } else if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeekRelative(5);
      } else if (e.code === 'ArrowUp' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleSeekPrevNote();
      } else if (e.code === 'ArrowDown' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleSeekNextNote();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlayBoth, handleSeekRelative, handleSeekPrevNote, handleSeekNextNote]);

  const renderTooltip = (id: string, text: string) => {
    if (activeTooltip !== id) return null;
    return (
      <div style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '5px 10px',
        background: '#0f172a',
        color: '#ffffff',
        fontSize: '11px',
        fontWeight: 700,
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
        zIndex: 50
      }}>
        {text}
        {/* Tooltip Arrow pointing UP */}
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom: '5px solid #0f172a'
        }} />
      </div>
    );
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

    const newOffset = Math.round(time1 - time2);
    if (onOffsetChange) {
      onOffsetChange(2, newOffset);
    }
    setSyncPointModalOpen(false);
  };

  // ── Add 2nike Modal Handlers ──
  const handleOpenAddCaptionModal = () => {
    let t1 = 0;
    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        t1 = player1Ref.current.getCurrentTime() || 0;
      }
    } catch {}
    setNewCapTimeStr(formatSecondsToHHMMSS(Math.floor(t1)));
    setAddCaptionModalOpen(true);
  };

  const handleFetchCurrentTimeForModal = () => {
    let t = 0;
    try {
      const p = newCapSlot === 1 ? player1Ref.current : player2Ref.current;
      if (p && typeof p.getCurrentTime === 'function') {
        t = p.getCurrentTime() || 0;
      }
    } catch {}
    setNewCapTimeStr(formatSecondsToHHMMSS(Math.floor(t)));
  };

  const handleSaveCaptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCapText.trim()) {
      toast.error('Vui lòng nhập Title');
      return;
    }

    const sec = parseTimeToSeconds(newCapTimeStr);
    try {
      setSubmittingCap(true);
      const res = await fetch('/api/youtube-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: effectiveMatchId || 'default_match',
          slot: newCapSlot,
          timestamp_seconds: sec,
          timestamp_str: newCapTimeStr || formatSecondsToHHMMSS(sec),
          caption: newCapText.trim(),
          created_by: newCapAuthor.trim() || (isAdmin ? 'Admin' : 'Khán giả')
        })
      });
      const data = await res.json();
      if (res.ok && data.caption) {
        toast.success('Đã lưu 2nike mới!');
        setNewCapText('');
        setAddCaptionModalOpen(false);
      } else {
        toast.error(data.error || 'Lỗi khi lưu 2nike');
      }
    } catch {
      toast.error('Không thể kết nối máy chủ');
    } finally {
      setSubmittingCap(false);
    }
  };

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
      {/* Header & Controls */}
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
        {/* Left: Title */}
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
            <Video size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Highlight
            </h3>
          </div>
        </div>

        {/* Right Actions: Add 2nike Modal Button & Admin Auto calibration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Single Cam Expand / Stretch Toggle Button (Only when 1 Cam exists) */}
          {!cfg2.youtube_id && cfg1.youtube_id && (
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              style={{
                background: isExpanded ? '#e0e7ff' : '#f8fafc',
                color: isExpanded ? '#4f46e5' : '#334155',
                border: isExpanded ? '1px solid #c7d2fe' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 13px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title={isExpanded ? 'Thu nhỏ về kích thước vừa màn hình' : 'Kéo dãn / Mở rộng màn hình Cam 1'}
            >
              {isExpanded ? <Minimize2 size={15} style={{ color: '#4f46e5' }} /> : <Maximize2 size={15} style={{ color: '#6366f1' }} />}
              <span>{isExpanded ? 'Thu nhỏ' : 'Kéo dãn màn hình'}</span>
            </button>
          )}

          {(cfg1.youtube_id || cfg2.youtube_id) && (
            <button
              type="button"
              onClick={handleOpenAddCaptionModal}
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={15} />
              Lưu 2nike
            </button>
          )}

          {isAdmin && cfg1.youtube_id && cfg2.youtube_id && (
            <button
              type="button"
              onClick={handleOpenSyncModal}
              disabled={!isBothReady}
              style={{
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: !isBothReady ? 'not-allowed' : 'pointer',
                opacity: !isBothReady ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Căn mốc đồng bộ tự động"
            >
              <Sliders size={14} style={{ color: '#4f46e5' }} />
              Căn Độ Trễ Auto
            </button>
          )}
        </div>
      </div>

      {/* Video Players Grid: 50% / 50% or Single Cam (Normal / Expanded) */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: (cfg1.youtube_id && cfg2.youtube_id) ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr',
          gap: '16px',
          width: '100%',
          maxWidth: (cfg1.youtube_id && cfg2.youtube_id)
            ? '100%'
            : (isExpanded ? '100%' : 'min(860px, 100%)'),
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Video Slot 1 */}
          <div style={{
            background: '#0f172a',
            borderRadius: '12px',
            overflow: 'hidden',
            border: activeTargetSlot === 1 ? '2px solid #6366f1' : '1px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '8px 14px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              fontWeight: 800,
              color: '#1e293b'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                {cfg1.title || 'Cam 1'}
              </span>
              <span style={{ fontSize: '11px', color: '#047857', background: '#d1fae5', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '4px' }}>
                Độ trễ: {formatSecondsToHHMMSS(cfg1.start_offset_seconds || 0)}
              </span>
            </div>

            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              maxHeight: (cfg1.youtube_id && cfg2.youtube_id)
                ? 'none'
                : (isExpanded ? 'calc(100vh - 180px)' : 'calc(100vh - 280px)'),
              background: '#000000',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {cfg1.youtube_id ? (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  <YouTube
                    videoId={extractYouTubeId(cfg1.youtube_id)}
                    opts={opts}
                    onReady={onPlayerReady1}
                    style={{ width: '100%', height: '100%' }}
                  />
                  {/* Overlay to block any direct user interaction / clicking on Video 1 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      zIndex: 10,
                      background: 'transparent',
                      cursor: 'default'
                    }}
                  />
                </div>
              ) : (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '8px' }}>
                  <Video size={36} style={{ opacity: 0.5 }} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Chưa cấu hình URL Video Slot 1</span>
                </div>
              )}
            </div>
          </div>

          {/* Video Slot 2 */}
          {cfg2.youtube_id && (
            <div style={{
              background: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              border: activeTargetSlot === 2 ? '2px solid #6366f1' : '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: '8px 14px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 800,
                color: '#1e293b'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
                  {cfg2.title || 'Cam 2'}
                </span>
                <span style={{ fontSize: '11px', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '4px' }}>
                  Độ trễ: {formatSecondsToHHMMSS(cfg2.start_offset_seconds || 0)}
                </span>
              </div>

              <div style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                maxHeight: 'none',
                background: '#000000'
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  <YouTube
                    videoId={extractYouTubeId(cfg2.youtube_id)}
                    opts={opts}
                    onReady={onPlayerReady2}
                    style={{ width: '100%', height: '100%' }}
                  />
                  {/* Overlay to block any direct user interaction / clicking on Video 2 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      zIndex: 10,
                      background: 'transparent',
                      cursor: 'default'
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Central Media Control Bar (Sát dưới Video) */}
      {(cfg1.youtube_id || cfg2.youtube_id) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '8px',
          marginTop: '6px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: '#ffffff',
            padding: '8px 14px',
            borderRadius: '9999px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)',
            maxWidth: '100%'
          }}>
            {/* Button 1: 2nike trước */}
            <div style={{ position: 'relative' }}>
              {renderTooltip('prevNote', hasPrevNote ? 'Chuyển tới 2nike trước (Phím ↑)' : 'Đã ở mốc 2nike đầu tiên')}
              <button
                type="button"
                onClick={handleSeekPrevNote}
                onMouseEnter={() => setActiveTooltip('prevNote')}
                onMouseLeave={() => setActiveTooltip(null)}
                disabled={!isBothReady || !hasPrevNote}
                style={{
                  padding: '7px 12px',
                  borderRadius: '9999px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: (!isBothReady || !hasPrevNote) ? 'not-allowed' : 'pointer',
                  opacity: (!isBothReady || !hasPrevNote) ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <SkipBack size={14} style={{ color: hasPrevNote ? '#4f46e5' : '#94a3b8' }} />
                <span className="hidden sm:inline">2nike trước</span>
              </button>
            </div>

            {/* Button 2: -5s */}
            <div style={{ position: 'relative' }}>
              {renderTooltip('back5', 'Lùi 5s (Phím ←)')}
              <button
                type="button"
                onClick={() => handleSeekRelative(-5)}
                onMouseEnter={() => setActiveTooltip('back5')}
                onMouseLeave={() => setActiveTooltip(null)}
                disabled={!isBothReady}
                style={{
                  padding: '7px 12px',
                  borderRadius: '9999px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: !isBothReady ? 'not-allowed' : 'pointer',
                  opacity: !isBothReady ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <Undo2 size={14} style={{ color: '#64748b' }} />
                <span className="hidden sm:inline">-5s</span>
              </button>
            </div>

            {/* Button 3: Play / Pause */}
            <div style={{ position: 'relative' }}>
              {renderTooltip('play', isPlaying ? 'Tạm dừng cả 2 video (Phím Space)' : 'Phát đồng bộ cả 2 video (Phím Space)')}
              <button
                type="button"
                onClick={togglePlayBoth}
                onMouseEnter={() => setActiveTooltip('play')}
                onMouseLeave={() => setActiveTooltip(null)}
                disabled={!isBothReady}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isPlaying
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: !isBothReady ? 'not-allowed' : 'pointer',
                  opacity: !isBothReady ? 0.6 : 1,
                  boxShadow: isPlaying
                    ? '0 4px 14px rgba(245, 158, 11, 0.4)'
                    : '0 4px 14px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.2s ease',
                  margin: '0 2px'
                }}
              >
                {isPlaying ? (
                  <Pause size={20} fill="#ffffff" />
                ) : (
                  <Play size={20} fill="#ffffff" style={{ marginLeft: '2px' }} />
                )}
              </button>
            </div>

            {/* Button 4: +5s */}
            <div style={{ position: 'relative' }}>
              {renderTooltip('next5', 'Tới 5s (Phím →)')}
              <button
                type="button"
                onClick={() => handleSeekRelative(5)}
                onMouseEnter={() => setActiveTooltip('next5')}
                onMouseLeave={() => setActiveTooltip(null)}
                disabled={!isBothReady}
                style={{
                  padding: '7px 12px',
                  borderRadius: '9999px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: !isBothReady ? 'not-allowed' : 'pointer',
                  opacity: !isBothReady ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <span className="hidden sm:inline">+5s</span>
                <Redo2 size={14} style={{ color: '#64748b' }} />
              </button>
            </div>

            {/* Button 5: 2nike tiếp */}
            <div style={{ position: 'relative' }}>
              {renderTooltip('nextNote', hasNextNote ? 'Chuyển tới 2nike tiếp (Phím ↓)' : 'Đã ở mốc 2nike cuối cùng')}
              <button
                type="button"
                onClick={handleSeekNextNote}
                onMouseEnter={() => setActiveTooltip('nextNote')}
                onMouseLeave={() => setActiveTooltip(null)}
                disabled={!isBothReady || !hasNextNote}
                style={{
                  padding: '7px 12px',
                  borderRadius: '9999px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: (!isBothReady || !hasNextNote) ? 'not-allowed' : 'pointer',
                  opacity: (!isBothReady || !hasNextNote) ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <span className="hidden sm:inline">2nike tiếp</span>
                <SkipForward size={14} style={{ color: hasNextNote ? '#4f46e5' : '#94a3b8' }} />
              </button>
            </div>

            {/* Button 6: Âm thanh / Volume Popup */}
            <div style={{ position: 'relative' }}>
              {renderTooltip('volume', 'Chỉnh âm lượng video 1 & 2')}
              <button
                type="button"
                onClick={() => setShowVolumePopover(prev => !prev)}
                onMouseEnter={() => setActiveTooltip('volume')}
                onMouseLeave={() => setActiveTooltip(null)}
                disabled={!isBothReady}
                style={{
                  padding: '7px 12px',
                  borderRadius: '9999px',
                  border: showVolumePopover ? '1px solid #6366f1' : '1px solid #cbd5e1',
                  background: showVolumePopover ? '#eef2ff' : '#ffffff',
                  color: showVolumePopover ? '#4f46e5' : '#334155',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: !isBothReady ? 'not-allowed' : 'pointer',
                  opacity: !isBothReady ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {isMuted1 && isMuted2 ? (
                  <VolumeX size={15} style={{ color: '#ef4444' }} />
                ) : (
                  <Volume2 size={15} style={{ color: '#4f46e5' }} />
                )}
                <span className="hidden sm:inline">Âm thanh</span>
              </button>

              {/* Volume Popover Panel */}
              {showVolumePopover && (
                <div
                  ref={volumePopoverRef}
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 12px)',
                    right: 0,
                    width: '260px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 60,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Volume2 size={15} style={{ color: '#4f46e5' }} />
                      Âm lượng Video
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowVolumePopover(false)}
                      style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Video 1 Volume */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                      <span style={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                        Video 1 ({cfg1.title ? (cfg1.title.length > 12 ? cfg1.title.slice(0, 12) + '...' : cfg1.title) : 'Hiệp 1'})
                      </span>
                      <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                        {isMuted1 ? 'Tắt âm' : `${vol1}%`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={toggleMute1}
                        style={{
                          background: isMuted1 ? '#fee2e2' : '#f1f5f9',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '5px 7px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {isMuted1 ? <VolumeX size={14} style={{ color: '#ef4444' }} /> : <Volume2 size={14} style={{ color: '#4f46e5' }} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted1 ? 0 : vol1}
                        onChange={(e) => handleVol1Change(Number(e.target.value))}
                        style={{ flex: 1, accentColor: '#4f46e5', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  {/* Video 2 Volume */}
                  {cfg2.youtube_id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1' }} />
                          Video 2 ({cfg2.title ? (cfg2.title.length > 12 ? cfg2.title.slice(0, 12) + '...' : cfg2.title) : 'Hiệp 2'})
                        </span>
                        <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                          {isMuted2 ? 'Tắt âm' : `${vol2}%`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={toggleMute2}
                          style={{
                            background: isMuted2 ? '#fee2e2' : '#f1f5f9',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '5px 7px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {isMuted2 ? <VolumeX size={14} style={{ color: '#ef4444' }} /> : <Volume2 size={14} style={{ color: '#4f46e5' }} />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={isMuted2 ? 0 : vol2}
                          onChange={(e) => handleVol2Change(Number(e.target.value))}
                          style={{ flex: 1, accentColor: '#6366f1', cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Down arrow pointing to button */}
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '20px',
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid #ffffff'
                  }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto Sync Modal */}
      {syncPointModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
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
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            color: '#0f172a'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0', color: '#0f172a' }}>
              Tool Căn Độ Trễ Tự Động (Auto Offset Calibration)
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Hãy bấm <strong>Play</strong> trên cả 2 video, tìm đến một tình huống diễn ra cùng lúc (ví dụ: quả phạt góc hoặc bàn thắng), sau đó tạm dừng cả 2 video đúng thời điểm đó và nhấn nút bên dưới.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '13px',
              marginBottom: '20px'
            }}>
              <div>
                <strong>Video 1 (Mốc):</strong> {formatSecondsToHHMMSS(modalTimes.time1)}
              </div>
              <div style={{ marginTop: '6px' }}>
                <strong>Video 2 (Tình huống tương ứng):</strong> {formatSecondsToHHMMSS(modalTimes.time2)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSyncPointModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAutoCalculateSyncPoint}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }}
              >
                Tính & Lưu Độ Trễ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form: Thêm / Lưu 2nike */}
      {addCaptionModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
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
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            color: '#0f172a',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: '#4f46e5' }} />
                Thêm 2nike Mới (Realtime)
              </h3>
              <button
                type="button"
                onClick={() => setAddCaptionModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', fontWeight: 700, cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCaptionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Target Video Slot */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Góc Video
                </label>
                <select
                  value={newCapSlot}
                  onChange={(e) => setNewCapSlot(Number(e.target.value) as 1 | 2)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value={1}>Video 1: {cfg1.title || 'Hiệp 1 / Cam 1'}</option>
                  <option value={2}>Video 2: {cfg2.title || 'Hiệp 2 / Cam 2'}</option>
                </select>
              </div>

              {/* Timestamp Input + Button Lấy Giờ */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Thời gian (HH:MM:SS)</label>
                  <button
                    type="button"
                    onClick={handleFetchCurrentTimeForModal}
                    style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '12px', fontWeight: 800, cursor: 'pointer', padding: 0 }}
                  >
                    🎯 Lấy giờ hiện tại video
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="00:15:30"
                    value={newCapTimeStr}
                    onChange={(e) => setNewCapTimeStr(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      borderRadius: '10px',
                      padding: '10px 12px 10px 34px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Clock size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
                </div>
              </div>

              {/* Author Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Người tạo (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder={isAdmin ? 'Admin' : 'Tên bạn...'}
                  value={newCapAuthor}
                  onChange={(e) => setNewCapAuthor(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Caption Text Input */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Title
                </label>
                <textarea
                  rows={3}
                  placeholder="Nội dung ghi chú (vd: Pha bóng nguy hiểm, Bàn thắng mở tỷ số...)"
                  value={newCapText}
                  onChange={(e) => setNewCapText(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAddCaptionModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingCap}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: submittingCap ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                    opacity: submittingCap ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {submittingCap ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={16} />}
                  Lưu 2nike
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

YouTubeSyncPlayer.displayName = 'YouTubeSyncPlayer';
