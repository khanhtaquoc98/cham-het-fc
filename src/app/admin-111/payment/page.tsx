'use client';

import { useEffect, useState, useCallback } from 'react';
import { PlayerPayment, LosingTeam, PaymentSummary } from '@/types/payment';
import { Team } from '@/types/match';

interface MatchInfo {
  id: string;
  teams: Team[];
  venue: { date?: string; time?: string; venue?: string };
}

export default function PaymentPage() {
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Editable fields
  const [fieldCost, setFieldCost] = useState('');
  const [drinkCost, setDrinkCost] = useState('');
  const [losingTeams, setLosingTeams] = useState<LosingTeam[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    try {
      const [matchRes, paymentRes] = await Promise.all([
        fetch('/api/match'),
        fetch('/api/payment'),
      ]);
      const matchJson = await matchRes.json();
      const matchData = matchJson.matchData;
      const paymentData: PaymentSummary = await paymentRes.json();

      if (matchData) {
        setMatchInfo({ id: matchData.id, teams: matchData.teams || [], venue: matchData.venue || {} });
      }
      setSummary(paymentData);

      if (paymentData.matchPayment) {
        setFieldCost(paymentData.matchPayment.fieldCost ? paymentData.matchPayment.fieldCost.toString() : '');
        setDrinkCost(paymentData.matchPayment.drinkCost ? paymentData.matchPayment.drinkCost.toString() : '');
        setLosingTeams(paymentData.matchPayment.losingTeams || []);

        // Rebuild scores from losing teams
        const s: Record<string, number> = {};
        for (const lt of paymentData.matchPayment.losingTeams) {
          s[lt.teamName] = lt.score;
        }
        // Add winning team scores too (not in losingTeams)
        if (matchData?.teams) {
          for (const t of matchData.teams) {
            if (s[t.name] === undefined) s[t.name] = 0;
          }
        }
        setScores(s);
      } else if (matchData?.teams) {
        const s: Record<string, number> = {};
        for (const t of matchData.teams) {
          s[t.name] = 0;
        }
        setScores(s);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showStatus = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 2500);
  };

  // Tự động tính losingTeams từ scores
  const computeLosingTeams = (newScores: Record<string, number>): LosingTeam[] => {
    const teams = Object.entries(newScores);
    if (teams.length < 2) return [];

    // Sort by score ascending (losers first)
    const sorted = [...teams].sort((a, b) => a[1] - b[1]);
    const maxScore = sorted[sorted.length - 1][1];

    if (teams.length === 2) {
      // 2-team: team thua chịu 100% tiền nước
      const loser = sorted[0];
      if (loser[1] >= maxScore) return []; // draw
      return [{ teamName: loser[0], score: loser[1], drinkPercent: 100 }];
    } else {
      // 3-team: 2 team thua
      // Winner = team with highest score
      const winner = sorted[sorted.length - 1];
      const losers = sorted.filter(t => t[0] !== winner[0]);

      if (losers.length < 2) return [];
      // Check if all scores tied
      if (losers.every(l => l[1] === maxScore)) return [];

      // Team có tỉ số bé nhất → 70%, team thua còn lại → 30%
      const worstScore = losers[0][1];
      const bestLoserScore = losers[1][1];

      if (worstScore === bestLoserScore) {
        // 2 team thua cùng tỉ số → chia đều 50/50
        return [
          { teamName: losers[0][0], score: losers[0][1], drinkPercent: 50 },
          { teamName: losers[1][0], score: losers[1][1], drinkPercent: 50 },
        ];
      }

      return [
        { teamName: losers[0][0], score: worstScore, drinkPercent: 70 },
        { teamName: losers[1][0], score: bestLoserScore, drinkPercent: 30 },
      ];
    }
  };

  const handleScoreChange = (teamName: string, score: number) => {
    const newScores = { ...scores, [teamName]: score };
    setScores(newScores);
    setLosingTeams(computeLosingTeams(newScores));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldCost: parseInt(fieldCost) || 0,
          drinkCost: parseInt(drinkCost) || 0,
          losingTeams,
        }),
      });
      const data = await res.json();
      setSummary(data);
      showStatus('✅ Đã lưu & tính toán!');
    } catch (err) {
      console.error(err);
      showStatus('❌ Lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaid = async (pp: PlayerPayment) => {
    const action = pp.isPaid ? 'mark-unpaid' : 'mark-paid';
    try {
      await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, paymentId: pp.id }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const formatVND = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

  if (loading) {
    return <div style={cardStyle}><div style={{ padding: '20px', textAlign: 'center', color: '#8a8aaa' }}>Đang tải...</div></div>;
  }

  const teams = matchInfo?.teams || [];
  const playerPayments = summary?.playerPayments || [];
  const paidCount = playerPayments.filter(p => p.isPaid).length;
  const totalAmount = playerPayments.reduce((s, p) => s + p.totalAmount, 0);
  const paidAmount = playerPayments.filter(p => p.isPaid).reduce((s, p) => s + p.totalAmount, 0);

  return (
    <div>
      {/* Thông tin tiền sân & nước */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={sectionTitleStyle}>💰 Thanh toán trận đấu</h2>
          {status && <span style={statusBadgeStyle}>{status}</span>}
        </div>

        {matchInfo?.venue?.date && (
          <div style={{ fontSize: 12, color: '#8a8aaa', marginBottom: 12 }}>
            📅 {matchInfo.venue.date} {matchInfo.venue.time && `- ⏰ ${matchInfo.venue.time}`} {matchInfo.venue.venue && `- 📍 ${matchInfo.venue.venue}`}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Tiền sân (VND)</label>
            <input
              style={inputStyle}
              type="number"
              placeholder="VD: 580000"
              value={fieldCost}
              onChange={e => setFieldCost(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Tiền nước (VND) - optional</label>
            <input
              style={inputStyle}
              type="number"
              placeholder="VD: 160000"
              value={drinkCost}
              onChange={e => setDrinkCost(e.target.value)}
            />
          </div>
        </div>

        {/* Tỉ số để xác định team thua */}
        {teams.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Tỉ số trận đấu</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {teams.map((t, idx) => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#4a4a6a' }}>
                    {t.name === 'HOME' ? '⚪' : t.name === 'AWAY' ? '⚫' : '🟠'} {t.name}
                  </span>
                  <input
                    style={{ ...inputStyle, width: 60, textAlign: 'center', padding: '8px' }}
                    type="number"
                    min="0"
                    value={scores[t.name] ?? 0}
                    onChange={e => handleScoreChange(t.name, parseInt(e.target.value) || 0)}
                  />
                  {idx < teams.length - 1 && <span style={{ color: '#ccc', fontWeight: 700 }}>-</span>}
                </div>
              ))}
            </div>

            {losingTeams.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#e65100', fontWeight: 600 }}>
                🍺 Tiền nước: {losingTeams.map(lt =>
                  `${lt.teamName} (${lt.drinkPercent}%)`
                ).join(', ')}
              </div>
            )}
          </div>
        )}

        <button
          style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Đang lưu...' : '💾 Lưu & Tính toán'}
        </button>
      </div>

      {/* Danh sách thanh toán */}
      {playerPayments.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={sectionTitleStyle}>📋 Danh sách thanh toán</h2>
            <span style={{ fontSize: 12, color: '#8a8aaa' }}>
              {paidCount}/{playerPayments.length} đã thanh toán • {formatVND(paidAmount)}/{formatVND(totalAmount)}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${playerPayments.length > 0 ? (paidCount / playerPayments.length) * 100 : 0}%`,
              background: 'linear-gradient(90deg, #2e7d32, #4caf50)',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }} />
          </div>

          {/* Group by team */}
          {teams.map(team => {
            const teamPlayers = playerPayments.filter(p => p.teamName === team.name);
            if (teamPlayers.length === 0) return null;

            const isLosingTeam = losingTeams.some(lt => lt.teamName === team.name);
            const losingInfo = losingTeams.find(lt => lt.teamName === team.name);

            return (
              <div key={team.name} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: isLosingTeam ? '#c62828' : '#2e7d32',
                  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {team.name === 'HOME' ? '⚪ ' : team.name === 'AWAY' ? '⚫ ' : '🟠 '}
                  {team.name} ({teamPlayers.length} người)
                  {isLosingTeam && losingInfo && (
                    <span style={{ fontSize: 11, color: '#e65100', fontWeight: 600 }}>
                      — Nước {losingInfo.drinkPercent}%
                    </span>
                  )}
                  {!isLosingTeam && <span style={{ fontSize: 11, color: '#2e7d32' }}>— Thắng 🏆</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {teamPlayers.map(pp => (
                    <div
                      key={pp.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 10,
                        background: pp.isPaid ? 'rgba(46,125,50,0.06)' : 'rgba(198,40,40,0.04)',
                        border: `1px solid ${pp.isPaid ? 'rgba(46,125,50,0.15)' : 'rgba(198,40,40,0.1)'}`,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onClick={() => handleTogglePaid(pp)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 4,
                          border: `2px solid ${pp.isPaid ? '#2e7d32' : '#ccc'}`,
                          background: pp.isPaid ? '#2e7d32' : 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, color: 'white', fontWeight: 700,
                          transition: 'all 0.15s',
                        }}>
                          {pp.isPaid && '✓'}
                        </div>
                        <span style={{
                          fontSize: 14, fontWeight: 600,
                          color: pp.isPaid ? '#2e7d32' : '#1a1a2e',
                          textDecoration: pp.isPaid ? 'line-through' : 'none',
                        }}>
                          {pp.playerName}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: pp.isPaid ? '#2e7d32' : '#c62828' }}>
                          {formatVND(pp.totalAmount)}
                        </div>
                        <div style={{ fontSize: 10, color: '#8a8aaa' }}>
                          Sân {formatVND(pp.fieldAmount)}
                          {pp.drinkAmount > 0 && ` + Nước ${formatVND(pp.drinkAmount)}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ========== STYLES ========== */

const cardStyle: React.CSSProperties = {
  background: 'white', borderRadius: '14px', padding: '20px 24px',
  border: '1px solid rgba(198,40,40,0.1)',
  boxShadow: '0 2px 8px rgba(198,40,40,0.05)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '15px', fontWeight: 700, color: '#c62828', margin: 0,
};

const statusBadgeStyle: React.CSSProperties = {
  fontSize: '12px', color: '#e53935', fontWeight: 600,
  background: 'rgba(229,57,53,0.08)', padding: '4px 10px', borderRadius: 6,
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#4a4a6a',
  display: 'block', marginBottom: '4px', textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1.5px solid rgba(198,40,40,0.15)', background: '#fffafa',
  fontSize: '14px', fontFamily: 'Outfit, sans-serif', outline: 'none',
  color: '#1a1a2e', transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const btnBase: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', border: 'none',
  fontSize: '13px', fontWeight: 600, fontFamily: 'Outfit, sans-serif',
  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  padding: '10px 24px', borderRadius: '10px',
  background: 'linear-gradient(135deg, #e53935, #ef5350)',
  color: 'white', fontSize: '14px',
};
