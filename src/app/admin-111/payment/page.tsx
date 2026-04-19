'use client';

import { useEffect, useState, useCallback } from 'react';
import { PlayerPayment, LosingTeam, PaymentSummary } from '@/types/payment';
import { Team } from '@/types/match';
import toast, { Toaster } from 'react-hot-toast';

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
  const [sendingNoti, setSendingNoti] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ pp: PlayerPayment; mode: 'pay' | 'unpay'; method: string } | null>(null);

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

  // Tự động tính losingTeams từ scores
  const computeLosingTeams = (newScores: Record<string, number>): LosingTeam[] => {
    const teams = Object.entries(newScores);
    if (teams.length < 2) return [];

    // Sort by score ascending (losers first)
    const sorted = [...teams].sort((a, b) => a[1] - b[1]);
    const maxScore = sorted[sorted.length - 1][1];

    if (teams.length === 2) {
      const loser = sorted[0];
      if (loser[1] >= maxScore) {
        // Hoà: 2 đội chia đều tiền nước (50/50)
        return [
          { teamName: sorted[0][0], score: sorted[0][1], drinkPercent: 50 },
          { teamName: sorted[1][0], score: sorted[1][1], drinkPercent: 50 },
        ];
      }
      // Team thua chịu 100% tiền nước
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
      toast.success('Đã lưu & tính toán!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Bạn có chắc muốn xoá toàn bộ dữ liệu thanh toán trận này? Tiền sân và nước sẽ về 0, tất cả khoản thu đều bị xoá.')) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      setSummary(data);
      setFieldCost('');
      setDrinkCost('');
      setScores({});
      setLosingTeams([]);
      toast.success('Đã xoá trắng dữ liệu!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xoá dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaid = async (pp: PlayerPayment, method: string = 'manual') => {
    const action = pp.isPaid ? 'mark-unpaid' : 'mark-paid';
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, paymentId: pp.id, method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi xử lý thanh toán');

      await fetchData();
      toast.success(pp.isPaid ? 'Bỏ đánh dấu thanh toán' : `Thanh toán thành công qua ${method}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái');
    }
  };

  const openPayModal = (pp: PlayerPayment) => {
    if (pp.isPaid) {
      setPaymentModal({ pp, mode: 'unpay', method: pp.paymentMethod || 'manual' });
    } else {
      setPaymentModal({ pp, mode: 'pay', method: 'payos' });
    }
  };

  const confirmPaymentModal = async () => {
    if (!paymentModal) return;
    const { pp, mode, method } = paymentModal;
    setPaymentModal(null);
    await handleTogglePaid(mode === 'unpay' ? { ...pp, isPaid: true } : pp, method);
  };

  const handleAutoCheckoutApp = () => {
    setShowConfirmModal(true);
  };

  const executeAutoCheckoutApp = async () => {
    setShowConfirmModal(false);
    setSaving(true);
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-checkout-app' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi xử lý');
      
      setSummary(data.summary);
      const { successCount, skipCount } = data.stats;
      toast.success(`Đã tự động thu của ${successCount} người! Bỏ qua ${skipCount} người (số dư không đủ/chưa liên kết).`, { duration: 5000 });
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  const formatVND = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

  // Helper: normalize value → human label
  const labelForMethod = (m: string) => {
    if (m === 'app')   return 'App ⚽';
    if (m === 'payos') return '🏦 QR Ngân hàng';
    if (m === 'other') return '💵 Tiền mặt';
    if (m === 'manual') return 'Thủ công';
    return m;
  };

  const handleSendNotification = async () => {
    if (!summary) return;
    setSendingNoti(true);
    try {
      const venue = matchInfo?.venue;
      const dateStr = venue?.date ?? '';
      const timeStr = venue?.time ?? '';
      const venueStr = venue?.venue ?? '';
      const title = `CHỐT THANH TOÁN TRẬN 📅 ${dateStr}${timeStr ? ` - ⏰ ${timeStr}` : ''}${venueStr ? ` - 📍 ${venueStr}` : ''}`;

      const allPlayers = summary.playerPayments || [];
      const unpaidPlayers = allPlayers.filter(p => !p.isPaid);

      const qrCount  = allPlayers.filter(p => p.isPaid && p.paymentMethod === 'payos').length;
      const qrAmount  = allPlayers.filter(p => p.isPaid && p.paymentMethod === 'payos').reduce((s, p) => s + p.totalAmount, 0);

      const appCount  = allPlayers.filter(p => p.isPaid && p.paymentMethod === 'app').length;
      const appAmount = allPlayers.filter(p => p.isPaid && p.paymentMethod === 'app').reduce((s, p) => s + p.totalAmount, 0);

      const otherCount  = allPlayers.filter(p => p.isPaid && p.paymentMethod === 'other').length;
      const otherAmount = allPlayers.filter(p => p.isPaid && p.paymentMethod === 'other').reduce((s, p) => s + p.totalAmount, 0);

      const unpaidAmount = unpaidPlayers.reduce((s, p) => s + p.totalAmount, 0);
      const totalAll = allPlayers.reduce((s, p) => s + p.totalAmount, 0);
      const paidDigital = qrAmount + appAmount;

      const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

      const unpaidList = unpaidPlayers.length > 0
        ? `\nDanh sách chưa thanh toán (${unpaidPlayers.length} người):\n` +
          unpaidPlayers.map((p, i) => `${i + 1}. ${p.playerName} (${p.teamName}): ${fmt(p.totalAmount)}đ`).join('\n')
        : '';

      const body = [
        `QR Ngân Hàng (payos) x ${qrCount} người: ${fmt(qrAmount)}đ`,
        `App (Bóng) x ${appCount} người: ${fmt(appAmount)}đ`,
        `Khác/Tiền Mặt: x ${otherCount} người: ${fmt(otherAmount)}đ`,
        unpaidList,
        '----------------------------------------------',
        `Tổng cộng: ${fmt(totalAll)}`,
        `- QR Ngân Hàng + App (Bóng): ${fmt(paidDigital)}`,
        `- Khác/Tiền Mặt: ${fmt(otherAmount)}đ`,
        `- Chưa thanh toán: ${fmt(unpaidAmount)}đ`,
      ].join('\n');

      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message: body }),
      });

      if (!res.ok) throw new Error('Gửi thông báo thất bại');
      toast.success('📣 Đã gửi thông báo Chốt Thanh Toán!');
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Lỗi khi gửi thông báo');
    } finally {
      setSendingNoti(false);
    }
  };

  if (loading) {
    return <div style={cardStyle}><div style={{ padding: '20px', textAlign: 'center', color: '#8a8aaa' }}>Đang tải...</div></div>;
  }

  const teams = matchInfo?.teams || [];
  const playerPayments = summary?.playerPayments || [];
  const paidCount = playerPayments.filter(p => p.isPaid).length;
  const totalAmount = playerPayments.reduce((s, p) => s + p.totalAmount, 0);
  const paidAmount = playerPayments.filter(p => p.isPaid).reduce((s, p) => s + p.totalAmount, 0);

  // Tổng tiền theo phương thức thanh toán
  const paidByApp   = playerPayments.filter(p => p.isPaid && p.paymentMethod === 'app').reduce((s, p) => s + p.totalAmount, 0);
  const paidByQR    = playerPayments.filter(p => p.isPaid && p.paymentMethod === 'payos').reduce((s, p) => s + p.totalAmount, 0);
  const paidByOther = playerPayments.filter(p => p.isPaid && p.paymentMethod === 'other').reduce((s, p) => s + p.totalAmount, 0);
  const countByApp   = playerPayments.filter(p => p.isPaid && p.paymentMethod === 'app').length;
  const countByQR    = playerPayments.filter(p => p.isPaid && p.paymentMethod === 'payos').length;
  const countByOther = playerPayments.filter(p => p.isPaid && p.paymentMethod === 'other').length;

  return (
    <div>
      <Toaster position="top-center" />
      {/* Thông tin tiền sân & nước */}
      <div className="admin-card" style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={sectionTitleStyle}>💰 Thanh toán trận đấu</h2>
        </div>

        {matchInfo?.venue?.date && (
          <div style={{ fontSize: 12, color: '#8a8aaa', marginBottom: 12 }}>
            📅 {matchInfo.venue.date} {matchInfo.venue.time && `- ⏰ ${matchInfo.venue.time}`} {matchInfo.venue.venue && `- 📍 ${matchInfo.venue.venue}`}
          </div>
        )}

        <div className="admin-form-grid-2" style={{ marginBottom: '16px' }}>
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

        <div className="admin-save-row">
          <button
            style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '⏳ Đang lưu...' : '💾 Lưu & Tính toán'}
          </button>
          <button
            style={{ 
              padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, 
              cursor: 'pointer', background: '#f5f5f5', color: '#4a4a6a', border: '1px solid #ddd',
              opacity: saving ? 0.6 : 1
            }}
            onClick={handleReset}
            disabled={saving}
          >
            🔄 Xoá dữ liệu làm lại
          </button>
        </div>
      </div>

      {/* Danh sách thanh toán */}
      {playerPayments.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <div className="admin-payment-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={sectionTitleStyle}>📋 Danh sách thanh toán</h2>
              <span style={{ fontSize: 12, color: '#8a8aaa' }}>
                {paidCount}/{playerPayments.length} đã thanh toán • {formatVND(paidAmount)}/{formatVND(totalAmount)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {playerPayments.length > paidCount && (
                <button
                  onClick={handleAutoCheckoutApp}
                  disabled={saving || sendingNoti}
                  style={{
                    ...btnPrimary,
                    background: 'linear-gradient(135deg, #1976d2, #2196f3)',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    opacity: saving ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ⚽ Auto Thanh Toán
                </button>
              )}
              <button
                onClick={handleSendNotification}
                disabled={saving || sendingNoti}
                style={{
                  ...btnPrimary,
                  background: sendingNoti
                    ? 'linear-gradient(135deg, #7b1fa2, #9c27b0)'
                    : 'linear-gradient(135deg, #6a1b9a, #8e24aa)',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  opacity: sendingNoti ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                {sendingNoti ? '⏳ Đang gửi...' : '📣 Chốt Thanh Toán'}
              </button>
            </div>
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

          {/* Thống kê theo phương thức thanh toán */}
          {paidCount > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 16,
            }}>
              {/* App */}
              <div style={{
                padding: '12px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(25,118,210,0.08), rgba(33,150,243,0.12))',
                border: '1px solid rgba(25,118,210,0.15)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>⚽</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1976d2', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>
                  App (Bóng)
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1565c0' }}>
                  {formatVND(paidByApp)}
                </div>
                <div style={{ fontSize: 10, color: '#64b5f6', fontWeight: 600, marginTop: 2 }}>
                  {countByApp} người
                </div>
              </div>
              {/* QR Bank */}
              <div style={{
                padding: '12px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(46,125,50,0.08), rgba(76,175,80,0.12))',
                border: '1px solid rgba(46,125,50,0.15)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🏦</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>
                  QR Ngân hàng
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1b5e20' }}>
                  {formatVND(paidByQR)}
                </div>
                <div style={{ fontSize: 10, color: '#66bb6a', fontWeight: 600, marginTop: 2 }}>
                  {countByQR} người
                </div>
              </div>
              {/* Khác */}
              <div style={{
                padding: '12px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(230,81,0,0.08), rgba(255,152,0,0.12))',
                border: '1px solid rgba(230,81,0,0.15)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>💵</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>
                  Khác / Tiền mặt
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#bf360c' }}>
                  {formatVND(paidByOther)}
                </div>
                <div style={{ fontSize: 10, color: '#ff9800', fontWeight: 600, marginTop: 2 }}>
                  {countByOther} người
                </div>
              </div>
            </div>
          )}

          {/* Group by team */}
          {teams.map(team => {
            const teamPlayers = playerPayments.filter(p => p.teamName === team.name);
            if (teamPlayers.length === 0) return null;

            const isLosingTeam = losingTeams.some(lt => lt.teamName === team.name);
            const losingInfo = losingTeams.find(lt => lt.teamName === team.name);
            // Kiểm tra hoà: tất cả team đều trong losingTeams và cùng % (2-team: 50/50)
            const isDraw = teams.length === 2 && losingTeams.length === 2 && losingTeams.every(lt => lt.drinkPercent === 50);

            return (
              <div key={team.name} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: isDraw ? '#e65100' : isLosingTeam ? '#c62828' : '#2e7d32',
                  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {team.name === 'HOME' ? '⚪ ' : team.name === 'AWAY' ? '⚫ ' : '🟠 '}
                  {team.name} ({teamPlayers.length} người)
                  {isDraw && (
                    <span style={{ fontSize: 11, color: '#e65100', fontWeight: 600 }}>
                      — Hoà 🤝 Nước 50%
                    </span>
                  )}
                  {!isDraw && isLosingTeam && losingInfo && (
                    <span style={{ fontSize: 11, color: '#e65100', fontWeight: 600 }}>
                      — Nước {losingInfo.drinkPercent}%
                    </span>
                  )}
                  {!isDraw && !isLosingTeam && <span style={{ fontSize: 11, color: '#2e7d32' }}>— Thắng 🏆</span>}
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
                      onClick={() => openPayModal(pp)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
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

                      {pp.isPaid && (
                        <div style={{ marginRight: 10, fontSize: 11, color: '#2e7d32', fontWeight: 700 }}>
                          [{labelForMethod(pp.paymentMethod)}]
                        </div>
                      )}

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

      {/* Auto Checkout Confirm Modal */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'var(--bg-primary, #fff)', borderRadius: '16px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle, #eee)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#c62828' }}>⚠️ Xác nhận Thu Tự Động</h3>
            </div>
            <div style={{ padding: '20px', fontSize: '14px', color: '#4a4a6a', lineHeight: '1.5' }}>
              App sẽ tự động quét toàn bộ danh sách chưa đóng tiền, trừ <b>&quot;Bóng&quot;</b> trong app đối với những người đã liên kết tài khoản và <b>đủ số dư</b>.<br/><br/>Bạn có chắc chắn muốn chạy công cụ này không?
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle, #eee)', display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#4a4a6a' }}
              >
                Hủy
              </button>
              <button 
                onClick={executeAutoCheckoutApp}
                style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #1976d2, #2196f3)', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: 'white' }}
              >
                Chắc chắn chạy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Action Modal */}
      {paymentModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '16px' }}
          onClick={() => setPaymentModal(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {paymentModal.mode === 'pay' ? (
              <>
                {/* Header */}
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8a8aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Xác nhận thanh toán</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e' }}>{paymentModal.pp.playerName}</div>
                  <div style={{ fontSize: 12, color: '#8a8aaa', marginTop: 2 }}>{paymentModal.pp.teamName}</div>
                </div>

                {/* Amount breakdown */}
                <div style={{ padding: '16px 24px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#666' }}>Tiền sân</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{formatVND(paymentModal.pp.fieldAmount)}</span>
                  </div>
                  {paymentModal.pp.drinkAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: '#666' }}>Tiền nước</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e65100' }}>{formatVND(paymentModal.pp.drinkAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #e0e0e0', marginTop: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Tổng cộng</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#c62828' }}>{formatVND(paymentModal.pp.totalAmount)}</span>
                  </div>
                </div>

                {/* Method selector */}
                <div style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4a4a6a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Phương thức thanh toán</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { value: 'payos', label: '🏦 QR Ngân hàng', color: '#2e7d32', bg: 'rgba(46,125,50,0.07)' },
                      { value: 'app',   label: '⚽ App (Bóng)',      color: '#1976d2', bg: 'rgba(25,118,210,0.07)' },
                      { value: 'other', label: '💵 Khác / Tiền mặt', color: '#e65100', bg: 'rgba(230,81,0,0.07)' },
                    ].map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => setPaymentModal(m => m ? { ...m, method: opt.value } : null)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                          border: `2px solid ${paymentModal.method === opt.value ? opt.color : '#e0e0e0'}`,
                          background: paymentModal.method === opt.value ? opt.bg : '#fff',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 600, color: paymentModal.method === opt.value ? opt.color : '#4a4a6a' }}>{opt.label}</span>
                        {paymentModal.method === opt.value && (
                          <span style={{ fontSize: 16, color: opt.color }}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setPaymentModal(null)}
                    style={{ flex: 1, padding: '13px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', color: '#4a4a6a', fontSize: 14 }}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={confirmPaymentModal}
                    style={{ flex: 2, padding: '13px', background: 'linear-gradient(135deg, #2e7d32, #43a047)', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', color: 'white', fontSize: 14 }}
                  >
                    ✓ Xác nhận đã thanh toán
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Unpay header */}
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#c62828', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>⚠️ Bỏ xác nhận thanh toán</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e' }}>{paymentModal.pp.playerName}</div>
                  <div style={{ fontSize: 12, color: '#8a8aaa', marginTop: 2 }}>
                    Đã thanh toán qua: <b>{labelForMethod(paymentModal.pp.paymentMethod)}
                    </b> • {formatVND(paymentModal.pp.totalAmount)}
                  </div>
                </div>
                <div style={{ padding: '20px 24px', fontSize: 14, color: '#4a4a6a', lineHeight: 1.6 }}>
                  Bạn có chắc muốn <b style={{ color: '#c62828' }}>bỏ đánh dấu đã thanh toán</b> của cầu thủ này không?
                </div>
                <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setPaymentModal(null)}
                    style={{ flex: 1, padding: '13px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', color: '#4a4a6a', fontSize: 14 }}
                  >
                    Giữ nguyên
                  </button>
                  <button
                    onClick={confirmPaymentModal}
                    style={{ flex: 2, padding: '13px', background: 'linear-gradient(135deg, #c62828, #e53935)', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', color: 'white', fontSize: 14 }}
                  >
                    Bỏ thanh toán
                  </button>
                </div>
              </>
            )}
          </div>
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

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#4a4a6a',
  display: 'block', marginBottom: '4px', textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1.5px solid rgba(198,40,40,0.15)', background: '#fffafa',
  fontSize: '14px', fontFamily: 'Chiron GoRound TC, sans-serif', outline: 'none',
  color: '#1a1a2e', transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const btnBase: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', border: 'none',
  fontSize: '13px', fontWeight: 600, fontFamily: 'Chiron GoRound TC, sans-serif',
  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  padding: '10px 24px', borderRadius: '10px',
  background: 'linear-gradient(135deg, #e53935, #ef5350)',
  color: 'white', fontSize: '14px',
};
