import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { MatchCaption, YouTubeVideoConfig } from '@/types/youtube';
import { extractYouTubeId, formatSecondsToHHMMSS, parseTimeToSeconds, parseYouTubeTimestamp } from '@/lib/youtube-utils';
import { supabase } from '@/lib/supabase';
import { Play, Pause, Sliders, Video, RefreshCw, CheckCircle2, Undo2, Redo2, SkipBack, SkipForward, Plus, Sparkles, Clock, Volume2, VolumeX, Settings, Gauge, Monitor, MessageSquareText, Link as LinkIcon, Unlink, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PlayerInstance {
  getCurrentTime?: () => number;
  getDuration?: () => number;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  getPlayerState?: () => number;
  mute?: () => void;
  unMute?: () => void;
  getVolume?: () => number;
  setVolume?: (volume: number) => void;
  isMuted?: () => boolean;
  setPlaybackRate?: (suggestedRate: number) => void;
  getPlaybackRate?: () => number;
  setPlaybackQuality?: (suggestedQuality: string) => void;
  getPlaybackQuality?: () => string;
  loadModule?: (moduleName: string) => void;
  unloadModule?: (moduleName: string) => void;
  getSphericalProperties?: () => { yaw?: number; pitch?: number; roll?: number; fov?: number };
  setSphericalProperties?: (properties: { yaw?: number; pitch?: number; roll?: number; fov?: number }) => void;
  getAvailableQualityLevels?: () => string[];
}

const QUALITY_LABELS: Record<string, string> = {
  auto: 'Auto (Tự động - Mặc định)',
  highres: '8K / Max (HighRes)',
  hd4320: '8K (4320p Ultra HD)',
  hd2880: '5K (2880p Ultra HD)',
  hd2160: '4K (2160p Ultra HD)',
  hd1440: '2K (1440p QHD)',
  hd1080: '1080p (Full HD)',
  hd720: '720p (HD)',
  large: '480p',
  medium: '360p',
  small: '240p',
  tiny: '144p',
};

const ALL_QUALITY_OPTIONS = [
  'auto',
  'highres',
  'hd4320',
  'hd2160',
  'hd1440',
  'hd1080',
  'hd720',
  'large',
  'medium',
  'small',
  'tiny',
];

interface PlayerTimelineProps {
  slot: 1 | 2;
  youtubeId: string;
  currentTime: number;
  duration: number;
  captions: MatchCaption[];
  onSeek: (seconds: number) => void;
}

const PlayerTimeline: React.FC<PlayerTimelineProps> = ({
  slot,
  youtubeId,
  currentTime,
  duration,
  captions,
  onSeek,
}) => {
  const [hoverInfo, setHoverInfo] = useState<{ time: number; percent: number; x: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanId = extractYouTubeId(youtubeId);
  const playPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const calculateTimeFromEvent = useCallback((clientX: number) => {
    if (!containerRef.current || duration <= 0) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    const time = (x / rect.width) * duration;
    return { time, percent, x };
  }, [duration]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const info = calculateTimeFromEvent(e.clientX);
    if (info) {
      setHoverInfo(info);
      if (isDragging) {
        onSeek(info.time);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const info = calculateTimeFromEvent(e.clientX);
    if (info) {
      onSeek(info.time);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const info = calculateTimeFromEvent(e.clientX);
      if (info) {
        setHoverInfo(info);
        onSeek(info.time);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, calculateTimeFromEvent, onSeek]);

  // Filter captions to only show nodes belonging to this specific video / slot
  const videoCaptions = React.useMemo(() => {
    if (!captions || captions.length === 0) return [];
    return captions.filter(c => {
      if (c.youtube_id && cleanId && extractYouTubeId(c.youtube_id) === cleanId) {
        return true;
      }
      if (c.slot) {
        return Number(c.slot) === Number(slot);
      }
      return Number(slot) === 1;
    });
  }, [captions, slot, cleanId]);

  // Find 2nike near hover time (within 6 seconds)
  const nearbyCaption = React.useMemo(() => {
    if (!hoverInfo || !videoCaptions || videoCaptions.length === 0) return null;
    return videoCaptions.find(c => Math.abs(c.timestamp_seconds - hoverInfo.time) <= 6);
  }, [hoverInfo, videoCaptions]);

  // Dynamic translateX percentage so tooltip follows mouse cursor across 100% of seekbar without clipping edges
  let translateXPercent = -50;
  if (hoverInfo) {
    if (hoverInfo.percent < 15) {
      translateXPercent = -10 - (hoverInfo.percent / 15) * 40;
    } else if (hoverInfo.percent > 85) {
      translateXPercent = -50 - ((hoverInfo.percent - 85) / 15) * 40;
    }
  }

  return (
    <div style={{
      background: '#090d16',
      padding: '10px 14px',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      userSelect: 'none',
      position: 'relative',
      borderBottomLeftRadius: '12px',
      borderBottomRightRadius: '12px'
    }}>
      {/* Mini Preview Box & Seekbar Track */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '10px', paddingBottom: '4px' }}>
        
        {/* YouTube Hover Tooltip Card */}
        {(isHovered || isDragging) && hoverInfo && (
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            left: `${hoverInfo.percent}%`,
            transform: `translateX(${translateXPercent}%)`,
            pointerEvents: 'none',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {nearbyCaption ? (
              /* Rich 2nike Info Card when hovering near 2nike */
              <div style={{
                background: 'rgba(15, 23, 42, 0.96)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid #f59e0b',
                borderRadius: '10px',
                padding: '8px 12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7), 0 0 12px rgba(245, 158, 11, 0.3)',
                maxWidth: '220px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px',
                textAlign: 'center'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  boxSizing: 'border-box'
                }}>
                  📌 {nearbyCaption.caption}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                  <Clock size={12} style={{ color: '#f59e0b' }} />
                  {nearbyCaption.timestamp_str || formatSecondsToHHMMSS(nearbyCaption.timestamp_seconds)}
                </div>

                {nearbyCaption.created_by && (
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                    Bởi: {nearbyCaption.created_by}
                  </span>
                )}
              </div>
            ) : (
              /* Simple Time Tooltip when hovering normal timeline */
              <div style={{
                background: 'rgba(15, 23, 42, 0.94)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '8px',
                padding: '5px 10px',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                fontFamily: 'monospace',
                letterSpacing: '0.4px',
                whiteSpace: 'nowrap'
              }}>
                {formatSecondsToHHMMSS(Math.floor(hoverInfo.time))}
              </div>
            )}

            {/* Downward Pointer Triangle */}
            <div style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: nearbyCaption ? '6px solid rgba(15, 23, 42, 0.96)' : '6px solid rgba(15, 23, 42, 0.94)',
              marginTop: '-1px'
            }} />
          </div>
        )}

        {/* Progress Bar Track */}
        <div
          ref={containerRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            if (!isDragging) {
              setIsHovered(false);
              setHoverInfo(null);
            }
          }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          style={{
            position: 'relative',
            width: '100%',
            height: '10px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '9999px',
            cursor: 'pointer'
          }}
        >
          {/* Hover Ghost Bar */}
          {hoverInfo && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${hoverInfo.percent}%`,
              height: '100%',
              background: 'rgba(255, 255, 255, 0.35)',
              borderRadius: '9999px',
              pointerEvents: 'none'
            }} />
          )}

          {/* Played Red Bar (YouTube Style) */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${playPercent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
            borderRadius: '9999px',
            pointerEvents: 'none'
          }} />

          {/* 2nike Markers on Timeline */}
          {duration > 0 && videoCaptions.map(c => {
            const capPercent = (c.timestamp_seconds / duration) * 100;
            if (capPercent < 0 || capPercent > 100) return null;
            return (
              <div
                key={c.id}
                title={`2nike (${c.timestamp_str}): ${c.caption}`}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${capPercent}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  border: '1.5px solid #ffffff',
                  zIndex: 5,
                  boxShadow: '0 0 6px rgba(245, 158, 11, 0.9)',
                  pointerEvents: 'none'
                }}
              />
            );
          })}

          {/* Scrubber Knob Handle */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: `${playPercent}%`,
            transform: 'translate(-50%, -50%)',
            width: '15px',
            height: '15px',
            borderRadius: '50%',
            background: '#ef4444',
            border: '2.5px solid #ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            zIndex: 6
          }} />
        </div>
      </div>

      {/* Bottom Bar: Timestamp text */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        fontWeight: 700,
        color: '#94a3b8',
        fontFamily: 'monospace'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#f8fafc' }}>
            {formatSecondsToHHMMSS(Math.floor(currentTime))}
          </span>
          <span>/</span>
          <span>
            {duration > 0 ? formatSecondsToHHMMSS(Math.floor(duration)) : '--:--'}
          </span>
        </div>
      </div>
    </div>
  );
};

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

  const [isPlaying, setIsPlaying] = useState(true);
  const [isSyncEnabled, setIsSyncEnabled] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [syncPointModalOpen, setSyncPointModalOpen] = useState(false);
  const [syncTimeStr1, setSyncTimeStr1] = useState('00:00:00');
  const [syncTimeStr2, setSyncTimeStr2] = useState('00:00:00');

  const [captionsList, setCaptionsList] = useState<MatchCaption[]>(propsCaptions || []);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);

  // Add 2nike Modal State
  const [addCaptionModalOpen, setAddCaptionModalOpen] = useState(false);
  const [newCapSlot, setNewCapSlot] = useState<1 | 2>(1);
  const [newCapTimeStr, setNewCapTimeStr] = useState('');
  const [newCapAuthor, setNewCapAuthor] = useState('');
  const [newCapText, setNewCapText] = useState('');
  const [newCapUrl, setNewCapUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [submittingCap, setSubmittingCap] = useState(false);
  const [createdShareLink, setCreatedShareLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; name?: string; role?: string } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch {}
    }
    checkAuth();
  }, []);

  const effectiveMatchId = matchId || cfg1.match_id || cfg2.match_id || '';

  // 360° Camera View State & Zoom
  const [spherical1, setSpherical1] = useState<{ yaw: number; pitch: number; roll: number; fov: number }>({ yaw: 0, pitch: 0, roll: 0, fov: 60 });
  const [spherical2, setSpherical2] = useState<{ yaw: number; pitch: number; roll: number; fov: number }>({ yaw: 0, pitch: 0, roll: 0, fov: 60 });
  const [zoomScale1, setZoomScale1] = useState<number>(1);
  const [zoomScale2, setZoomScale2] = useState<number>(1);
  const [target360Slot, setTarget360Slot] = useState<1 | 2 | 0>(1);

  const isDragging360Ref1 = useRef(false);
  const isDragging360Ref2 = useRef(false);
  const lastMousePosRef1 = useRef<{ x: number; y: number } | null>(null);
  const lastMousePosRef2 = useRef<{ x: number; y: number } | null>(null);

  const rotateCamera = useCallback((slot: 1 | 2 | 0, deltaYaw: number, deltaPitch: number) => {
    const slotsToUpdate = slot === 0 ? [1, 2] : [slot];

    slotsToUpdate.forEach((s) => {
      const player = s === 1 ? player1Ref.current : player2Ref.current;
      const currentSpherical = s === 1 ? spherical1 : spherical2;
      const setSpherical = s === 1 ? setSpherical1 : setSpherical2;

      if (player && typeof player.setSphericalProperties === 'function') {
        const liveProps = typeof player.getSphericalProperties === 'function'
          ? player.getSphericalProperties() || currentSpherical
          : currentSpherical;

        let newYaw = ((liveProps.yaw || 0) + deltaYaw + 180) % 360 - 180;
        if (newYaw < -180) newYaw += 360;
        const newPitch = Math.max(-90, Math.min(90, (liveProps.pitch || 0) + deltaPitch));

        const updated = {
          yaw: Math.round(newYaw),
          pitch: Math.round(newPitch),
          roll: liveProps.roll || 0,
          fov: liveProps.fov || 60,
        };
        player.setSphericalProperties(updated);
        setSpherical(updated);
      }
    });
  }, [spherical1, spherical2]);

  const changeZoom = useCallback((slot: 1 | 2 | 0, zoomLevel: number) => {
    const clampedZoom = Math.max(1, Math.min(3, Math.round(zoomLevel * 100) / 100));
    const fov = Math.round(90 - (clampedZoom - 1) * 30);

    const slotsToUpdate = slot === 0 ? [1, 2] : [slot];

    slotsToUpdate.forEach((s) => {
      if (s === 1) setZoomScale1(clampedZoom);
      if (s === 2) setZoomScale2(clampedZoom);

      const player = s === 1 ? player1Ref.current : player2Ref.current;
      const currentSpherical = s === 1 ? spherical1 : spherical2;
      const setSpherical = s === 1 ? setSpherical1 : setSpherical2;

      if (player && typeof player.setSphericalProperties === 'function') {
        const updated = {
          yaw: currentSpherical.yaw || 0,
          pitch: currentSpherical.pitch || 0,
          roll: currentSpherical.roll || 0,
          fov,
        };
        player.setSphericalProperties(updated);
        setSpherical(updated);
      }
    });
  }, [spherical1, spherical2]);

  const resetCamera = useCallback((slot: 1 | 2 | 0) => {
    const slotsToUpdate = slot === 0 ? [1, 2] : [slot];

    slotsToUpdate.forEach((s) => {
      if (s === 1) {
        setZoomScale1(1);
        setSpherical1({ yaw: 0, pitch: 0, roll: 0, fov: 60 });
      }
      if (s === 2) {
        setZoomScale2(1);
        setSpherical2({ yaw: 0, pitch: 0, roll: 0, fov: 60 });
      }

      const player = s === 1 ? player1Ref.current : player2Ref.current;
      if (player && typeof player.setSphericalProperties === 'function') {
        player.setSphericalProperties({ yaw: 0, pitch: 0, roll: 0, fov: 60 });
      }
    });
  }, []);

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

  const [isPlayer1Ready, setIsPlayer1Ready] = useState(false);
  const [isPlayer2Ready, setIsPlayer2Ready] = useState(false);
  const [isPlayer1Ended, setIsPlayer1Ended] = useState(false);
  const [isPlayer2Ended, setIsPlayer2Ended] = useState(false);

  useEffect(() => {
    setIsPlayer1Ready(false);
    setIsPlayer2Ready(false);
    setIsPlayer1Ended(false);
    setIsPlayer2Ended(false);
  }, [cfg1.youtube_id, cfg2.youtube_id]);

  const isBothReady = Boolean(
    (cfg1.youtube_id ? isPlayer1Ready : true) &&
    (cfg2.youtube_id ? isPlayer2Ready : true)
  );

  const [duration1, setDuration1] = useState(0);
  const [duration2, setDuration2] = useState(0);
  const [currentTime1, setCurrentTime1] = useState(0);
  const [currentTime2, setCurrentTime2] = useState(0);

  useEffect(() => {
    if (!isBothReady) return;

    const interval = setInterval(() => {
      try {
        if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
          const t1 = player1Ref.current.getCurrentTime() || 0;
          setCurrentTime1(t1);
          setCurrentVideoTime(t1);
          if (typeof player1Ref.current.getDuration === 'function') {
            const d1 = player1Ref.current.getDuration() || 0;
            if (d1 > 0) setDuration1(d1);
          }
        }
        if (player2Ref.current && typeof player2Ref.current.getCurrentTime === 'function') {
          const t2 = player2Ref.current.getCurrentTime() || 0;
          setCurrentTime2(t2);
          if (typeof player2Ref.current.getDuration === 'function') {
            const d2 = player2Ref.current.getDuration() || 0;
            if (d2 > 0) setDuration2(d2);
          }
        }
      } catch {}
    }, 500);

    return () => clearInterval(interval);
  }, [isBothReady]);

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

  const [vol1, setVol1] = useState(100);
  const [isMuted1, setIsMuted1] = useState(false);
  const [vol2, setVol2] = useState(100);
  const [isMuted2, setIsMuted2] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [playbackQuality, setPlaybackQuality] = useState<string>('auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const settingsPopoverRef = useRef<HTMLDivElement>(null);

  const currentActiveCaption1 = React.useMemo(() => {
    if (!showSubtitles || !captionsList || captionsList.length === 0) return null;
    return captionsList.find(c => {
      const isForSlot1 = c.youtube_id && cfg1.youtube_id
        ? extractYouTubeId(c.youtube_id) === extractYouTubeId(cfg1.youtube_id)
        : (!c.slot || Number(c.slot) === 1);
      return isForSlot1 && currentTime1 >= c.timestamp_seconds - 1 && currentTime1 <= c.timestamp_seconds + 5;
    });
  }, [showSubtitles, captionsList, currentTime1, cfg1.youtube_id]);

  const currentActiveCaption2 = React.useMemo(() => {
    if (!showSubtitles || !captionsList || captionsList.length === 0) return null;
    return captionsList.find(c => {
      const isForSlot2 = c.youtube_id && cfg2.youtube_id
        ? extractYouTubeId(c.youtube_id) === extractYouTubeId(cfg2.youtube_id)
        : Number(c.slot) === 2;
      return isForSlot2 && currentTime2 >= c.timestamp_seconds - 1 && currentTime2 <= c.timestamp_seconds + 5;
    });
  }, [showSubtitles, captionsList, currentTime2, cfg2.youtube_id]);

  const handleToggleSubtitles = () => {
    setShowSubtitles(prev => {
      const nextState = !prev;
      try {
        if (player1Ref.current) {
          if (nextState) {
            if (typeof player1Ref.current.loadModule === 'function') player1Ref.current.loadModule('captions');
          } else {
            if (typeof player1Ref.current.unloadModule === 'function') player1Ref.current.unloadModule('captions');
          }
        }
        if (player2Ref.current) {
          if (nextState) {
            if (typeof player2Ref.current.loadModule === 'function') player2Ref.current.loadModule('captions');
          } else {
            if (typeof player2Ref.current.unloadModule === 'function') player2Ref.current.unloadModule('captions');
          }
        }
      } catch {}
      return nextState;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsPopoverRef.current && !settingsPopoverRef.current.contains(e.target as Node)) {
        setShowSettingsPopover(false);
      }
    };
    if (showSettingsPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsPopover]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    try {
      if (player1Ref.current && typeof player1Ref.current.setPlaybackRate === 'function') {
        player1Ref.current.setPlaybackRate(speed);
      }
      if (player2Ref.current && typeof player2Ref.current.setPlaybackRate === 'function') {
        player2Ref.current.setPlaybackRate(speed);
      }
    } catch {}
  };

  const handleQualityChange = (quality: string) => {
    setPlaybackQuality(quality);
    try {
      if (player1Ref.current && typeof player1Ref.current.setPlaybackQuality === 'function') {
        player1Ref.current.setPlaybackQuality(quality);
      }
      if (player2Ref.current && typeof player2Ref.current.setPlaybackQuality === 'function') {
        player2Ref.current.setPlaybackQuality(quality);
      }
    } catch {}
  };

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
    const floorT1 = Math.floor(t1);
    const floorT2 = Math.floor(t2);
    setSyncTimeStr1(formatSecondsToHHMMSS(floorT1));
    setSyncTimeStr2(formatSecondsToHHMMSS(floorT2));
    setSyncPointModalOpen(true);
  };

  const opts1: YouTubeProps['opts'] = React.useMemo(() => ({
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      rel: 0,
      controls: 0,
      playsinline: 1,
      disablekb: 1,
      cc_load_policy: 0,
    },
  }), []);

  const opts2: YouTubeProps['opts'] = React.useMemo(() => ({
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      rel: 0,
      controls: 0,
      playsinline: 1,
      disablekb: 1,
      cc_load_policy: 0,
    },
  }), []);

  const onPlayerReady1 = (event: { target: PlayerInstance }) => {
    player1Ref.current = event.target;
    try {
      if (typeof event.target.getDuration === 'function') {
        const d1 = event.target.getDuration() || 0;
        if (d1 > 0) setDuration1(d1);
      }
      if (typeof event.target.getAvailableQualityLevels === 'function') {
        const levels = event.target.getAvailableQualityLevels() || [];
        if (Array.isArray(levels) && levels.length > 0) {
          setAvailableQualities(prev => Array.from(new Set([...prev, ...levels])));
        }
      }
      if (typeof event.target.setVolume === 'function') {
        event.target.setVolume(vol1);
      }
      if (isMuted1 && typeof event.target.mute === 'function') {
        event.target.mute();
      }
      if (playbackSpeed !== 1 && typeof event.target.setPlaybackRate === 'function') {
        event.target.setPlaybackRate(playbackSpeed);
      }
      if (playbackQuality !== 'auto' && typeof event.target.setPlaybackQuality === 'function') {
        event.target.setPlaybackQuality(playbackQuality);
      }
    } catch {}
    setIsPlayer1Ready(true);
  };

  const onPlayerReady2 = (event: { target: PlayerInstance }) => {
    player2Ref.current = event.target;
    try {
      if (typeof event.target.getDuration === 'function') {
        const d2 = event.target.getDuration() || 0;
        if (d2 > 0) setDuration2(d2);
      }
      if (typeof event.target.getAvailableQualityLevels === 'function') {
        const levels = event.target.getAvailableQualityLevels() || [];
        if (Array.isArray(levels) && levels.length > 0) {
          setAvailableQualities(prev => Array.from(new Set([...prev, ...levels])));
        }
      }
      if (typeof event.target.setVolume === 'function') {
        event.target.setVolume(vol2);
      }
      if (isMuted2 && typeof event.target.mute === 'function') {
        event.target.mute();
      }
      if (playbackSpeed !== 1 && typeof event.target.setPlaybackRate === 'function') {
        event.target.setPlaybackRate(playbackSpeed);
      }
      if (playbackQuality !== 'auto' && typeof event.target.setPlaybackQuality === 'function') {
        event.target.setPlaybackQuality(playbackQuality);
      }
    } catch {}
    setIsPlayer2Ready(true);
  };

  const onPlayerStateChange1 = (event: { data: number }) => {
    if (event.data === 1) {
      setIsPlaying(true);
    } else if (event.data === 2) {
      let isOtherPlaying = false;
      try {
        if (player2Ref.current && typeof player2Ref.current.getPlayerState === 'function') {
          isOtherPlaying = player2Ref.current.getPlayerState() === 1;
        }
      } catch {}
      if (!isOtherPlaying) {
        setIsPlaying(false);
      }
    }
  };

  const onPlayerStateChange2 = (event: { data: number }) => {
    if (event.data === 1) {
      setIsPlaying(true);
      if (isSyncEnabled && player1Ref.current && player2Ref.current) {
        try {
          const t1 = typeof player1Ref.current.getCurrentTime === 'function' ? (player1Ref.current.getCurrentTime() || 0) : 0;
          const t2 = typeof player2Ref.current.getCurrentTime === 'function' ? (player2Ref.current.getCurrentTime() || 0) : 0;
          const d1 = duration1 || (typeof player1Ref.current.getDuration === 'function' ? player1Ref.current.getDuration() || 0 : 0);
          const offset1 = cfg1.start_offset_seconds || 0;
          const offset2 = cfg2.start_offset_seconds || 0;
          const expectedT2 = t1 - offset2 + offset1;

          // If Video 1 has already ended (or reached max duration), do not pull Video 2 back!
          const isV1Ended = isPlayer1Ended || (d1 > 0 && t1 >= d1 - 1);

          if (!isV1Ended) {
            if (expectedT2 < 0) {
              if (typeof player2Ref.current.pauseVideo === 'function') {
                player2Ref.current.pauseVideo();
              }
              if (typeof player2Ref.current.seekTo === 'function') {
                player2Ref.current.seekTo(0, true);
              }
            } else if (Math.abs(t2 - expectedT2) > 1.5) {
              if (typeof player2Ref.current.seekTo === 'function') {
                player2Ref.current.seekTo(expectedT2, true);
              }
            }
          }
        } catch {}
      }
    } else if (event.data === 2) {
      let isOtherPlaying = false;
      try {
        if (player1Ref.current && typeof player1Ref.current.getPlayerState === 'function') {
          isOtherPlaying = player1Ref.current.getPlayerState() === 1;
        }
      } catch {}
      if (!isOtherPlaying) {
        setIsPlaying(false);
      }
    }
  };

  // ── Handle video end: let the other video keep playing ──
  const onPlayerEnd1 = () => {
    setIsPlayer1Ended(true);
    // If video 2 is still going, let it continue
    if (player2Ref.current) {
      try {
        const state2 = typeof player2Ref.current.getPlayerState === 'function' ? player2Ref.current.getPlayerState() : -1;
        if (state2 === 1) {
          // Video 2 still playing, keep isPlaying true
          return;
        }
      } catch {}
    }
    setIsPlaying(false);
  };

  const onPlayerEnd2 = () => {
    setIsPlayer2Ended(true);
    // If video 1 is still going, let it continue
    if (player1Ref.current) {
      try {
        const state1 = typeof player1Ref.current.getPlayerState === 'function' ? player1Ref.current.getPlayerState() : -1;
        if (state1 === 1) {
          // Video 1 still playing, keep isPlaying true
          return;
        }
      } catch {}
    }
    setIsPlaying(false);
  };

  // ── Auto Re-Sync Video 2 when offset configs load from API ──
  useEffect(() => {
    if (!isBothReady || !isSyncEnabled) return;

    const offset1 = cfg1.start_offset_seconds || 0;
    const offset2 = cfg2.start_offset_seconds || 0;

    let t1 = 0;
    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        t1 = player1Ref.current.getCurrentTime() || 0;
      }
    } catch {}

    const expectedT2 = t1 - offset2 + offset1;
    try {
      if (player2Ref.current && typeof player2Ref.current.seekTo === 'function') {
        if (expectedT2 < 0) {
          player2Ref.current.seekTo(0, true);
          if (typeof player2Ref.current.pauseVideo === 'function') player2Ref.current.pauseVideo();
        } else {
          player2Ref.current.seekTo(expectedT2, true);
        }
      }
    } catch {}
  }, [isBothReady, isSyncEnabled, cfg1.start_offset_seconds, cfg2.start_offset_seconds, cfg1.youtube_id, cfg2.youtube_id]);

  // ── Sync Loop: Ensures Video 2 waits at 0s until Video 1 reaches offset2 ──
  useEffect(() => {
    if (!isBothReady || !isSyncEnabled) return;

    const interval = setInterval(() => {
      try {
        if (player1Ref.current && player2Ref.current) {
          const t1 = typeof player1Ref.current.getCurrentTime === 'function' ? (player1Ref.current.getCurrentTime() || 0) : 0;
          const t2 = typeof player2Ref.current.getCurrentTime === 'function' ? (player2Ref.current.getCurrentTime() || 0) : 0;
          const d1 = duration1 || (typeof player1Ref.current.getDuration === 'function' ? player1Ref.current.getDuration() || 0 : 0);
          const offset1 = cfg1.start_offset_seconds || 0;
          const offset2 = cfg2.start_offset_seconds || 0;
          const expectedT2 = t1 - offset2 + offset1;

          // Check if Video 1 reached the end
          const isV1Ended = isPlayer1Ended || (d1 > 0 && t1 >= d1 - 1);

          if (isV1Ended) {
            // Video 1 has ended, allow Video 2 to play independently to its own end
            return;
          }

          if (expectedT2 < 0) {
            const state2 = typeof player2Ref.current.getPlayerState === 'function' ? player2Ref.current.getPlayerState() : -1;
            if (state2 === 1) { // 1 is PLAYING
              if (typeof player2Ref.current.pauseVideo === 'function') player2Ref.current.pauseVideo();
              if (typeof player2Ref.current.seekTo === 'function') player2Ref.current.seekTo(0, true);
            }
          } else {
            const state2 = typeof player2Ref.current.getPlayerState === 'function' ? player2Ref.current.getPlayerState() : -1;

            if (isPlayer2Ended) {
              // Video 2 has ended, don't force replay it
            } else if (state2 !== 1 && isPlaying) {
              if (typeof player2Ref.current.seekTo === 'function') player2Ref.current.seekTo(expectedT2, true);
              if (typeof player2Ref.current.playVideo === 'function') player2Ref.current.playVideo();
            } else if (isPlaying && Math.abs(t2 - expectedT2) > 1.5) {
              if (typeof player2Ref.current.seekTo === 'function') player2Ref.current.seekTo(expectedT2, true);
            }
          }
        }
      } catch {}
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, isBothReady, isSyncEnabled, isPlayer1Ended, isPlayer2Ended, duration1, cfg1.start_offset_seconds, cfg2.start_offset_seconds]);

  const handleManualSync = () => {
    if (!isBothReady) return;
    let t1 = 0;
    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        t1 = player1Ref.current.getCurrentTime() || 0;
      }
    } catch {}
    doSeek(1, t1, true);
    setIsPlaying(true);
  };

  const pendingSeekRef = useRef<{ slot: 1 | 2; seconds: number; autoPlay: boolean } | null>(null);

  const doSeek = useCallback((slot: 1 | 2, seconds: number, autoPlay: boolean = true) => {
    const offset1 = cfg1.start_offset_seconds || 0;
    const offset2 = cfg2.start_offset_seconds || 0;

    // IF sync is disabled, seek ONLY the targeted slot player
    if (!isSyncEnabled) {
      try {
        const p = slot === 1 ? player1Ref.current : player2Ref.current;
        if (p && typeof p.seekTo === 'function') {
          p.seekTo(seconds, true);
          if (autoPlay && typeof p.playVideo === 'function') {
            p.playVideo();
          }
        }
        if (autoPlay) setIsPlaying(true);
      } catch (e) {
        console.warn('Seek error:', e);
      }
      return;
    }

    let targetTime1 = 0;
    let targetTime2 = 0;

    if (slot === 1) {
      targetTime1 = seconds;
      targetTime2 = seconds - offset2 + offset1;
    } else {
      targetTime2 = seconds;
      targetTime1 = seconds + offset2 - offset1;
    }

    const d1 = duration1 || (player1Ref.current && typeof player1Ref.current.getDuration === 'function' ? player1Ref.current.getDuration() || 0 : 0);
    const d2 = duration2 || (player2Ref.current && typeof player2Ref.current.getDuration === 'function' ? player2Ref.current.getDuration() || 0 : 0);

    try {
      if (player1Ref.current && typeof player1Ref.current.seekTo === 'function') {
        if (d1 > 0 && targetTime1 >= d1) {
          // Seeking past Video 1 end: clamp Video 1 to end
          player1Ref.current.seekTo(d1, true);
          if (typeof player1Ref.current.pauseVideo === 'function') {
            player1Ref.current.pauseVideo();
          }
          setIsPlayer1Ended(true);
        } else if (targetTime1 < 0) {
          player1Ref.current.seekTo(0, true);
          setIsPlayer1Ended(false);
        } else {
          player1Ref.current.seekTo(targetTime1, true);
          setIsPlayer1Ended(false);
          if (autoPlay && typeof player1Ref.current.playVideo === 'function') {
            player1Ref.current.playVideo();
          }
        }
      }

      if (player2Ref.current && typeof player2Ref.current.seekTo === 'function') {
        if (targetTime2 < 0) {
          player2Ref.current.seekTo(0, true);
          if (typeof player2Ref.current.pauseVideo === 'function') {
            player2Ref.current.pauseVideo();
          }
          setIsPlayer2Ended(false);
        } else if (d2 > 0 && targetTime2 >= d2) {
          player2Ref.current.seekTo(d2, true);
          if (typeof player2Ref.current.pauseVideo === 'function') {
            player2Ref.current.pauseVideo();
          }
          setIsPlayer2Ended(true);
        } else {
          player2Ref.current.seekTo(targetTime2, true);
          setIsPlayer2Ended(false);
          if (autoPlay && typeof player2Ref.current.playVideo === 'function') {
            player2Ref.current.playVideo();
          }
        }
      }

      if (autoPlay) {
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('Seek error:', e);
    }
  }, [isSyncEnabled, duration1, duration2, cfg1.start_offset_seconds, cfg2.start_offset_seconds]);

  useImperativeHandle(ref, () => ({
    seekTo: (slot: 1 | 2, seconds: number, autoPlay: boolean = true) => {
      if (isBothReady) {
        doSeek(slot, seconds, autoPlay);
      } else {
        pendingSeekRef.current = { slot, seconds, autoPlay };
      }
    },
    seekBothWithOffset: (masterSeconds: number, autoPlay: boolean = true) => {
      if (isBothReady) {
        doSeek(1, masterSeconds, autoPlay);
      } else {
        pendingSeekRef.current = { slot: 1, seconds: masterSeconds, autoPlay };
      }
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
      return { time1: t1, time2: t2 };
    }
  }), [isBothReady, doSeek]);

  useEffect(() => {
    if (isBothReady && pendingSeekRef.current) {
      const { slot, seconds, autoPlay } = pendingSeekRef.current;
      pendingSeekRef.current = null;
      doSeek(slot, seconds, autoPlay);
    }
  }, [isBothReady, doSeek]);

  const togglePlayBoth = useCallback(() => {
    if (!isBothReady) return;

    if (isPlaying) {
      try {
        if (player1Ref.current && typeof player1Ref.current.pauseVideo === 'function') {
          player1Ref.current.pauseVideo();
        }
        if (player2Ref.current && typeof player2Ref.current.pauseVideo === 'function') {
          player2Ref.current.pauseVideo();
        }
      } catch {}
      setIsPlaying(false);
    } else {
      try {
        if (player1Ref.current && typeof player1Ref.current.playVideo === 'function') {
          player1Ref.current.playVideo();
        }

        if (player2Ref.current && typeof player2Ref.current.playVideo === 'function') {
          if (!isSyncEnabled) {
            player2Ref.current.playVideo();
          } else {
            const t1 = typeof player1Ref.current?.getCurrentTime === 'function' ? (player1Ref.current.getCurrentTime() || 0) : 0;
            const d1 = duration1 || (player1Ref.current && typeof player1Ref.current.getDuration === 'function' ? player1Ref.current.getDuration() || 0 : 0);
            const offset1 = cfg1.start_offset_seconds || 0;
            const offset2 = cfg2.start_offset_seconds || 0;
            const expectedT2 = t1 - offset2 + offset1;

            if (expectedT2 >= 0 || (d1 > 0 && t1 >= d1 - 1)) {
              player2Ref.current.playVideo();
            }
          }
        }
      } catch {}
      setIsPlaying(true);
    }
  }, [isBothReady, isPlaying, isSyncEnabled, duration1, cfg1.start_offset_seconds, cfg2.start_offset_seconds]);

  const handleSeekRelative = useCallback((deltaSeconds: number) => {
    if (!isBothReady) return;

    let t1 = 0;
    let t2 = 0;
    const d1 = duration1 || (player1Ref.current && typeof player1Ref.current.getDuration === 'function' ? player1Ref.current.getDuration() || 0 : 0);
    const d2 = duration2 || (player2Ref.current && typeof player2Ref.current.getDuration === 'function' ? player2Ref.current.getDuration() || 0 : 0);

    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        t1 = player1Ref.current.getCurrentTime() || 0;
      }
      if (player2Ref.current && typeof player2Ref.current.getCurrentTime === 'function') {
        t2 = player2Ref.current.getCurrentTime() || 0;
      }
    } catch {}

    const isV1Ended = isPlayer1Ended || (d1 > 0 && t1 >= d1 - 1);

    if (!isSyncEnabled) {
      // Unsynced mode: seek both videos relative to their own current time
      try {
        if (player1Ref.current && typeof player1Ref.current.seekTo === 'function') {
          const newT1 = Math.max(0, Math.min(d1 > 0 ? d1 : Infinity, t1 + deltaSeconds));
          player1Ref.current.seekTo(newT1, true);
        }
        if (player2Ref.current && typeof player2Ref.current.seekTo === 'function') {
          const newT2 = Math.max(0, Math.min(d2 > 0 ? d2 : Infinity, t2 + deltaSeconds));
          player2Ref.current.seekTo(newT2, true);
        }
        if (isPlaying) {
          if (player1Ref.current && typeof player1Ref.current.playVideo === 'function') player1Ref.current.playVideo();
          if (player2Ref.current && typeof player2Ref.current.playVideo === 'function') player2Ref.current.playVideo();
        }
      } catch (e) {
        console.warn('Relative seek error:', e);
      }
      return;
    }

    // Synced mode:
    if (isV1Ended) {
      // Video 1 has ended, seek Video 2 relative to Video 2's current time (t2)
      const newT2 = Math.max(0, t2 + deltaSeconds);
      doSeek(2, newT2, isPlaying);
    } else {
      // Normal synced seek relative to Video 1
      const newT1 = Math.max(0, t1 + deltaSeconds);
      doSeek(1, newT1, isPlaying);
    }
  }, [isBothReady, isPlaying, isSyncEnabled, isPlayer1Ended, duration1, duration2, doSeek]);

  const handleSeekPrevNote = useCallback(() => {
    if (!isBothReady || !hasPrevNote || !captionsList || captionsList.length === 0) return;
    let t1 = 0;
    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        t1 = player1Ref.current.getCurrentTime() || 0;
      }
    } catch {}

    const sorted = [...captionsList].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    const prevCap = [...sorted].reverse().find(c => c.timestamp_seconds < t1 - 1.5);
    if (prevCap) {
      doSeek(prevCap.slot, prevCap.timestamp_seconds, isPlaying);
    }
  }, [isBothReady, hasPrevNote, captionsList, isPlaying, doSeek]);

  const handleSeekNextNote = useCallback(() => {
    if (!isBothReady || !hasNextNote || !captionsList || captionsList.length === 0) return;
    let t1 = 0;
    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        t1 = player1Ref.current.getCurrentTime() || 0;
      }
    } catch {}

    const sorted = [...captionsList].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    const nextCap = sorted.find(c => c.timestamp_seconds > t1 + 1.5);
    if (nextCap) {
      doSeek(nextCap.slot, nextCap.timestamp_seconds, isPlaying);
    }
  }, [isBothReady, hasNextNote, captionsList, isPlaying, doSeek]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayBoth();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeekRelative(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeekRelative(5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleSeekPrevNote();
      } else if (e.code === 'ArrowDown') {
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
    if (id === 'settings' && showSettingsPopover) return null;
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

  const handleFetchSyncTime1 = () => {
    let t1 = 0;
    try {
      if (player1Ref.current && typeof player1Ref.current.getCurrentTime === 'function') {
        t1 = player1Ref.current.getCurrentTime() || 0;
      }
    } catch {}
    setSyncTimeStr1(formatSecondsToHHMMSS(Math.floor(t1)));
  };

  const handleFetchSyncTime2 = () => {
    let t2 = 0;
    try {
      if (player2Ref.current && typeof player2Ref.current.getCurrentTime === 'function') {
        t2 = player2Ref.current.getCurrentTime() || 0;
      }
    } catch {}
    setSyncTimeStr2(formatSecondsToHHMMSS(Math.floor(t2)));
  };

  const handleAutoCalculateSyncPoint = async () => {
    const sec1 = parseTimeToSeconds(syncTimeStr1);
    const sec2 = parseTimeToSeconds(syncTimeStr2);
    const newOffset = Math.round(sec1 - sec2);

    if (onOffsetChange) {
      onOffsetChange(2, newOffset);
    } else {
      // Fallback: save directly via API if no onOffsetChange callback provided
      try {
        const targetMatchId = effectiveMatchId || 'default_match';
        const fetchRes = await fetch(`/api/youtube-config?match_id=${targetMatchId}`);
        const fetchReqData = await fetchRes.json();
        let currentConfigs: YouTubeVideoConfig[] = fetchReqData.configs || [];

        if (!currentConfigs || currentConfigs.length === 0) {
          currentConfigs = [
            { slot: 1, match_id: targetMatchId, youtube_url: cfg1.youtube_url || '', youtube_id: extractYouTubeId(cfg1.youtube_url || ''), title: cfg1.title || 'Cam 1', start_offset_seconds: 0 },
            { slot: 2, match_id: targetMatchId, youtube_url: cfg2.youtube_url || '', youtube_id: extractYouTubeId(cfg2.youtube_url || ''), title: cfg2.title || 'Cam 2', start_offset_seconds: newOffset }
          ];
        } else {
          currentConfigs = currentConfigs.map(c => c.slot === 2 ? { ...c, start_offset_seconds: newOffset } : c);
        }

        const saveRes = await fetch('/api/youtube-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            match_id: targetMatchId,
            configs: currentConfigs
          })
        });

        const saveReqData = await saveRes.json();
        if (saveReqData.success) {
          toast.success(`Đã tự động lưu độ trễ Video 2 (${newOffset >= 0 ? '+' : ''}${newOffset}s) vào CSDL!`);
        }
      } catch (err) {
        console.error('Error saving offset via API:', err);
      }
    }
    setSyncPointModalOpen(false);
  };

  const fetchCurrentTimeForSlot = useCallback((slot: 1 | 2) => {
    let t = 0;
    try {
      const p = slot === 1 ? player1Ref.current : player2Ref.current;
      if (p && typeof p.getCurrentTime === 'function') {
        t = p.getCurrentTime() || 0;
      }
    } catch {}
    return formatSecondsToHHMMSS(Math.floor(t));
  }, []);

  const handleSlotSelectChange = (slot: 1 | 2) => {
    setNewCapSlot(slot);
    const newTimeStr = fetchCurrentTimeForSlot(slot);
    setNewCapTimeStr(newTimeStr);
  };

  // ── Add 2nike Modal Handlers ──
  const handleOpenAddCaptionModal = async () => {
    setNewCapUrl('');
    setUrlError(null);
    setCreatedShareLink(null);
    setIsCopied(false);

    // Auto-pause videos when opening 2nike modal
    if (isPlaying) {
      try {
        if (player1Ref.current && typeof player1Ref.current.pauseVideo === 'function') player1Ref.current.pauseVideo();
        if (player2Ref.current && typeof player2Ref.current.pauseVideo === 'function') player2Ref.current.pauseVideo();
      } catch {}
      setIsPlaying(false);
    }

    if (isAdmin) {
      setNewCapTimeStr(fetchCurrentTimeForSlot(newCapSlot));
      if (!newCapAuthor) setNewCapAuthor('Admin');
      setAddCaptionModalOpen(true);
      return;
    }

    let user = currentUser;
    if (!user) {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            user = data.user;
            setCurrentUser(data.user);
          }
        }
      } catch {}
    }

    if (!user) {
      toast.error('Vui lòng đăng nhập để sử dụng tính năng lưu 2nike!');
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 1000);
      return;
    }

    setNewCapTimeStr(fetchCurrentTimeForSlot(newCapSlot));
    setNewCapAuthor(user.username);
    setAddCaptionModalOpen(true);
  };

  const handleFetchCurrentTimeForModal = () => {
    setNewCapTimeStr(fetchCurrentTimeForSlot(newCapSlot));
  };

  const handleUrlInputChange = (urlStr: string) => {
    setNewCapUrl(urlStr);
    setUrlError(null);

    const trimmed = urlStr.trim();
    if (!trimmed) return;

    const extractedId = extractYouTubeId(trimmed);
    const vid1Id = extractYouTubeId(cfg1.youtube_id || '');
    const vid2Id = extractYouTubeId(cfg2.youtube_id || '');

    let matchedSlot: 1 | 2 | null = null;
    if (vid1Id && extractedId === vid1Id) {
      matchedSlot = 1;
    } else if (vid2Id && extractedId === vid2Id) {
      matchedSlot = 2;
    }

    if (!matchedSlot) {
      setUrlError('Link YouTube không thuộc Video 1 hoặc Video 2 của trận đấu này!');
      return;
    }

    setNewCapSlot(matchedSlot);

    const timestampSec = parseYouTubeTimestamp(trimmed);
    if (timestampSec !== null && timestampSec >= 0) {
      setNewCapTimeStr(formatSecondsToHHMMSS(timestampSec));
    } else {
      setNewCapTimeStr(fetchCurrentTimeForSlot(matchedSlot));
    }
  };

  const handleSaveCaptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin && !currentUser) {
      toast.error('Vui lòng đăng nhập để sử dụng tính năng lưu 2nike!');
      return;
    }

    if (newCapUrl.trim()) {
      const extractedId = extractYouTubeId(newCapUrl);
      const vid1Id = extractYouTubeId(cfg1.youtube_id || '');
      const vid2Id = extractYouTubeId(cfg2.youtube_id || '');
      if (extractedId !== vid1Id && extractedId !== vid2Id) {
        setUrlError('Link YouTube không thuộc Video 1 hoặc Video 2 của trận đấu này!');
        toast.error('Link YouTube không trùng với Video 1 hoặc Video 2 của trận đấu này!');
        return;
      }
    }

    if (!newCapText.trim()) {
      toast.error('Vui lòng nhập Title');
      return;
    }

    const sec = parseTimeToSeconds(newCapTimeStr);
    const authorToSave = !isAdmin
      ? (currentUser?.username || 'Thành viên')
      : (newCapAuthor.trim() || 'Admin');

    try {
      setSubmittingCap(true);
      const res = await fetch('/api/youtube-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: effectiveMatchId || 'default_match',
          slot: newCapSlot,
          youtube_id: newCapSlot === 2 ? (cfg2.youtube_id || '') : (cfg1.youtube_id || ''),
          timestamp_seconds: sec,
          timestamp_str: newCapTimeStr || formatSecondsToHHMMSS(sec),
          caption: newCapText.trim(),
          created_by: authorToSave
        })
      });
      const data = await res.json();
      if (res.ok && data.caption) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cham-het-fc-team.vercel.app';
        const shareUrl = `${origin}/match-video?match_id=${effectiveMatchId || 'default_match'}&slot=${newCapSlot}&time=${sec}&caption_id=${data.caption.id}`;
        
        setCreatedShareLink(shareUrl);
        setIsCopied(false);
        toast.success('Đã lưu 2nike mới! Bạn có thể sao chép link bên dưới.');
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
            background: '#fee2e2',
            color: '#dc2626',
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

        {/* Right Actions: Sync Toggle, Add 2nike Modal Button & Admin Auto calibration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {cfg1.youtube_id && cfg2.youtube_id && (
            <button
              type="button"
              onClick={() => {
                setIsSyncEnabled(prev => {
                  const next = !prev;
                  toast.success(next ? 'Đã BẬT chế độ đồng bộ 2 video' : 'Đã TẮT chế độ đồng bộ (xem độc lập)');
                  return next;
                });
              }}
              style={{
                background: isSyncEnabled ? '#ecfdf5' : '#fef2f2',
                color: isSyncEnabled ? '#047857' : '#dc2626',
                border: isSyncEnabled ? '1px solid #a7f3d0' : '1px solid #fecaca',
                borderRadius: '8px',
                padding: '8px 12px',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title={isSyncEnabled ? 'Bấm để tắt đồng bộ (cho phép tua tự do từng video)' : 'Bấm để bật đồng bộ 2 video'}
            >
              {isSyncEnabled ? <LinkIcon size={15} style={{ color: '#059669' }} /> : <Unlink size={15} style={{ color: '#dc2626' }} />}
              {isSyncEnabled ? 'Đang Đồng Bộ' : 'Tắt Đồng Bộ'}
            </button>
          )}

          {(cfg1.youtube_id || cfg2.youtube_id) && (
            <button
              type="button"
              onClick={handleOpenAddCaptionModal}
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
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
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
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
              <Sliders size={14} style={{ color: '#dc2626' }} />
              Căn Độ Trễ Auto
            </button>
          )}
        </div>
      </div>

      {/* Video Players Grid: Resizable Container */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%'
      }}>
        <div style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: (cfg1.youtube_id && cfg2.youtube_id) ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr',
          gap: '16px',
          width: (cfg1.youtube_id && cfg2.youtube_id) ? '100%' : 'min(780px, 100%)',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Video Slot 1 */}
          <div style={{
            background: '#0f172a',
            borderRadius: '12px',
            overflow: 'hidden',
            border: activeTargetSlot === 1 ? '2px solid #ef4444' : '1px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            position: 'relative'
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
              color: '#1e293b',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px'
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
              maxHeight: 'calc(100vh - 380px)',
              minHeight: '180px',
              background: '#000000'
            }}>
              {cfg1.youtube_id ? (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  transform: `scale(${zoomScale1})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                  overflow: 'hidden'
                }}>
                  <YouTube
                    videoId={extractYouTubeId(cfg1.youtube_id)}
                    opts={opts1}
                    onReady={onPlayerReady1}
                    onEnd={onPlayerEnd1}
                    onStateChange={onPlayerStateChange1}
                    style={{ width: '100%', height: '100%' }}
                  />
                  {/* Interactive Overlay for 360° Drag Panning & Zooming */}
                  <div
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      isDragging360Ref1.current = true;
                      lastMousePosRef1.current = { x: e.clientX, y: e.clientY };
                    }}
                    onMouseMove={(e) => {
                      if (!isDragging360Ref1.current || !lastMousePosRef1.current) return;
                      const deltaX = e.clientX - lastMousePosRef1.current.x;
                      const deltaY = e.clientY - lastMousePosRef1.current.y;
                      lastMousePosRef1.current = { x: e.clientX, y: e.clientY };
                      rotateCamera(1, -deltaX * 0.4, deltaY * 0.4);
                    }}
                    onMouseUp={() => {
                      isDragging360Ref1.current = false;
                      lastMousePosRef1.current = null;
                    }}
                    onMouseLeave={() => {
                      isDragging360Ref1.current = false;
                      lastMousePosRef1.current = null;
                    }}
                    onWheel={(e) => {
                      const step = e.deltaY > 0 ? -0.15 : 0.15;
                      changeZoom(1, zoomScale1 + step);
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      zIndex: 10,
                      background: 'transparent',
                      cursor: 'grab'
                    }}
                  >
                    {/* Badge indicating 360° drag & zoom control */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '12px',
                      padding: '3px 8px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      pointerEvents: 'none'
                    }}>
                      <span>🎥 360° Drag & Scroll Zoom</span>
                    </div>
                  </div>
                  {/* Subtitle / 2nike Caption Overlay on Video 1 */}
                  {showSubtitles && currentActiveCaption1 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(15, 23, 42, 0.88)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                      pointerEvents: 'none',
                      maxWidth: '90%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      <span style={{ color: '#ef4444' }}>📌</span>
                      <span>{currentActiveCaption1.caption}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '8px' }}>
                  <Video size={36} style={{ opacity: 0.5 }} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Chưa cấu hình URL Video Slot 1</span>
                </div>
              )}
            </div>

            {/* Dedicated PlayerTimeline Section Below Video Slot 1 */}
            {cfg1.youtube_id && (
              <PlayerTimeline
                slot={1}
                youtubeId={cfg1.youtube_id}
                currentTime={currentTime1}
                duration={duration1}
                captions={captionsList}
                onSeek={(targetTime) => doSeek(1, targetTime, isPlaying)}
              />
            )}
          </div>

          {/* Video Slot 2 */}
          {cfg2.youtube_id && (
            <div style={{
              background: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              border: activeTargetSlot === 2 ? '2px solid #ef4444' : '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              position: 'relative'
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
                color: '#1e293b',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
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
                maxHeight: 'calc(100vh - 380px)',
                minHeight: '180px',
                background: '#000000'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  transform: `scale(${zoomScale2})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                  overflow: 'hidden'
                }}>
                  <YouTube
                    videoId={extractYouTubeId(cfg2.youtube_id)}
                    opts={opts2}
                    onReady={onPlayerReady2}
                    onEnd={onPlayerEnd2}
                    onStateChange={onPlayerStateChange2}
                    style={{ width: '100%', height: '100%' }}
                  />
                  {/* Interactive Overlay for 360° Drag Panning & Zooming */}
                  <div
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      isDragging360Ref2.current = true;
                      lastMousePosRef2.current = { x: e.clientX, y: e.clientY };
                    }}
                    onMouseMove={(e) => {
                      if (!isDragging360Ref2.current || !lastMousePosRef2.current) return;
                      const deltaX = e.clientX - lastMousePosRef2.current.x;
                      const deltaY = e.clientY - lastMousePosRef2.current.y;
                      lastMousePosRef2.current = { x: e.clientX, y: e.clientY };
                      rotateCamera(2, -deltaX * 0.4, deltaY * 0.4);
                    }}
                    onMouseUp={() => {
                      isDragging360Ref2.current = false;
                      lastMousePosRef2.current = null;
                    }}
                    onMouseLeave={() => {
                      isDragging360Ref2.current = false;
                      lastMousePosRef2.current = null;
                    }}
                    onWheel={(e) => {
                      const step = e.deltaY > 0 ? -0.15 : 0.15;
                      changeZoom(2, zoomScale2 + step);
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      zIndex: 10,
                      background: 'transparent',
                      cursor: 'grab'
                    }}
                  >
                    {/* Badge indicating 360° drag & zoom control */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '12px',
                      padding: '3px 8px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      pointerEvents: 'none'
                    }}>
                      <span>🎥 360° Drag & Scroll Zoom</span>
                    </div>
                  </div>
                  {/* Subtitle / 2nike Caption Overlay on Video 2 */}
                  {showSubtitles && currentActiveCaption2 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(15, 23, 42, 0.88)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                      pointerEvents: 'none',
                      maxWidth: '90%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      <span style={{ color: '#ef4444' }}>📌</span>
                      <span>{currentActiveCaption2.caption}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dedicated PlayerTimeline Section Below Video Slot 2 */}
              {cfg2.youtube_id && (
                <PlayerTimeline
                  slot={2}
                  youtubeId={cfg2.youtube_id}
                  currentTime={currentTime2}
                  duration={duration2}
                  captions={captionsList}
                  onSeek={(targetTime) => doSeek(2, targetTime, isPlaying)}
                />
              )}
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
                onClick={(e) => { e.currentTarget.blur(); setActiveTooltip(null); handleSeekPrevNote(); }}
                onMouseEnter={() => setActiveTooltip('prevNote')}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={(e) => { e.currentTarget.blur(); setActiveTooltip(null); }}
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
                <SkipBack size={14} style={{ color: hasPrevNote ? '#dc2626' : '#94a3b8' }} />
                <span className="hidden sm:inline">2nike trước</span>
              </button>
            </div>

            {/* Button 2: -5s */}
            <div style={{ position: 'relative' }}>
              {renderTooltip('back5', 'Lùi 5s (Phím ←)')}
              <button
                type="button"
                onClick={(e) => { e.currentTarget.blur(); setActiveTooltip(null); handleSeekRelative(-5); }}
                onMouseEnter={() => setActiveTooltip('back5')}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={(e) => { e.currentTarget.blur(); setActiveTooltip(null); }}
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
                onClick={(e) => { e.currentTarget.blur(); setActiveTooltip(null); togglePlayBoth(); }}
                onMouseEnter={() => setActiveTooltip('play')}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={(e) => { e.currentTarget.blur(); setActiveTooltip(null); }}
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
                onClick={(e) => { e.currentTarget.blur(); setActiveTooltip(null); handleSeekRelative(5); }}
                onMouseEnter={() => setActiveTooltip('next5')}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={(e) => { e.currentTarget.blur(); setActiveTooltip(null); }}
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
                onClick={(e) => { e.currentTarget.blur(); setActiveTooltip(null); handleSeekNextNote(); }}
                onMouseEnter={() => setActiveTooltip('nextNote')}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={(e) => { e.currentTarget.blur(); setActiveTooltip(null); }}
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
                <SkipForward size={14} style={{ color: hasNextNote ? '#dc2626' : '#94a3b8' }} />
              </button>
            </div>

            {/* Button 6: Cài đặt / Settings Popup */}
            <div style={{ position: 'relative' }}>
              {renderTooltip('settings', 'Cài đặt (Âm thanh, Tốc độ, Độ phân giải)')}
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setActiveTooltip(null);
                  setShowSettingsPopover(prev => !prev);
                }}
                onMouseEnter={() => {
                  if (!showSettingsPopover) setActiveTooltip('settings');
                }}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={(e) => { e.currentTarget.blur(); setActiveTooltip(null); }}
                disabled={!isBothReady}
                title="Cài đặt"
                style={{
                  padding: '7px 10px',
                  borderRadius: '9999px',
                  border: showSettingsPopover ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  background: showSettingsPopover ? '#fef2f2' : '#ffffff',
                  color: showSettingsPopover ? '#dc2626' : '#334155',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: !isBothReady ? 'not-allowed' : 'pointer',
                  opacity: !isBothReady ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <Settings size={16} style={{ color: showSettingsPopover ? '#dc2626' : '#475569' }} />
              </button>

              {/* Settings Popover Panel */}
              {showSettingsPopover && (
                <div
                  ref={settingsPopoverRef}
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 12px)',
                    right: 0,
                    width: '280px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 60,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Settings size={15} style={{ color: '#dc2626' }} />
                      Cài đặt Video
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSettingsPopover(false)}
                      style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* 1. Âm thanh */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Volume2 size={14} style={{ color: '#dc2626' }} />
                      Âm thanh
                    </span>

                    {/* Video 1 Volume */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700 }}>
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
                          {isMuted1 ? <VolumeX size={14} style={{ color: '#ef4444' }} /> : <Volume2 size={14} style={{ color: '#dc2626' }} />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={isMuted1 ? 0 : vol1}
                          onChange={(e) => handleVol1Change(Number(e.target.value))}
                          style={{ flex: 1, accentColor: '#dc2626', cursor: 'pointer' }}
                        />
                      </div>
                    </div>

                    {/* Video 2 Volume */}
                    {cfg2.youtube_id && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700 }}>
                          <span style={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
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
                            {isMuted2 ? <VolumeX size={14} style={{ color: '#ef4444' }} /> : <Volume2 size={14} style={{ color: '#dc2626' }} />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={isMuted2 ? 0 : vol2}
                            onChange={(e) => handleVol2Change(Number(e.target.value))}
                            style={{ flex: 1, accentColor: '#dc2626', cursor: 'pointer' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Độ phân giải */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Monitor size={14} style={{ color: '#2563eb' }} />
                        Độ phân giải
                      </span>
                      {availableQualities.length > 0 && (
                        <span style={{ fontSize: '10px', color: '#059669', fontWeight: 700, background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                          Auto-detect ({availableQualities.length})
                        </span>
                      )}
                    </div>
                    <select
                      value={playbackQuality}
                      onChange={(e) => handleQualityChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {Array.from(new Set(['auto', ...(availableQualities.length > 0 ? availableQualities : ALL_QUALITY_OPTIONS)])).map((qKey) => (
                        <option key={qKey} value={qKey}>
                          {QUALITY_LABELS[qKey] || qKey}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Speed của video */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Gauge size={14} style={{ color: '#d97706' }} />
                        Tốc độ video
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                        {playbackSpeed === 1 ? 'Mặc định (1x)' : `${playbackSpeed}x`}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => handleSpeedChange(spd)}
                          style={{
                            padding: '6px 0',
                            borderRadius: '8px',
                            border: playbackSpeed === spd ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
                            background: playbackSpeed === spd ? '#fef2f2' : '#f8fafc',
                            color: playbackSpeed === spd ? '#dc2626' : '#334155',
                            fontSize: '11.5px',
                            fontWeight: playbackSpeed === spd ? 800 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {spd === 1 ? '1x' : `${spd}x`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Phụ đề (Subtitles) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MessageSquareText size={14} style={{ color: '#10b981' }} />
                        Phụ đề (Subtitles)
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleSubtitles}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          border: showSubtitles ? '1px solid #10b981' : '1px solid #cbd5e1',
                          background: showSubtitles ? '#ecfdf5' : '#f8fafc',
                          color: showSubtitles ? '#047857' : '#64748b',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: showSubtitles ? '#10b981' : '#94a3b8'
                        }} />
                        {showSubtitles ? 'Bật (ON)' : 'Tắt (OFF)'}
                      </button>
                    </div>
                  </div>

                  {/* 5. Góc nhìn Camera 360° & Zoom */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} style={{ color: '#0284c7' }} />
                        Góc nhìn 360° & Zoom Camera
                      </span>
                    </div>

                    {/* Camera Selector (Cam 1 / Cam 2 / Cả 2 Cam) */}
                    {cfg2.youtube_id && (
                      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setTarget360Slot(1)}
                          style={{
                            flex: 1, padding: '4px 0', borderRadius: '6px', border: 'none',
                            fontSize: '11px', fontWeight: target360Slot === 1 ? 800 : 600,
                            background: target360Slot === 1 ? '#ffffff' : 'transparent',
                            color: target360Slot === 1 ? '#0284c7' : '#64748b',
                            boxShadow: target360Slot === 1 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Cam 1
                        </button>
                        <button
                          type="button"
                          onClick={() => setTarget360Slot(2)}
                          style={{
                            flex: 1, padding: '4px 0', borderRadius: '6px', border: 'none',
                            fontSize: '11px', fontWeight: target360Slot === 2 ? 800 : 600,
                            background: target360Slot === 2 ? '#ffffff' : 'transparent',
                            color: target360Slot === 2 ? '#0284c7' : '#64748b',
                            boxShadow: target360Slot === 2 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Cam 2
                        </button>
                        <button
                          type="button"
                          onClick={() => setTarget360Slot(0)}
                          style={{
                            flex: 1, padding: '4px 0', borderRadius: '6px', border: 'none',
                            fontSize: '11px', fontWeight: target360Slot === 0 ? 800 : 600,
                            background: target360Slot === 0 ? '#ffffff' : 'transparent',
                            color: target360Slot === 0 ? '#0284c7' : '#64748b',
                            boxShadow: target360Slot === 0 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Cả 2 Cam
                        </button>
                      </div>
                    )}

                    {/* Direction Pad to rotate 360° camera */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                        Xoay Camera 360°
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 32px)', gridGap: '4px' }}>
                        <div />
                        <button
                          type="button"
                          onClick={() => rotateCamera(target360Slot, 0, 15)}
                          title="Xoay lên (Look Up)"
                          style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
                        >
                          ⬆️
                        </button>
                        <div />

                        <button
                          type="button"
                          onClick={() => rotateCamera(target360Slot, -20, 0)}
                          title="Xoay trái (Turn Left)"
                          style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
                        >
                          ⬅️
                        </button>
                        <button
                          type="button"
                          onClick={() => resetCamera(target360Slot)}
                          title="Trở về trung tâm (Reset View)"
                          style={{ padding: '6px', borderRadius: '6px', border: '1px solid #0284c7', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer', fontWeight: 800, fontSize: '11px' }}
                        >
                          🔄
                        </button>
                        <button
                          type="button"
                          onClick={() => rotateCamera(target360Slot, 20, 0)}
                          title="Xoay phải (Turn Right)"
                          style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
                        >
                          ➡️
                        </button>

                        <div />
                        <button
                          type="button"
                          onClick={() => rotateCamera(target360Slot, 0, -15)}
                          title="Xoay xuống (Look Down)"
                          style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
                        >
                          ⬇️
                        </button>
                        <div />
                      </div>
                    </div>

                    {/* Zoom In / Zoom Out Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700 }}>
                        <span style={{ color: '#475569' }}>Thu phóng (Zoom):</span>
                        <span style={{ color: '#0284c7', fontFamily: 'monospace' }}>
                          {Math.round((target360Slot === 2 ? zoomScale2 : zoomScale1) * 100)}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => changeZoom(target360Slot, (target360Slot === 2 ? zoomScale2 : zoomScale1) - 0.25)}
                          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                          title="Thu nhỏ (Zoom Out)"
                        >
                          ➖
                        </button>
                        <input
                          type="range"
                          min="1"
                          max="3"
                          step="0.05"
                          value={target360Slot === 2 ? zoomScale2 : zoomScale1}
                          onChange={(e) => changeZoom(target360Slot, parseFloat(e.target.value))}
                          style={{ flex: 1, accentColor: '#0284c7', cursor: 'pointer' }}
                        />
                        <button
                          type="button"
                          onClick={() => changeZoom(target360Slot, (target360Slot === 2 ? zoomScale2 : zoomScale1) + 0.25)}
                          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                          title="Phóng to (Zoom In)"
                        >
                          ➕
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Arrow pointing down to button */}
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '12px',
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid #ffffff'
                  }} />
                </div>
              )}
            </div>

            {/* Button 7: Đồng bộ 2 Cam (Icon Only) */}
            {cfg1.youtube_id && cfg2.youtube_id && (
              <div style={{ position: 'relative' }}>
                {renderTooltip('manualSync', 'Tua và đồng bộ thời gian 2 Cam theo chuẩn độ trễ')}
                <button
                  type="button"
                  onClick={(e) => { e.currentTarget.blur(); setActiveTooltip(null); handleManualSync(); }}
                  onMouseEnter={() => setActiveTooltip('manualSync')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  onFocus={(e) => { e.currentTarget.blur(); setActiveTooltip(null); }}
                  disabled={!isBothReady}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #fca5a5',
                    background: '#fef2f2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: !isBothReady ? 'not-allowed' : 'pointer',
                    opacity: !isBothReady ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(220, 38, 38, 0.1)'
                  }}
                >
                  <RefreshCw size={14} style={{ color: '#dc2626' }} />
                </button>
              </div>
            )}
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
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 10px 0', color: '#0f172a' }}>
              Tool Căn Độ Trễ Tự Động (Auto Offset Calibration)
            </h3>
            <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Nhập thủ công hoặc bấm nút 🎯 để lấy mốc thời gian tại cùng một tình huống (phạt góc, bàn thắng...) trên cả 2 video.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {/* Video 1 Time Input */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                    Video 1 (Mốc):
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchSyncTime1}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 800, cursor: 'pointer', padding: 0 }}
                  >
                    🎯 Lấy giờ Video 1
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="00:00:00"
                    value={syncTimeStr1}
                    onChange={(e) => setSyncTimeStr1(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      borderRadius: '10px',
                      padding: '10px 12px 10px 34px',
                      fontSize: '13.5px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Clock size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
                </div>
              </div>

              {/* Video 2 Time Input */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                    Video 2 (Tình huống tương ứng):
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchSyncTime2}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 800, cursor: 'pointer', padding: 0 }}
                  >
                    🎯 Lấy giờ Video 2
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="00:00:00"
                    value={syncTimeStr2}
                    onChange={(e) => setSyncTimeStr2(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      borderRadius: '10px',
                      padding: '10px 12px 10px 34px',
                      fontSize: '13.5px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Clock size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
                </div>
              </div>

              {/* Calculated Offset Preview Badge */}
              {(() => {
                const s1 = parseTimeToSeconds(syncTimeStr1);
                const s2 = parseTimeToSeconds(syncTimeStr2);
                const diff = Math.round(s1 - s2);
                return (
                  <div style={{
                    background: 'rgba(220, 38, 38, 0.06)',
                    border: '1px solid rgba(220, 38, 38, 0.2)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}>
                    <span>Độ trễ tính toán được:</span>
                    <span style={{ color: '#dc2626', fontSize: '15px', fontWeight: 800 }}>
                      {diff >= 0 ? `+${diff}` : diff}s
                    </span>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSyncPointModalOpen(false)}
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
                type="button"
                onClick={handleAutoCalculateSyncPoint}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
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
                <Sparkles size={18} style={{ color: '#dc2626' }} />
                {createdShareLink ? 'Link Chia Sẻ 2nike' : 'Thêm 2nike Mới (Realtime)'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setAddCaptionModalOpen(false);
                  setCreatedShareLink(null);
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', fontWeight: 700, cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {createdShareLink ? (
              /* Share Link Box after successful 2nike creation */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                  border: '1px solid #10b981',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <CheckCircle2 size={24} style={{ color: '#10b981', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#065f46' }}>
                      Đã tạo 2nike thành công! 🎉
                    </div>
                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                      Bạn có thể copy đường dẫn dưới đây để chia sẻ nhanh cho đồng đội.
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Đường dẫn chia sẻ trực tiếp (Deep Link)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="text"
                        readOnly
                        value={createdShareLink}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        style={{
                          width: '100%',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          borderRadius: '10px',
                          padding: '10px 12px 10px 34px',
                          fontSize: '12.5px',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <LinkIcon size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#64748b' }} />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (createdShareLink) {
                          navigator.clipboard.writeText(createdShareLink);
                          setIsCopied(true);
                          toast.success('📋 Đã sao chép link 2nike vào bộ nhớ tạm!');
                          setTimeout(() => setIsCopied(false), 2500);
                        }
                      }}
                      style={{
                        background: isCopied ? '#10b981' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isCopied ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(220, 38, 38, 0.3)',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}
                    >
                      {isCopied ? <Check size={16} /> : <Copy size={16} />}
                      {isCopied ? 'Đã copy!' : 'Sao chép Link'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedShareLink(null);
                      setNewCapText('');
                      setNewCapUrl('');
                      setUrlError(null);
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#334155',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    + Tạo thêm 2nike khác
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddCaptionModalOpen(false);
                      setCreatedShareLink(null);
                      setNewCapText('');
                      setNewCapUrl('');
                      setUrlError(null);
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#0f172a',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Hoàn tất
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveCaptionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Link YouTube Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Tạo từ Link YouTube <span style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8' }}>(Có ?t=... để tự chọn video &amp; thời gian)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="https://youtu.be/LiUsPl_UVdw?t=983"
                      value={newCapUrl}
                      onChange={(e) => handleUrlInputChange(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#f8fafc',
                        border: urlError ? '1px solid #ef4444' : '1px solid #cbd5e1',
                        color: '#0f172a',
                        borderRadius: '10px',
                        padding: '10px 12px 10px 34px',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <LinkIcon size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
                  </div>
                  {urlError ? (
                    <div style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={13} /> {urlError}
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                      Tự nhận diện góc video (1/2) và thời gian t=... từ đường dẫn YouTube.
                    </div>
                  )}
                </div>

                {/* Target Video Slot */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Góc Video
                  </label>
                  <select
                    value={newCapSlot}
                    onChange={(e) => handleSlotSelectChange(Number(e.target.value) as 1 | 2)}
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
                      style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 800, cursor: 'pointer', padding: 0 }}
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
                    Người tạo {!isAdmin && <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>(Cố định theo tài khoản)</span>}
                  </label>
                  <input
                    type="text"
                    placeholder={isAdmin ? 'Admin' : (currentUser?.username || 'Tên người dùng')}
                    value={isAdmin ? newCapAuthor : (currentUser?.username || '')}
                    onChange={(e) => setNewCapAuthor(e.target.value)}
                    disabled={!isAdmin}
                    style={{
                      width: '100%',
                      background: !isAdmin ? '#f1f5f9' : '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: !isAdmin ? '#475569' : '#0f172a',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '13px',
                      fontWeight: !isAdmin ? 700 : 400,
                      cursor: !isAdmin ? 'not-allowed' : 'text',
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
                      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: submittingCap ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
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
            )}
          </div>
        </div>
      )}
    </div>
  );
});

YouTubeSyncPlayer.displayName = 'YouTubeSyncPlayer';
