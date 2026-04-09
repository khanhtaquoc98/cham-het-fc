'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PaymentSummary, LosingTeam } from '@/types/payment';
import { Team } from '@/types/match';
import toast, { Toaster } from 'react-hot-toast';

interface MatchInfo {
  id: string;
  teams: Team[];
  venue: { date?: string; time?: string; venue?: string };
}

export default function PublicPaymentPage() {
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [matchRes, paymentRes] = await Promise.all([
        fetch('/api/match'),
        fetch('/api/payment'),
      ]);
      const matchJson = await matchRes.json();
      const md = matchJson.matchData;
      const paymentData: PaymentSummary = await paymentRes.json();

      if (md) {
        setMatchInfo({ id: md.id, teams: md.teams || [], venue: md.venue || {} });
      }
      setSummary(paymentData);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatVND = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

  const teams = matchInfo?.teams || [];
  const playerPayments = summary?.playerPayments || [];
  const losingTeams: LosingTeam[] = summary?.matchPayment?.losingTeams || [];
  const isReady = summary?.isReady || false;

  // Selected players
  const selectedPlayers = playerPayments.filter(p => selectedIds.has(p.id));
  const invoiceTotal = selectedPlayers.reduce((s, p) => s + p.totalAmount, 0);
  const invoiceField = selectedPlayers.reduce((s, p) => s + p.fieldAmount, 0);
  const invoiceDrink = selectedPlayers.reduce((s, p) => s + p.drinkAmount, 0);

  if (loading) {
    return (
      <div style={rootStyle}>
        <div style={containerStyle}>
          <div style={{ textAlign: 'center', padding: 40, color: '#8a8aaa' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            Đang tải thông tin thanh toán...
          </div>
        </div>
      </div>
    );
  }

  // Not ready state
  if (!isReady) {
    return (
      <div style={rootStyle}>
        <div style={containerStyle}>
          <Link href="/" style={backLinkStyle}>← Trang chủ</Link>

          <div style={heroCardStyle}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', margin: 0, marginBottom: 8 }}>
              Chưa có thông tin thanh toán
            </h1>
            <p style={{ fontSize: 14, color: '#8a8aaa', margin: 0, lineHeight: 1.6 }}>
              Vui lòng đợi Captain cập nhật tiền sân, tiền nước<br />
              và kết quả trận đấu.
            </p>
          </div>

          {/* Show partial info if available */}
          {summary?.matchPayment && (
            <div style={infoCardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#c62828', marginBottom: 10 }}>ℹ️ Thông tin hiện tại</div>
              <div style={infoRowStyle}>
                <span>Tiền sân</span>
                <span style={{ fontWeight: 700, color: '#1a1a2e' }}>
                  {summary.matchPayment.fieldCost > 0 ? formatVND(summary.matchPayment.fieldCost) : '❌ Chưa có'}
                </span>
              </div>
              <div style={infoRowStyle}>
                <span>Tiền nước</span>
                <span style={{ fontWeight: 700, color: '#1a1a2e' }}>
                  {summary.matchPayment.drinkCost > 0 ? formatVND(summary.matchPayment.drinkCost) : '—'}
                </span>
              </div>
              <div style={infoRowStyle}>
                <span>Kết quả trận</span>
                <span style={{ fontWeight: 700, color: '#1a1a2e' }}>
                  {losingTeams.length > 0 ? '✅' : '❌ Chưa có'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Ready - show payment page
  return (
    <div style={rootStyle}>
      <Toaster position="top-center" />
      <div style={containerStyle}>
        <Link href="/" style={backLinkStyle}>← Trang chủ</Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', margin: 0, marginBottom: 4 }}>
            💰 Thanh toán trận đấu
          </h1>
          {matchInfo?.venue?.date && (
            <p style={{ fontSize: 13, color: '#8a8aaa', margin: 0 }}>
              📅 {matchInfo.venue.date} {matchInfo.venue.time && `• ⏰ ${matchInfo.venue.time}`}
            </p>
          )}
        </div>

        {/* Summary bar */}
        <div style={summaryBarStyle}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#8a8aaa', textTransform: 'uppercase', letterSpacing: 1 }}>Sân</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>{formatVND(summary!.matchPayment!.fieldCost)}</div>
            </div>
            {summary!.matchPayment!.drinkCost > 0 && (
              <div>
                <div style={{ fontSize: 10, color: '#8a8aaa', textTransform: 'uppercase', letterSpacing: 1 }}>Nước</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>{formatVND(summary!.matchPayment!.drinkCost)}</div>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#8a8aaa', textTransform: 'uppercase', letterSpacing: 1 }}>Sân/người</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#2e7d32' }}>{formatVND(summary!.fieldPerPerson)}</div>
          </div>
        </div>

        {/* Main content: 2 columns on desktop, stacked on mobile */}
        <div style={mainGridStyle}>
          {/* Left: Player list by team */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {teams.map(team => {
              const teamPlayers = playerPayments.filter(p => p.teamName === team.name);
              if (teamPlayers.length === 0) return null;

              const isLosing = losingTeams.some(lt => lt.teamName === team.name);
              const losingInfo = losingTeams.find(lt => lt.teamName === team.name);

              return (
                <div key={team.name} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex',
                    alignItems: 'center', gap: 6,
                    color: isLosing ? '#c62828' : '#2e7d32',
                  }}>
                    {team.name === 'HOME' ? '⚪ ' : team.name === 'AWAY' ? '⚫ ' : '🟠 '}
                    {team.name}
                    {isLosing ? (
                      <span style={{ fontSize: 11, color: '#e65100' }}>
                        — Nước {losingInfo?.drinkPercent}%
                      </span>
                    ) : (
                      <span style={{ fontSize: 11 }}>— Thắng 🏆</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {teamPlayers.map(pp => {
                      const isSelected = selectedIds.has(pp.id);
                      return (
                        <div
                          key={pp.id}
                          onClick={() => !pp.isPaid && toggleSelect(pp.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 14px', borderRadius: 12,
                            background: pp.isPaid
                              ? 'rgba(46,125,50,0.06)'
                              : isSelected
                                ? 'rgba(229,57,53,0.06)'
                                : '#fff',
                            border: `1.5px solid ${pp.isPaid
                              ? 'rgba(46,125,50,0.2)'
                              : isSelected
                                ? 'rgba(229,57,53,0.25)'
                                : 'rgba(0,0,0,0.08)'}`,
                            cursor: pp.isPaid ? 'default' : 'pointer',
                            transition: 'all 0.15s',
                            opacity: pp.isPaid ? 0.65 : 1,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Checkbox */}
                            <div style={{
                              width: 22, height: 22, borderRadius: 6,
                              border: `2px solid ${pp.isPaid ? '#2e7d32' : isSelected ? '#e53935' : '#ccc'}`,
                              background: pp.isPaid ? '#2e7d32' : isSelected ? '#e53935' : 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, color: 'white', fontWeight: 700,
                              transition: 'all 0.15s', flexShrink: 0,
                            }}>
                              {(pp.isPaid || isSelected) && '✓'}
                            </div>

                            <div>
                              <div style={{
                                fontSize: 14, fontWeight: 600,
                                color: pp.isPaid ? '#2e7d32' : '#1a1a2e',
                                textDecoration: pp.isPaid ? 'line-through' : 'none',
                              }}>
                                {pp.playerName}
                              </div>
                              {pp.isPaid && (
                                <div style={{ fontSize: 10, color: '#2e7d32', marginTop: 2 }}>
                                  ✅ Đã thanh toán
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              fontSize: 14, fontWeight: 700,
                              color: pp.isPaid ? '#2e7d32' : '#c62828',
                            }}>
                              {formatVND(pp.totalAmount)}
                            </div>
                            <div style={{ fontSize: 10, color: '#8a8aaa' }}>
                              Sân {formatVND(pp.fieldAmount)}
                              {pp.drinkAmount > 0 && ` + Nước ${formatVND(pp.drinkAmount)}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Invoice */}
          {selectedPlayers.length > 0 && (
            <div style={invoiceCardStyle}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>
                🧾 Hoá đơn ({selectedPlayers.length} người)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {selectedPlayers.map(pp => (
                  <div key={pp.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 13, color: '#4a4a6a',
                  }}>
                    <span>{pp.playerName}</span>
                    <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{formatVND(pp.totalAmount)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 12, marginBottom: 12 }}>
                {invoiceField > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8a8aaa', marginBottom: 4 }}>
                    <span>Tiền sân</span>
                    <span>{formatVND(invoiceField)}</span>
                  </div>
                )}
                {invoiceDrink > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8a8aaa', marginBottom: 4 }}>
                    <span>Tiền nước</span>
                    <span>{formatVND(invoiceDrink)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginTop: 8,
                }}>
                  <span>Tổng cộng</span>
                  <span style={{ color: '#c62828' }}>{formatVND(invoiceTotal)}</span>
                </div>
              </div>

              <button
                style={{ ...payBtnStyle, opacity: paying ? 0.6 : 1 }}
                disabled={paying}
                onClick={async () => {
                  setPaying(true);
                  try {
                    const res = await fetch('/api/payment/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ playerPaymentIds: Array.from(selectedIds) }),
                    });
                    const data = await res.json();
                    if (data.checkoutUrl) {
                      window.location.href = data.checkoutUrl;
                    } else {
                      toast.error('Lỗi tạo link thanh toán: ' + (data.error || 'Unknown error'));
                      setPaying(false);
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error('Lỗi kết nối. Vui lòng thử lại.');
                    setPaying(false);
                  }
                }}
              >
                {paying ? '⏳ Đang tạo link...' : `💳 Thanh toán ${formatVND(invoiceTotal)}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========== STYLES - LIGHT THEME ========== */

const rootStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#faf5f5',
  fontFamily: "'Outfit', sans-serif",
  color: '#1a1a2e',
};

const containerStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: '0 auto',
  padding: '16px 20px 80px',
};

const backLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  color: '#8a8aaa',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 16,
  padding: '6px 0',
};

const heroCardStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '48px 24px',
  background: 'white',
  borderRadius: 20,
  border: '1px solid rgba(198,40,40,0.1)',
  boxShadow: '0 2px 12px rgba(198,40,40,0.05)',
};

const infoCardStyle: React.CSSProperties = {
  marginTop: 16,
  padding: '16px 20px',
  background: 'white',
  borderRadius: 14,
  border: '1px solid rgba(198,40,40,0.1)',
  boxShadow: '0 2px 8px rgba(198,40,40,0.04)',
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between',
  padding: '8px 0', fontSize: 13,
  color: '#6a6a8a',
  borderBottom: '1px solid rgba(0,0,0,0.04)',
};

const summaryBarStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 20px', borderRadius: 14, marginBottom: 20,
  background: 'white',
  border: '1px solid rgba(198,40,40,0.1)',
  boxShadow: '0 2px 8px rgba(198,40,40,0.04)',
};

const mainGridStyle: React.CSSProperties = {
  display: 'flex', gap: 20, alignItems: 'flex-start',
  flexWrap: 'wrap',
};

const invoiceCardStyle: React.CSSProperties = {
  width: 280,
  padding: '20px',
  background: 'white',
  borderRadius: 16,
  border: '1px solid rgba(198,40,40,0.1)',
  boxShadow: '0 4px 16px rgba(198,40,40,0.08)',
  position: 'sticky',
  top: 20,
  flexShrink: 0,
};

const payBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #e53935, #ef5350)',
  color: 'white',
  fontSize: 15,
  fontWeight: 700,
  fontFamily: "'Outfit', sans-serif",
  cursor: 'pointer',
  transition: 'all 0.2s',
  boxShadow: '0 4px 16px rgba(229,57,53,0.3)',
};
