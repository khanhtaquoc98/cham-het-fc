import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import RefreshButton from "./RefreshButton";
import SuccessToast from "./SuccessToast";
import TelegramLinkSection from "@/components/TelegramLinkSection";

import UserProfileSection from "@/components/UserProfileSection";
import { getPlayerMatchHistory } from "@/lib/history";

export default async function DashboardPage(props: { searchParams?: Promise<{ status?: string, cancel?: string, orderCode?: string, page?: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const urlStatus = searchParams?.status;
  const isCancelled = urlStatus === "cancel" || urlStatus === "CANCELLED" || searchParams?.cancel === "true";

  if (isCancelled) {
    if (searchParams?.orderCode) {
      // Find the exact transaction by matching orderCode inside the JSON note.
      const { data: allPending } = await supabase
        .from("transactions")
        .select("id, note, status")
        .eq("account_id", session.id)
        .in("status", ["pending", "cancelled"]);
        
      if (allPending) {
        const target = allPending.find(tx => {
          try {
            if (!tx.note) return false;
            const parsed = JSON.parse(tx.note);
            return String(parsed.orderCode) === String(searchParams.orderCode);
          } catch {
            return false;
          }
        });
        
        if (target && target.status === "pending") {
          await supabase.from("transactions").update({ status: "cancelled" }).eq("id", target.id);
        }
      }
    } else {
      // Fallback
      const { data: pendingTxs } = await supabase
        .from("transactions")
        .select("id")
        .eq("account_id", session.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);

      if (pendingTxs && pendingTxs.length > 0) {
        await supabase.from("transactions").update({ status: "cancelled" }).eq("id", pendingTxs[0].id);
      }
    }
    
    // Redirect to clean the URL
    redirect("/dashboard");
  }

  // Xử lý khi user quay về từ PayOS/KOS thành công
  const isSuccess = urlStatus === "success" || urlStatus === "completed" || urlStatus === "PAID" || urlStatus === "SUCCESS" || urlStatus === "COMPLETED";
  let depositConfirmed = false;
  if (isSuccess && searchParams?.orderCode) {
    // Kiểm tra xem webhook đã xử lý xong chưa
    const { data: allTxs } = await supabase
      .from("transactions")
      .select("id, note, status, amount, account_id")
      .eq("account_id", session.id)
      .eq("type", "deposit");
      
    if (allTxs) {
      const target = allTxs.find(tx => {
        try {
          if (!tx.note) return false;
          const parsed = JSON.parse(tx.note);
          return String(parsed.orderCode) === String(searchParams.orderCode);
        } catch {
          return false;
        }
      });
      
      if (target && target.status === "pending") {
        const { checkKosPayment } = await import("@/lib/kos");
        const kosStatus = await checkKosPayment(String(searchParams.orderCode));
        if (kosStatus && (kosStatus.status === "completed" || kosStatus.status === "success")) {
          await supabase.from("transactions").update({ status: "success" }).eq("id", target.id);
          const { data: acc } = await supabase.from("accounts").select("balance").eq("id", session.id).single();
          if (acc) {
            await supabase.from("accounts").update({ balance: (acc.balance || 0) + target.amount }).eq("id", session.id);
          }
          depositConfirmed = true;
        }
      } else if (target && target.status === "success") {
        depositConfirmed = true;
      }
    }
  }

  // Auto-reconcile any pending deposit transactions for this user
  const { reconcileAccountPendingDeposits } = await import("@/lib/deposit");
  await reconcileAccountPendingDeposits(session.id);

  // Fetch latest user data
  const { data: user } = await supabase
    .from("accounts")
    .select("balance, player_id, telegram_id")
    .eq("id", session.id)
    .single();

  if (!user) {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    redirect("/login?force=1");
  }

  const balance = user.balance || 0;

  // Fetch linked player info if user has player_id
  let linkedPlayer = null;
  if (user?.player_id) {
    const { data: p } = await supabase
      .from("players")
      .select("id, name, jersey_number, avatar_version, telegram_handle")
      .eq("id", user.player_id)
      .single();
    if (p) {
      linkedPlayer = p;
    }
  }

  // Fetch 5 recent matches for the linked player
  let playerRecentMatches: Array<{
    id: string;
    matchHistoryId: string;
    matchDate?: string | null;
    matchTime?: string | null;
    teamName?: string | null;
    result?: string | null;
    homeScore?: number | null;
    awayScore?: number | null;
  }> = [];

  if (user?.player_id) {
    const { data: pStats } = await supabase
      .from('player_stats')
      .select('id, match_history_id, team_name, result, created_at, match_history(id, match_date, match_time, home_score, away_score, result)')
      .eq('player_id', user.player_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (pStats && pStats.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      playerRecentMatches = pStats.map((s: any) => ({
        id: s.id,
        matchHistoryId: s.match_history_id || s.match_history?.id || s.id,
        matchDate: s.match_history?.match_date,
        matchTime: s.match_history?.match_time,
        teamName: s.team_name,
        result: s.result,
        homeScore: s.match_history?.home_score,
        awayScore: s.match_history?.away_score,
      }));
    } else if (linkedPlayer?.name) {
      const { data: pStatsByName } = await supabase
        .from('player_stats')
        .select('id, match_history_id, team_name, result, created_at, match_history(id, match_date, match_time, home_score, away_score, result)')
        .ilike('player_name', linkedPlayer.name)
        .order('created_at', { ascending: false })
        .limit(5);

      if (pStatsByName && pStatsByName.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        playerRecentMatches = pStatsByName.map((s: any) => ({
          id: s.id,
          matchHistoryId: s.match_history_id || s.match_history?.id || s.id,
          matchDate: s.match_history?.match_date,
          matchTime: s.match_history?.match_time,
          teamName: s.team_name,
          result: s.result,
          homeScore: s.match_history?.home_score,
          awayScore: s.match_history?.away_score,
        }));
      } else {
        const fallbackHistory = await getPlayerMatchHistory(linkedPlayer.name, 1, 5);
        playerRecentMatches = fallbackHistory.matches.map((m) => ({
          id: m.id,
          matchHistoryId: m.matchHistoryId,
          matchDate: m.matchHistory?.matchDate,
          matchTime: m.matchHistory?.matchTime,
          teamName: m.teamName,
          result: m.result,
          homeScore: m.matchHistory?.homeScore,
          awayScore: m.matchHistory?.awayScore,
        }));
      }
    }
  }

  // Fetch transaction history
  const page = Math.max(1, parseInt(searchParams?.page || "1", 10));
  const limit = 5;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data: transactionsData, count } = await supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("account_id", session.id)
    .order("created_at", { ascending: false })
    .range(start, end);
    
  const totalPages = Math.ceil((count || 0) / limit);

  // Auto clean-up: if any transaction is "pending" and older than 15 mins, mark as cancelled
  const transactions = transactionsData || [];
  const now = new Date().getTime();
  for (const tx of transactions) {
    if (tx.status === "pending") {
      const txTime = new Date(tx.created_at).getTime();
      if (now - txTime > 15 * 60 * 1000) {
        tx.status = "cancelled";
        await supabase.from("transactions").update({ status: "cancelled" }).eq("id", tx.id);
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', padding: '16px 16px 32px', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {isSuccess && <SuccessToast confirmed={depositConfirmed} />}

        {/* Full-width 50/50 Responsive Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start">

          {/* Left Side (50%): Single Unified Profile Section (Avatar, Name, Jersey & Telegram) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            <UserProfileSection
              user={{
                id: session.id,
                username: session.username,
                telegram_id: user?.telegram_id || null
              }}
              linkedPlayer={linkedPlayer}
              recentMatches={playerRecentMatches}
            />
          </div>

          {/* Right Side (50%): Balance Card + Transaction History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            {/* Balance Card */}
            <div className="field-header" style={{
              padding: '32px 24px',
              borderRadius: '20px',
              marginBottom: 0,
              boxShadow: '0 8px 32px rgba(198,40,40,0.15)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div className="field-corner-tl"></div><div className="field-corner-tr"></div>
              <div className="field-corner-bl"></div><div className="field-corner-br"></div>
              
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.9, marginBottom: '10px', color: 'white' }}>SỐ DƯ HIỆN TẠI</h2>
                <div style={{ fontSize: '44px', fontWeight: 900, textShadow: '0 4px 16px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                  {balance.toLocaleString()} ⚽
                </div>
                <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.15)', padding: '5px 14px', borderRadius: '20px', fontSize: '12.5px', fontWeight: 600, color: 'white', backdropFilter: 'blur(4px)' }}>
                  1,000 VNĐ = 1,000 Bóng
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', width: '100%', justifyContent: 'center' }}>
                  <Link href="/dashboard/deposit" style={{ background: 'white', color: 'var(--accent)', fontWeight: 800, padding: '12px 24px', borderRadius: '12px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'all 0.2s ease', textAlign: 'center', flex: 1, maxWidth: '160px' }}>
                    Thêm Bóng
                  </Link>
                  <Link href="/" style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', color: 'white', fontWeight: 700, padding: '12px 24px', borderRadius: '12px', textDecoration: 'none', transition: 'all 0.2s ease', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', flex: 1, maxWidth: '160px' }}>
                    Trang Chủ
                  </Link>
                </div>
              </div>
            </div>

            {/* Transaction History Card */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    Lịch sử giao dịch ⏳
                  </h3>
                  <RefreshButton />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(!transactions || transactions.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                      <div style={{ fontSize: '36px', marginBottom: '8px', opacity: 0.5 }}>📝</div>
                      Chưa có giao dịch nào.
                    </div>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-subtle)', transition: 'background 0.2s ease' }} className="hover:bg-[var(--player-hover-bg)]">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: tx.amount > 0 ? 'var(--field-accent-light)' : 'var(--text-secondary)', background: tx.amount > 0 ? 'rgba(229,57,53,0.1)' : 'var(--bg-secondary)', flexShrink: 0 }}>
                            {tx.amount > 0 ? "+" : "-"}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', margin: 0 }}>
                                {tx.type === "deposit" ? "Thêm qua QR" : (tx.type === "payment" ? "Thanh toán trận đấu" : "Khác")}
                              </p>
                              <span style={{
                                fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                                background: tx.status === 'success' ? 'rgba(46,125,50,0.1)' : tx.status === 'pending' ? 'rgba(158,158,158,0.1)' : 'rgba(211,47,47,0.1)',
                                color: tx.status === 'success' ? '#2e7d32' : tx.status === 'pending' ? 'var(--text-muted)' : '#d32f2f'
                              }}>
                                {tx.status === 'success' ? 'Thành công' : tx.status === 'pending' ? 'Đang xử lý' : tx.status === 'cancelled' || tx.status === 'cancel' ? 'Đã hủy' : 'Thất bại'}
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{new Date(tx.created_at).toLocaleString("vi-VN")}</p>
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: tx.amount > 0 ? 'var(--field-accent-light)' : 'var(--text-primary)', flexShrink: 0, marginLeft: '12px' }}>
                          {tx.amount > 0 ? "+" : ""}{(tx.amount || 0).toLocaleString('en-US')} ⚽
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <Link 
                    href={page > 1 ? `/dashboard?page=${page - 1}` : '#'}
                    style={{ 
                      padding: '8px 16px', borderRadius: '8px', 
                      background: page > 1 ? 'var(--bg-secondary)' : 'transparent',
                      color: page > 1 ? 'var(--text-primary)' : 'var(--border-subtle)',
                      border: `1px solid ${page > 1 ? 'var(--border-subtle)' : 'transparent'}`,
                      textDecoration: 'none', fontWeight: 600, fontSize: '13px',
                      pointerEvents: page > 1 ? 'auto' : 'none', transition: 'all 0.2s ease'
                    }}
                  >
                    ← Trước
                  </Link>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px' }}>
                    TRANG {page} / {totalPages}
                  </span>
                  <Link 
                    href={page < totalPages ? `/dashboard?page=${page + 1}` : '#'}
                    style={{ 
                      padding: '8px 16px', borderRadius: '8px', 
                      background: page < totalPages ? 'var(--bg-secondary)' : 'transparent',
                      color: page < totalPages ? 'var(--text-primary)' : 'var(--border-subtle)',
                      border: `1px solid ${page < totalPages ? 'var(--border-subtle)' : 'transparent'}`,
                      textDecoration: 'none', fontWeight: 600, fontSize: '13px',
                      pointerEvents: page < totalPages ? 'auto' : 'none', transition: 'all 0.2s ease'
                    }}
                  >
                    Tiếp →
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
}
