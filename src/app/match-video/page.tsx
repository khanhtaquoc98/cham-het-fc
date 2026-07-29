'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { YouTubeSyncPlayer, YouTubeSyncPlayerRef } from '@/components/YouTubeSyncPlayer';
import { YouTubeCaptionSection } from '@/components/YouTubeCaptionSection';
import { YouTubeVideoConfig } from '@/types/youtube';
import { toast } from 'react-hot-toast';

function MatchVideoContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get('match_id') || 'default_match';

  // Deep linking params from shared link
  const targetSlotParam = searchParams.get('slot') || searchParams.get('v');
  const targetTimeParam = searchParams.get('time') || searchParams.get('t');
  const targetCaptionId = searchParams.get('caption_id') || searchParams.get('c');

  const [configs, setConfigs] = useState<YouTubeVideoConfig[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const playerRef = useRef<YouTubeSyncPlayerRef>(null);

  // ── Load Configs from API ──
  useEffect(() => {
    async function loadConfigs() {
      try {
        setLoadingConfig(true);
        const res = await fetch(`/api/youtube-config?match_id=${matchId}`);
        const data = await res.json();
        if (data.configs) {
          setConfigs(data.configs);
        }
      } catch (err) {
        console.error('Error loading YouTube config:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfigs();
  }, [matchId]);

  // ── Deep Link Auto Seek & Highlight ──
  useEffect(() => {
    if (!targetSlotParam || !targetTimeParam || loadingConfig) return;

    const slot = Number(targetSlotParam) as 1 | 2;
    const timeSec = Number(targetTimeParam);

    if (slot && !isNaN(timeSec)) {
      const timer = setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.seekTo(slot, timeSec, true);
          toast.success(`Đã tự động nhảy tới mốc ${timeSec}s trên Video ${slot}`, { icon: '🍿' });
        }
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [targetSlotParam, targetTimeParam, loadingConfig]);

  // Handle Seek from Caption Click
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

  if (loadingConfig) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: '#475569'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          border: '4px solid #e2e8f0',
          borderTopColor: '#e53935',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569', letterSpacing: '0.3px' }}>
          Đang tải dữ liệu video trận đấu...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8fafc', color: '#0f172a', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <main style={{ width: '100%', maxWidth: '100%', margin: '0', padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, boxSizing: 'border-box' }}>
        {/* Dual YouTube Sync Player Component (Full Width 50%/50%) */}
        <YouTubeSyncPlayer
          ref={playerRef}
          configs={configs}
          isAdmin={false}
          activeTargetSlot={targetSlotParam ? Number(targetSlotParam) : undefined}
          highlightCaptionTime={targetTimeParam ? Number(targetTimeParam) : null}
        />

        {/* Realtime Caption Section */}
        <YouTubeCaptionSection
          matchId={matchId}
          configs={configs}
          isAdmin={false}
          onSeek={handleSeekFromCaption}
          getCurrentVideoTime={handleGetCurrentVideoTime}
          targetCaptionId={targetCaptionId}
        />
      </main>
    </div>
  );
}

export default function MatchVideoPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: '#475569'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          border: '4px solid #e2e8f0',
          borderTopColor: '#e53935',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>
          Đang tải giao diện video...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <MatchVideoContent />
    </Suspense>
  );
}
