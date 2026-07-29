'use client';

import React, { useEffect, useState } from 'react';
import { CalendarDays, Trophy, Users, ChevronRight, Search } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadMatches() {
      try {
        setLoading(true);
        const res = await fetch('/api/history?pageSize=50');
        const data = await res.json();

        const defaultMatchCard: MatchCardInfo = {
          id: 'default_match',
          title: 'Trận Trực Tiếp / Mới Nhất',
          subtitle: 'Góc quay 2 Cam đồng bộ Realtime',
          isLive: true
        };

        const fetchedList: MatchCardInfo[] = (data.matches || []).map((m: RawMatchRecord, idx: number) => ({
          id: m.id,
          title: m.matchDate ? `Trận ${m.matchDate}` : `Trận đấu #${idx + 1}`,
          subtitle: m.venue || 'Sân bóng FC',
          matchDate: m.matchDate,
          matchTime: m.matchTime,
          venue: m.venue,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          extraScore: m.extraScore,
          result: m.result,
          teams: m.teams || []
        }));

        setMatches([defaultMatchCard, ...fetchedList]);
      } catch (err) {
        console.error('Error fetching match history for selector:', err);
        setMatches([
          {
            id: 'default_match',
            title: 'Trận Trực Tiếp / Mới Nhất',
            subtitle: 'Góc quay 2 Cam đồng bộ Realtime',
            isLive: true
          }
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadMatches();
  }, []);

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

    // Fallback if result string not set explicitly
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
        }
        .match-card-item:hover {
          border-color: #6366f1;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.16);
          transform: translateY(-2px);
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
            background: '#e0e7ff',
            color: '#4f46e5',
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
          {filteredMatches.length} / {matches.length} Trận đấu
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
        <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
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
              background: '#4f46e5',
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {filteredMatches.map((item) => {
            const winnerInfo = getWinnerInfo(item);

            return (
              <div
                key={item.id}
                onClick={() => onSelectMatch(item.id, item)}
                className="match-card-item"
              >
                {/* Top Badge Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {item.isLive ? (
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
                      LIVE / MỚI NHẤT
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CalendarDays size={13} />
                      {item.matchDate || 'Hôm nay'}
                      {item.matchTime ? ` • ${item.matchTime}` : ''}
                    </span>
                  )}
                </div>

                {/* Match Title */}
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
                      <Users size={12} style={{ color: '#6366f1' }} />
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

                {/* Bottom Action Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginTop: 'auto',
                  paddingTop: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#6366f1'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {isAdmin ? 'Chọn Cấu Hình' : 'Xem Highlight Trận Này'} <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
