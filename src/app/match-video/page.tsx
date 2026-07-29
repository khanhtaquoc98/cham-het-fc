'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { YouTubeSyncPlayer, YouTubeSyncPlayerRef } from '@/components/YouTubeSyncPlayer';
import { YouTubeCaptionSection } from '@/components/YouTubeCaptionSection';
import { MatchHighlightSelector } from '@/components/MatchHighlightSelector';
import { YouTubeVideoConfig } from '@/types/youtube';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Film } from 'lucide-react';

interface HistoryMatchItem {
  id: string;
  matchDate?: string;
  matchTime?: string;
  isLive?: boolean;
  title?: string;
}

function MatchVideoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qMatchId = searchParams.get('match_id');

  const [selectedMatchId, setSelectedMatchId] = useState<string>(qMatchId || '');
  const [selectedMatchLabel, setSelectedMatchLabel] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(qMatchId ? 'detail' : 'list');

  useEffect(() => {
    if (qMatchId) {
      setSelectedMatchId(qMatchId);
      setViewMode('detail');
      // Fetch history match info to display human-readable date/time label
      fetch('/api/history?pageSize=50')
        .then(r => r.json())
        .then(data => {
          const matchItem = (data.matches || []).find((m: HistoryMatchItem) => m.id === qMatchId);
          if (matchItem) {
            const label = matchItem.matchDate ? `Trận ${matchItem.matchDate}${matchItem.matchTime ? ' • ' + matchItem.matchTime : ''}` : '';
            setSelectedMatchLabel(label);
          }
        })
        .catch(() => {});
    }
  }, [qMatchId]);

  const handleSelectMatch = (mId: string, info?: HistoryMatchItem) => {
    setSelectedMatchId(mId);
    if (info) {
      const label = info.isLive ? 'Trực Tiếp / Mới Nhất' : `${info.title || ''}${info.matchTime ? ' • ' + info.matchTime : ''}`;
      setSelectedMatchLabel(label);
    }
    setViewMode('detail');
    router.push(`/match-video?match_id=${mId}`);
  };

  const handleBackToList = () => {
    setViewMode('list');
    router.push('/match-video');
  };

  // Deep linking params from shared link
  const targetSlotParam = searchParams.get('slot') || searchParams.get('v');
  const targetTimeParam = searchParams.get('time') || searchParams.get('t');
  const targetCaptionId = searchParams.get('caption_id') || searchParams.get('c');

  const [configs, setConfigs] = useState<YouTubeVideoConfig[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const playerRef = useRef<YouTubeSyncPlayerRef>(null);

  // ── Load Configs from API when in detail mode ──
  useEffect(() => {
    if (viewMode !== 'detail' || !selectedMatchId) return;

    async function loadConfigs() {
      try {
        setLoadingConfig(true);
        const res = await fetch(`/api/youtube-config?match_id=${selectedMatchId}`);
        const data = await res.json();
        if (data.configs) {
          setConfigs(data.configs);
        } else {
          setConfigs([]);
        }
      } catch (err) {
        console.error('Error loading YouTube config:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfigs();
  }, [selectedMatchId, viewMode]);

  // ── Deep Link Auto Seek & Highlight ──
  useEffect(() => {
    if (viewMode !== 'detail' || !targetSlotParam || !targetTimeParam || loadingConfig) return;

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
  }, [targetSlotParam, targetTimeParam, loadingConfig, viewMode]);

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

  return (
    <div style={{ background: '#f8fafc', color: '#0f172a', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <main className="w-full max-w-full p-2 sm:p-4 md:p-6 flex flex-col gap-4 flex-1 box-border">
        {viewMode === 'list' ? (
          /* View Mode 1: Match Cards List Only */
          <MatchHighlightSelector
            selectedMatchId={selectedMatchId}
            onSelectMatch={handleSelectMatch}
            isAdmin={false}
          />
        ) : (
          /* View Mode 2: Match Detail Video Highlight */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Navigation Bar with Back Button */}
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
                <Film size={18} />
                <span>Xem Highlight: {selectedMatchLabel || (selectedMatchId === 'default_match' ? 'Trận Trực Tiếp / Mới Nhất' : 'Trận đấu')}</span>
              </div>
            </div>

            {/* Loading Spinner or Dual YouTube Sync Player */}
            {loadingConfig ? (
              <div style={{
                padding: '50px 20px',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                color: '#475569'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #e2e8f0',
                  borderTopColor: '#6366f1',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>
                  Đang tải dữ liệu video highlight...
                </span>
              </div>
            ) : (
              <>
                {/* Dual YouTube Sync Player Component */}
                <YouTubeSyncPlayer
                  ref={playerRef}
                  configs={configs}
                  matchId={selectedMatchId}
                  isAdmin={false}
                  activeTargetSlot={targetSlotParam ? Number(targetSlotParam) : undefined}
                  highlightCaptionTime={targetTimeParam ? Number(targetTimeParam) : null}
                />

                {/* Realtime Caption Section */}
                <YouTubeCaptionSection
                  matchId={selectedMatchId}
                  configs={configs}
                  isAdmin={false}
                  onSeek={handleSeekFromCaption}
                  getCurrentVideoTime={handleGetCurrentVideoTime}
                  targetCaptionId={targetCaptionId}
                />
              </>
            )}
          </div>
        )}
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
      </div>
    }>
      <MatchVideoContent />
    </Suspense>
  );
}
