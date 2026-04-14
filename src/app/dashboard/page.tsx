import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import RefreshButton from "./RefreshButton";

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

  // Fetch latest user data
  const { data: user } = await supabase
    .from("accounts")
    .select("balance, player_id")
    .eq("id", session.id)
    .single();

  const balance = user?.balance || 0;

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
    <div style={{ minHeight: '100vh', padding: '0 20px 20px', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        

        {/* Balance Card using the signature field style */}
        <div className="field-header" style={{ padding: '40px 24px', borderRadius: '24px', marginBottom: 0, boxShadow: '0 8px 32px rgba(198,40,40,0.15)' }}>
          <div className="field-corner-tl"></div><div className="field-corner-tr"></div>
          <div className="field-corner-bl"></div><div className="field-corner-br"></div>
          
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.9, marginBottom: '12px', color: 'white' }}>Số Dư Hiện Tại</h2>
            <div style={{ fontSize: '48px', fontWeight: 900, textShadow: '0 4px 16px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
              {balance.toLocaleString()} ⚽
            </div>
            <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.15)', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, color: 'white', backdropFilter: 'blur(4px)' }}>
              1,000 VNĐ = 1,000 Bóng
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px', width: '100%', justifyContent: 'center' }}>
              <Link href="/dashboard/deposit" style={{ background: 'white', color: 'var(--accent)', fontWeight: 800, padding: '14px 24px', borderRadius: '12px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'all 0.2s ease' }}>
                Thêm Bóng
              </Link>
              <Link href="/" style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', color: 'white', fontWeight: 700, padding: '14px 24px', borderRadius: '12px', textDecoration: 'none', transition: 'all 0.2s ease', border: '1px solid rgba(255,255,255,0.1)' }}>
                Trang Chủ
              </Link>
            </div>
          </div>
        </div>
        
        {/* History */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              Lịch sử giao dịch ⏳
            </h3>
            <RefreshButton />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(!transactions || transactions.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📝</div>
                Chưa có giao dịch nào.
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-subtle)', transition: 'background 0.2s ease' }} className="hover:bg-[var(--player-hover-bg)]">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: tx.amount > 0 ? 'var(--field-accent-light)' : 'var(--text-secondary)', background: tx.amount > 0 ? 'rgba(229,57,53,0.1)' : 'var(--bg-secondary)' }}>
                      {tx.amount > 0 ? "+" : "-"}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
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
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(tx.created_at).toLocaleString("vi-VN")}</p>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '16px', color: tx.amount > 0 ? 'var(--field-accent-light)' : 'var(--text-primary)' }}>
                    {tx.amount > 0 ? "+" : ""}{(tx.amount || 0).toLocaleString('en-US')} ⚽
                  </div>
                </div>
              ))
            )}
          </div>
          
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
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
  );
}
