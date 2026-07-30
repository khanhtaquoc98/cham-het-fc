'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Film, Play, Trophy, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export interface MatchCardInfo {
  id: string;
  title: string;
  subtitle?: string;
  matchDate?: string;
  matchTime?: string;
  venue?: string;
  homeScore?: number;
  awayScore?: number;
  extraScore?: number | null;
  result?: string;
  teams?: { name: string; players: { name: string; telegramHandle?: string }[] }[];
  isLive?: boolean;
}

interface RawMatchRecord {
  id: string;
  matchDate?: string;
  matchTime?: string;
  venue?: string;
  homeScore?: number;
  awayScore?: number;
  extraScore?: number;
  result?: string;
  teams?: { name: string; players: { name: string; telegramHandle?: string }[] }[];
}

interface Props {
  currentMatchId: string;
  onSelectMatch: (matchId: string, matchInfo?: MatchCardInfo) => void;
}

const ThumbnailImage = ({ src, alt, ytId }: { src: string; alt?: string; ytId: string }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0f172a', overflow: 'hidden' }}>
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)',
            backgroundSize: '200% 100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <Loader2 size={18} className="animate-spin" style={{ color: 'rgba(255,255,255,0.7)' }} />
        </div>
      )}
      <img
        src={src}
        alt={alt || ''}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setLoaded(true);
          const img = e.currentTarget as HTMLImageElement;
          if (img && !img.dataset.failed) {
            img.dataset.failed = 'true';
            img.src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );
};

export const RecentMatchesSection: React.FC<Props> = ({ currentMatchId, onSelectMatch }) => {
  const [recentMatches, setRecentMatches] = useState<MatchCardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [ytConfigMap, setYtConfigMap] = useState<Record<string, string>>({});

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -270, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 270, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeftPos(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftPos - walk;
  };

  // Helper to fetch YouTube thumbnail configs
  const fetchConfigsForMatches = async (matchList: MatchCardInfo[]) => {
    const newMap: Record<string, string> = {};

    await Promise.all(
      matchList.map(async (m) => {
        if (m.id === 'default_match') return;
        try {
          const res = await fetch(`/api/youtube-config?match_id=${m.id}`);
          const data = await res.json();
          if (data.configs && data.configs.length > 0) {
            const firstWithId = data.configs.find((c: { youtube_id?: string }) => c.youtube_id && c.youtube_id.trim());
            if (firstWithId) {
              newMap[m.id] = firstWithId.youtube_id;
            }
          }
        } catch {
          // ignore
        }
      })
    );

    setYtConfigMap((prev) => ({ ...prev, ...newMap }));
  };

  const fetchRecent = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/history?page=1&pageSize=8');
      const data = await res.json();

      const fetchedList: MatchCardInfo[] = (data.matches || []).map((m: RawMatchRecord, idx: number) => {
        const titleStr = m.matchDate ? `Trận ${m.matchDate}` : `Trận đấu #${idx + 1}`;
        const subtitleStr = [m.matchTime, m.venue || 'Sân bóng FC'].filter(Boolean).join(' • ');

        return {
          id: m.id,
          title: titleStr,
          subtitle: subtitleStr,
          matchDate: m.matchDate,
          matchTime: m.matchTime,
          venue: m.venue,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          extraScore: m.extraScore,
          result: m.result,
          teams: m.teams || []
        };
      });

      const defaultMatchCard: MatchCardInfo = {
        id: 'default_match',
        title: 'Trận Trực Tiếp / Mới Nhất',
        subtitle: 'Góc quay 2 Cam đồng bộ Realtime',
        isLive: true
      };

      const fullList = [defaultMatchCard, ...fetchedList];
      const filtered = fullList.filter(m => m.id !== currentMatchId).slice(0, 7);

      setRecentMatches(filtered);
      fetchConfigsForMatches(filtered);
    } catch (err) {
      console.error('Error fetching recent matches:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMatchId]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const getWinnerInfo = (item: MatchCardInfo) => {
    if (item.isLive) {
      return { text: 'Đang diễn ra', color: '#047857', bg: '#d1fae5', isLive: true };
    }

    if (item.result === 'home_win') {
      return { text: 'Home thắng', color: '#047857', bg: '#d1fae5', isTrophy: true };
    } else if (item.result === 'away_win') {
      return { text: 'Away thắng', color: '#1d4ed8', bg: '#dbeafe', isTrophy: true };
    } else if (item.result === 'extra_win') {
      return { text: 'Extra thắng', color: '#c2410c', bg: '#ffedd5', isTrophy: true };
    } else if (item.result === 'draw') {
      return { text: 'Hòa', color: '#475569', bg: '#f1f5f9' };
    }

    if (item.homeScore !== undefined && item.awayScore !== undefined) {
      if (item.homeScore > item.awayScore) {
        return { text: 'Home thắng', color: '#047857', bg: '#d1fae5', isTrophy: true };
      } else if (item.awayScore > item.homeScore) {
        return { text: 'Away thắng', color: '#1d4ed8', bg: '#dbeafe', isTrophy: true };
      } else {
        return { text: 'Hòa', color: '#475569', bg: '#f1f5f9' };
      }
    }

    return null;
  };

  const handleCardClick = (item: MatchCardInfo) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    onSelectMatch(item.id, item);
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '18px 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      color: '#0f172a',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <style>{`
        .recent-matches-carousel {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          padding-bottom: 4px;
          cursor: grab;
          user-select: none;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .recent-matches-carousel:active {
          cursor: grabbing;
        }
        .recent-matches-carousel::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        .recent-match-card-carousel {
          flex: 0 0 250px;
          width: 250px;
          scroll-snap-align: start;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
          overflow: hidden;
        }
        .recent-match-card-carousel:hover {
          border-color: #ef4444;
          box-shadow: 0 6px 18px rgba(239, 68, 68, 0.15);
          transform: translateY(-2px);
        }
        .recent-match-thumbnail {
          width: 100%;
          height: 120px;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .recent-match-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .recent-match-card-carousel:hover .recent-match-thumbnail img {
          transform: scale(1.05);
        }
        .recent-match-thumbnail.empty-thumbnail {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '14px',
        paddingBottom: '12px',
        borderBottom: '1px solid #f1f5f9'
      }}>
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
            <Film size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Các Trận Đấu Gần Nhất
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Bấm chọn để chuyển sang xem video highlight trận đấu khác
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '11.5px',
            fontWeight: 700,
            background: '#f1f5f9',
            color: '#475569',
            padding: '4px 12px',
            borderRadius: '9999px'
          }}>
            {recentMatches.length} Trận gần đây
          </span>

          {/* Carousel Left / Right Scroll Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={scrollLeft}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Cuộn sang trái"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={scrollRight}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Cuộn sang phải"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel List of Recent Matches */}
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: '#dc2626' }} />
          Đang tải trận đấu gần nhất...
        </div>
      ) : recentMatches.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
          Không có trận đấu gần nhất nào khác.
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className="recent-matches-carousel"
        >
          {recentMatches.map((item) => {
            const winnerInfo = getWinnerInfo(item);
            const ytId = ytConfigMap[item.id];

            return (
              <div
                key={item.id}
                onClick={() => handleCardClick(item)}
                className="recent-match-card-carousel"
              >
                {/* Thumbnail */}
                {ytId ? (
                  <div className="recent-match-thumbnail" style={{ position: 'relative' }}>
                    <ThumbnailImage
                      src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                      alt={item.title}
                      ytId={ytId}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(15, 23, 42, 0.6) 0%, transparent 60%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.25)'
                      }}>
                        <Play size={14} style={{ fill: '#dc2626', color: '#dc2626', marginLeft: '2px' }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="recent-match-thumbnail empty-thumbnail">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                      <Film size={22} style={{ color: '#cbd5e1' }} />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Chưa có Video</span>
                    </div>
                  </div>
                )}

                {/* Badge if Live */}
                {item.isLive && (
                  <div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ffffff' }} />
                      LIVE
                    </span>
                  </div>
                )}

                {/* Title & Subtitle */}
                <div>
                  <h4 style={{
                    fontSize: '13.5px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: 0,
                    lineHeight: '1.3'
                  }}>
                    {item.title}
                  </h4>
                  {item.subtitle && (
                    <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                      {item.subtitle}
                    </p>
                  )}
                </div>

                {/* Winner Result Badge */}
                {winnerInfo && (
                  <div style={{
                    background: winnerInfo.bg,
                    color: winnerInfo.color,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    marginTop: 'auto'
                  }}>
                    {winnerInfo.isTrophy && <Trophy size={12} style={{ color: winnerInfo.color }} />}
                    {winnerInfo.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
