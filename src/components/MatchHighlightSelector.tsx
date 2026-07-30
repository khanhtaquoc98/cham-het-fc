'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Trophy, Users, ChevronRight, Search, Play, Loader2, Film } from 'lucide-react';

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
  youtubeId?: string;
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
          <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(255,255,255,0.7)' }} />
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
  selectedMatchId: string;
  onSelectMatch: (matchId: string, matchInfo?: MatchCardInfo) => void;
  isAdmin?: boolean;
}

export const MatchHighlightSelector: React.FC<Props> = ({
  selectedMatchId,
  onSelectMatch,
  isAdmin = false
}) => {
  const [matches, setMatches] = useState<MatchCardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalMatches, setTotalMatches] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [ytConfigMap, setYtConfigMap] = useState<Record<string, string>>({});

  const observerTarget = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 12;

  // ── Helper to fetch YouTube configs for a list of matches ──
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

  // ── Load Initial Page 1 ──
  const fetchPage = useCallback(async (pageNum: number, isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(`/api/history?page=${pageNum}&pageSize=${PAGE_SIZE}`);
      const data = await res.json();

      const fetchedList: MatchCardInfo[] = (data.matches || []).map((m: RawMatchRecord, idx: number) => {
        const titleStr = m.matchDate ? `Trận ${m.matchDate}` : `Trận đấu #${(pageNum - 1) * PAGE_SIZE + idx + 1}`;
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

      // Asynchronously load youtube thumbnails for fetched matches
      fetchConfigsForMatches(fetchedList);

      if (isInitial) {
        const defaultMatchCard: MatchCardInfo = {
          id: 'default_match',
          title: 'Trận Trực Tiếp / Mới Nhất',
          subtitle: 'Góc quay 2 Cam đồng bộ Realtime',
          isLive: true
        };
        setMatches([defaultMatchCard, ...fetchedList]);
      } else {
        setMatches((prev) => {
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNew = fetchedList.filter(item => !existingIds.has(item.id));
          return [...prev, ...uniqueNew];
        });
      }

      setTotalMatches(data.total || fetchedList.length);
      setHasMore(pageNum < (data.totalPages || 1));
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching match history:', err);
      if (isInitial) {
        setMatches([
          {
            id: 'default_match',
            title: 'Trận Trực Tiếp / Mới Nhất',
            subtitle: 'Góc quay 2 Cam đồng bộ Realtime',
            isLive: true
          }
        ]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  // ── Infinite Scroll Listener (Intersection Observer) ──
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && !searchTerm.trim()) {
          fetchPage(page + 1, false);
        }
      },
      { threshold: 0.2, rootMargin: '200px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchPage, searchTerm]);

  const getWinnerInfo = (item: MatchCardInfo) => {
    if (item.isLive) {
      return { text: 'Trận đấu đang diễn ra', color: '#047857', bg: '#d1fae5', isLive: true };
    }

    const homeName = 'Home';
    const awayName = 'Away';
    const extraName = 'Extra';

    if (item.result === 'home_win') {
      return {
        text: `${homeName} thắng`,
        color: '#047857',
        bg: '#d1fae5',
        isTrophy: true
      };
    } else if (item.result === 'away_win') {
      return {
        text: `${awayName} thắng`,
        color: '#1d4ed8',
        bg: '#dbeafe',
        isTrophy: true
      };
    } else if (item.result === 'extra_win') {
      return {
        text: `${extraName} thắng`,
        color: '#c2410c',
        bg: '#ffedd5',
        isTrophy: true
      };
    } else if (item.result === 'draw') {
      return {
        text: 'Hòa',
        color: '#475569',
        bg: '#f1f5f9',
        isDraw: true
      };
    }

    if (item.homeScore !== undefined && item.awayScore !== undefined) {
      if (item.homeScore > item.awayScore) {
        return { text: `${homeName} thắng`, color: '#047857', bg: '#d1fae5', isTrophy: true };
      } else if (item.awayScore > item.homeScore) {
        return { text: `${awayName} thắng`, color: '#1d4ed8', bg: '#dbeafe', isTrophy: true };
      } else {
        return { text: 'Hòa', color: '#475569', bg: '#f1f5f9', isDraw: true };
      }
    }

    return null;
  };

  const filteredMatches = matches.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const titleMatch = item.title.toLowerCase().includes(term);
    const subtitleMatch = item.subtitle?.toLowerCase().includes(term);
    const dateMatch = item.matchDate?.toLowerCase().includes(term);
    const timeMatch = item.matchTime?.toLowerCase().includes(term);
    const playerMatch = item.teams?.some(t =>
      t.players?.some(p => p.name.toLowerCase().includes(term))
    );

    return titleMatch || subtitleMatch || dateMatch || timeMatch || playerMatch;
  });

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '20px',
      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <style>{`
        .match-card-item {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
          overflow: hidden;
        }
        .match-card-item:hover {
          border-color: #ef4444;
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.16);
          transform: translateY(-2px);
        }
        .match-card-thumbnail {
          width: 100%;
          height: 140px;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .match-card-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .match-card-item:hover .match-card-thumbnail img {
          transform: scale(1.05);
        }
        .match-card-thumbnail.empty-thumbnail {
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
        marginBottom: '16px',
        paddingBottom: '14px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '10px',
            borderRadius: '12px',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Trophy size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {isAdmin ? 'Chọn Trận Đấu Để Cấu Hình' : 'Danh Sách Highlight Trận Đấu'}
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
              Chọn một trận đấu bên dưới để xem highlight và mốc video
            </p>
          </div>
        </div>

        <span style={{
          fontSize: '12px',
          fontWeight: 800,
          background: '#f1f5f9',
          color: '#475569',
          padding: '6px 14px',
          borderRadius: '9999px'
        }}>
          Đang hiển thị {filteredMatches.length} / {totalMatches + 1} Trận đấu
        </span>
      </div>

      {/* Search Input Bar */}
      <div style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Tìm theo ngày, sân hoặc tên cầu thủ (vd: 23/07, Tu, Sân 8...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#0f172a',
            borderRadius: '12px',
            padding: '10px 14px 10px 38px',
            fontSize: '13px',
            fontWeight: 600,
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '9px',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Grid of Match Cards */}
      {loading ? (
        <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: '#dc2626' }} />
          Đang tải danh sách trận đấu...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#64748b',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1'
        }}>
          <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0', color: '#334155' }}>
            Không tìm thấy trận đấu nào phù hợp với từ khóa &quot;{searchTerm}&quot;
          </p>
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '6px'
            }}
          >
            Xóa tìm kiếm
          </button>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px'
          }}>
            {filteredMatches.map((item) => {
              const winnerInfo = getWinnerInfo(item);
              const ytId = ytConfigMap[item.id];

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectMatch(item.id, item)}
                  className="match-card-item"
                >
                  {/* YouTube Thumbnail Header or Default Empty Thumbnail Placeholder */}
                  {ytId ? (
                    <div className="match-card-thumbnail" style={{ position: 'relative' }}>
                      <ThumbnailImage
                        src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                        alt={item.title}
                        ytId={ytId}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(15, 23, 42, 0.7) 0%, transparent 60%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.85)',
                          backdropFilter: 'blur(4px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}>
                          <Play size={16} style={{ fill: '#dc2626', color: '#dc2626', marginLeft: '2px' }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="match-card-thumbnail empty-thumbnail">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                        <Film size={26} style={{ color: '#cbd5e1' }} />
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#94a3b8' }}>Chưa có Video</span>
                      </div>
                    </div>
                  )}

                  {/* Top Live Badge (if live match) */}
                  {item.isLive && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        color: '#ffffff',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
                        LIVE / MỚI NHẤT
                      </span>
                    </div>
                  )}

                  {/* Match Title & Subtitle */}
                  <div>
                    <h4 style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: 0,
                      lineHeight: '1.3'
                    }}>
                      {item.title}
                    </h4>
                    {item.subtitle && (
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Winner Result Badge */}
                  {winnerInfo && (
                    <div style={{
                      background: winnerInfo.bg,
                      border: 'none',
                      color: winnerInfo.color,
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}>
                      {winnerInfo.isTrophy && <Trophy size={13} style={{ color: winnerInfo.color }} />}
                      {winnerInfo.text}
                    </div>
                  )}

                  {/* Team Lineup / Đội Hình */}
                  {item.teams && item.teams.length > 0 && (
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginTop: '2px'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} style={{ color: '#dc2626' }} />
                        Đội hình tham gia:
                      </div>
                      {item.teams.map((t, idx) => {
                        const isHome = t.name.toUpperCase().includes('HOME');
                        const isAway = t.name.toUpperCase().includes('AWAY');
                        const teamColor = isHome ? '#047857' : isAway ? '#1d4ed8' : '#c2410c';
                        const playerNames = t.players?.map(p => p.name).join(', ') || 'Chưa cập nhật';
                        return (
                          <div key={idx} style={{ fontSize: '11.5px', color: '#334155', lineHeight: '1.35' }}>
                            <strong style={{ color: teamColor }}>{t.name}:</strong> {playerNames}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Sentinel Observer Target for Infinite Scroll */}
          <div ref={observerTarget} style={{ height: '40px', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loadingMore && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '13px', fontWeight: 700 }}>
                <Loader2 size={18} className="animate-spin" />
                Đang tải thêm danh sách trận đấu...
              </div>
            )}
            {!hasMore && matches.length > 1 && !searchTerm && (
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                ✓ Đã hiển thị tất cả trận đấu trong lịch sử
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};
