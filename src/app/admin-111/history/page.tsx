'use client';

import { useEffect, useState, useCallback } from 'react';

// ==========================================
// TYPES
// ==========================================

interface PlayerConfig {
  id: string;
  name: string;
  subNames: string[];
  telegramHandle: string;
  jerseyNumber: number;
}

interface MatchHistoryItem {
  id: string;
  matchDate?: string;
  matchTime?: string;
  venue?: string;
  homeScore: number;
  awayScore: number;
  extraScore?: number | null;
  result: string;
  teams: { name: string; players: { name: string; telegramHandle?: string }[] }[];
  createdAt: string;
}

interface PlayerStatsSummary {
  playerName: string;
  playerId?: string | null;
  wins: number;
  draws: number;
  losses: number;
  totalMatches: number;
  winRate: number;
}

// ==========================================
// MAIN HISTORY PAGE
// ==========================================

export default function HistoryPage() {
  const [subTab, setSubTab] = useState<'matches' | 'players'>('matches');

  return (
    <>
      {/* Sub-tabs */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '16px',
        background: 'white', borderRadius: '10px', padding: '3px',
        border: '1px solid rgba(198,40,40,0.1)',
      }}>
        <button
          onClick={() => setSubTab('matches')}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
            background: subTab === 'matches' ? '#c62828' : 'transparent',
            color: subTab === 'matches' ? 'white' : '#6a6a8a',
            fontSize: '13px', fontWeight: 700, fontFamily: 'Outfit, sans-serif',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          ⚽ Trận đấu
        </button>
        <button
          onClick={() => setSubTab('players')}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
            background: subTab === 'players' ? '#c62828' : 'transparent',
            color: subTab === 'players' ? 'white' : '#6a6a8a',
            fontSize: '13px', fontWeight: 700, fontFamily: 'Outfit, sans-serif',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          👤 Cầu thủ
        </button>
      </div>

      {subTab === 'matches' ? <MatchHistoryList /> : <PlayerStatsList />}
    </>
  );
}

// ==========================================
// MATCH HISTORY LIST
// ==========================================

function MatchHistoryList() {
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchMatches = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history?page=${p}&pageSize=10`);
      const data = await res.json();
      setMatches(data.matches || []);
      setTotalPages(data.totalPages || 0);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMatches(page);
  }, [page, fetchMatches]);

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'home_win': return { text: 'HOME Win', bg: '#e8f5e9', color: '#2e7d32' };
      case 'away_win': return { text: 'AWAY Win', bg: '#e3f2fd', color: '#1565c0' };
      case 'extra_win': return { text: 'EXTRA Win', bg: '#fff3e0', color: '#e65100' };
      case 'draw': return { text: 'Hoà', bg: '#f5f5f5', color: '#616161' };
      default: return { text: result, bg: '#f5f5f5', color: '#616161' };
    }
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ ...sectionTitleStyle, marginBottom: '16px' }}>
        Lịch sử trận đấu ({total})
      </h2>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8a8aaa' }}>Đang tải...</div>
      ) : matches.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8a8aaa' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>📋</p>
          <p style={{ fontSize: '14px' }}>Chưa có lịch sử trận đấu</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Dùng lệnh /tiso trên Telegram để ghi tỉ số</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {matches.map((match) => {
              const badge = getResultBadge(match.result);
              const homeTeam = match.teams.find(t => t.name.toUpperCase().includes('HOME'));
              const awayTeam = match.teams.find(t => t.name.toUpperCase().includes('AWAY'));
              const extraTeam = match.teams.find(t => t.name.toUpperCase().includes('EXTRA'));

              return (
                <div key={match.id} style={{
                  padding: '16px', borderRadius: '12px',
                  border: '1px solid rgba(198,40,40,0.08)',
                  background: 'rgba(198,40,40,0.01)',
                  transition: 'all 0.2s',
                }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {match.matchDate && (
                        <span style={{ fontSize: '12px', color: '#8a8aaa', fontWeight: 600 }}>
                          📅 {match.matchDate}
                        </span>
                      )}
                      {match.matchTime && (
                        <span style={{ fontSize: '12px', color: '#8a8aaa', fontWeight: 600 }}>
                          ⏰ {match.matchTime}
                        </span>
                      )}
                      {match.venue && (
                        <span style={{ fontSize: '12px', color: '#8a8aaa', fontWeight: 600 }}>
                          📍 {match.venue}
                        </span>
                      )}
                    </div>
                    <span style={{
                      padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                      background: badge.bg, color: badge.color,
                    }}>
                      {badge.text}
                    </span>
                  </div>

                  {/* Score */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#8a8aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>HOME</div>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: match.result === 'home_win' ? '#2e7d32' : '#c62828' }}>
                        {match.homeScore}
                      </div>
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#8a8aaa' }}>-</span>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#8a8aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>AWAY</div>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: match.result === 'away_win' ? '#2e7d32' : '#c62828' }}>
                        {match.awayScore}
                      </div>
                    </div>
                    {match.extraScore !== null && match.extraScore !== undefined && (
                      <>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#8a8aaa' }}>-</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#8a8aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>EXTRA</div>
                          <div style={{ fontSize: '28px', fontWeight: 900, color: match.result === 'extra_win' ? '#2e7d32' : '#c62828' }}>
                            {match.extraScore}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Player lists */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {homeTeam && (
                      <div style={{ flex: 1, minWidth: '140px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#c62828', marginBottom: '4px', textTransform: 'uppercase' }}>
                          Home ({homeTeam.players.length})
                        </div>
                        <div style={{ fontSize: '12px', color: '#4a4a6a', lineHeight: 1.8 }}>
                          {homeTeam.players.map(p => p.name).join(', ')}
                        </div>
                      </div>
                    )}
                    {awayTeam && (
                      <div style={{ flex: 1, minWidth: '140px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#37474f', marginBottom: '4px', textTransform: 'uppercase' }}>
                          Away ({awayTeam.players.length})
                        </div>
                        <div style={{ fontSize: '12px', color: '#4a4a6a', lineHeight: 1.8 }}>
                          {awayTeam.players.map(p => p.name).join(', ')}
                        </div>
                      </div>
                    )}
                    {extraTeam && (
                      <div style={{ flex: 1, minWidth: '140px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#e65100', marginBottom: '4px', textTransform: 'uppercase' }}>
                          Extra ({extraTeam.players.length})
                        </div>
                        <div style={{ fontSize: '12px', color: '#4a4a6a', lineHeight: 1.8 }}>
                          {extraTeam.players.map(p => p.name).join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

// ==========================================
// PLAYER STATS LIST
// ==========================================

function PlayerStatsList() {
  const [players, setPlayers] = useState<PlayerStatsSummary[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<PlayerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [linkingPlayer, setLinkingPlayer] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  const fetchStats = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history/players?page=${p}&pageSize=15`);
      const data = await res.json();
      setPlayers(data.players || []);
      setTotalPages(data.totalPages || 0);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats(page);
    fetch('/api/players').then(r => r.json()).then(d => setRegisteredPlayers(d)).catch(() => {});
  }, [page, fetchStats]);

  const handleLinkPlayer = async (playerName: string) => {
    if (!selectedPlayerId) return;
    try {
      const res = await fetch('/api/history/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, playerId: selectedPlayerId }),
      });
      if (res.ok) {
        setLinkingPlayer(null);
        setSelectedPlayerId('');
        fetchStats(page);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 60) return '#2e7d32';
    if (rate >= 40) return '#e65100';
    return '#c62828';
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ ...sectionTitleStyle, marginBottom: '16px' }}>
        Thống kê cầu thủ ({total})
      </h2>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8a8aaa' }}>Đang tải...</div>
      ) : players.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8a8aaa' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>👤</p>
          <p style={{ fontSize: '14px' }}>Chưa có thống kê cầu thủ</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(198,40,40,0.03)' }}>
                  <th style={{ ...thStyle, width: '40px' }}>#</th>
                  <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '16px' }}>Tên</th>
                  <th style={{ ...thStyle, width: '50px' }}>Trận</th>
                  <th style={{ ...thStyle, width: '50px', color: '#2e7d32' }}>W</th>
                  <th style={{ ...thStyle, width: '50px', color: '#616161' }}>D</th>
                  <th style={{ ...thStyle, width: '50px', color: '#c62828' }}>L</th>
                  <th style={{ ...thStyle, width: '70px' }}>Tỉ lệ</th>
                  <th style={{ ...thStyle, width: '100px' }}>Liên kết</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, idx) => (
                  <tr key={player.playerName + idx} style={{ borderBottom: '1px solid rgba(198,40,40,0.05)' }}>
                    <td style={tdCenter}>
                      <span style={{ color: '#8a8aaa', fontSize: '13px' }}>{(page - 1) * 15 + idx + 1}</span>
                    </td>
                    <td style={{ ...tdLeft, fontWeight: 600, color: '#1a1a2e' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {player.playerName}
                        {player.playerId && (
                          <span style={{
                            padding: '2px 6px', borderRadius: '4px', fontSize: '10px',
                            background: 'rgba(46,125,50,0.08)', color: '#2e7d32', fontWeight: 600,
                          }}>
                            ĐK
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...tdCenter, fontWeight: 700 }}>{player.totalMatches}</td>
                    <td style={{ ...tdCenter, fontWeight: 700, color: '#2e7d32' }}>{player.wins}</td>
                    <td style={{ ...tdCenter, fontWeight: 700, color: '#616161' }}>{player.draws}</td>
                    <td style={{ ...tdCenter, fontWeight: 700, color: '#c62828' }}>{player.losses}</td>
                    <td style={tdCenter}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 800,
                        background: `${getWinRateColor(player.winRate)}15`,
                        color: getWinRateColor(player.winRate),
                      }}>
                        {player.winRate}%
                      </span>
                    </td>
                    <td style={tdCenter}>
                      {linkingPlayer === player.playerName ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                          <select
                            style={{ ...inputCompact, width: '90px', fontSize: '11px', padding: '4px 6px' }}
                            value={selectedPlayerId}
                            onChange={e => setSelectedPlayerId(e.target.value)}
                          >
                            <option value="">Chọn...</option>
                            {registeredPlayers.map(rp => (
                              <option key={rp.id} value={rp.id}>{rp.name}</option>
                            ))}
                          </select>
                          <button style={{ ...btnBase, fontSize: '11px', padding: '4px 8px', background: '#e8f5e9', color: '#2e7d32' }}
                            onClick={() => handleLinkPlayer(player.playerName)}>✓</button>
                          <button style={{ ...btnBase, fontSize: '11px', padding: '4px 8px', background: '#f5f5f5', color: '#616161' }}
                            onClick={() => { setLinkingPlayer(null); setSelectedPlayerId(''); }}>✕</button>
                        </div>
                      ) : (
                        <button
                          style={{ ...btnBase, fontSize: '11px', padding: '4px 10px', background: player.playerId ? '#e8f5e9' : '#fff3e0', color: player.playerId ? '#2e7d32' : '#e65100' }}
                          onClick={() => setLinkingPlayer(player.playerName)}
                        >
                          {player.playerId ? '✅ Đã liên kết' : '🔗 Liên kết'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

// ==========================================
// PAGINATION COMPONENT
// ==========================================

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
      <button
        style={{ ...btnBase, padding: '8px 16px', background: page > 1 ? '#e3f2fd' : '#f5f5f5', color: page > 1 ? '#1565c0' : '#bbb', cursor: page > 1 ? 'pointer' : 'not-allowed' }}
        onClick={() => page > 1 && onPageChange(page - 1)}
        disabled={page <= 1}
      >
        ← Trước
      </button>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#4a4a6a' }}>
        Trang {page} / {totalPages}
      </span>
      <button
        style={{ ...btnBase, padding: '8px 16px', background: page < totalPages ? '#e3f2fd' : '#f5f5f5', color: page < totalPages ? '#1565c0' : '#bbb', cursor: page < totalPages ? 'pointer' : 'not-allowed' }}
        onClick={() => page < totalPages && onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Tiếp →
      </button>
    </div>
  );
}

// ==========================================
// SHARED STYLES
// ==========================================

const cardStyle: React.CSSProperties = {
  background: 'white', borderRadius: '14px', padding: '20px 24px',
  border: '1px solid rgba(198,40,40,0.1)',
  boxShadow: '0 2px 8px rgba(198,40,40,0.05)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '15px', fontWeight: 700, color: '#c62828', margin: 0,
};

const inputCompact: React.CSSProperties = {
  padding: '7px 10px', borderRadius: '8px',
  border: '1.5px solid rgba(198,40,40,0.2)', background: '#fffafa',
  fontSize: '13px', fontFamily: 'Outfit, sans-serif', outline: 'none',
  color: '#1a1a2e',
};

const btnBase: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', border: 'none',
  fontSize: '13px', fontWeight: 600, fontFamily: 'Outfit, sans-serif',
  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
};

const thStyle: React.CSSProperties = {
  padding: '12px 12px', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6a6a8a',
  textAlign: 'center', borderBottom: '1px solid rgba(198,40,40,0.08)',
};

const tdCenter: React.CSSProperties = {
  padding: '12px 12px', fontSize: '14px', textAlign: 'center', verticalAlign: 'middle',
};

const tdLeft: React.CSSProperties = {
  padding: '12px 20px', fontSize: '14px', textAlign: 'left', verticalAlign: 'middle',
};
