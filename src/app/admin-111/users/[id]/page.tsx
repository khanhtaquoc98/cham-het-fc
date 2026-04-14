"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  created_at: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const accountId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [amountInput, setAmountInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, isAdding: boolean, amount: number} | null>(null);

  const fetchDetails = async () => {
    try {
      // Tạm mượn '/api/admin/users' để lấy info user, sau này tách riêng API get 1 user
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        const foundUser = data.accounts.find((a: any) => a.id === accountId);
        setUser(foundUser);
      }

      const resHistory = await fetch(`/api/admin/users/history?accountId=${accountId}`);
      const dataHistory = await resHistory.json();
      if (resHistory.ok) {
        setHistory(dataHistory.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) fetchDetails();
  }, [accountId]);

  const requestManualAdd = (isAdding: boolean) => {
    const amount = parseInt(amountInput);
    if (!amount || amount <= 0) return;
    setConfirmModal({ isOpen: true, isAdding, amount });
  };

  const executeManualAdd = async () => {
    if (!confirmModal) return;
    const { isAdding, amount } = confirmModal;
    const finalAmount = isAdding ? amount : -amount;
    const actionText = isAdding ? 'cộng' : 'trừ';

    try {
      const res = await fetch("/api/admin/users/add-balance", {
        method: "POST",
        body: JSON.stringify({ accountId, amount: finalAmount }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        toast.success(`Đã ${actionText} Bóng thành công!`);
        setAmountInput("");
        fetchDetails();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || `Gặp lỗi khi ${actionText} Bóng`);
      }
    } catch (err) {
      toast.error("Lỗi mạng");
    } finally {
      setConfirmModal(null);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải thông tin chi tiết...</div>;
  if (!user) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy User</div>;

  return (
    <div style={{ padding: '0 0 24px', color: 'var(--text-primary)', fontFamily: 'var(--font-sans, "Chiron GoRound TC", sans-serif)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Link href="/admin-111/users" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '8px 16px', borderRadius: '12px', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 800 }}>← Quay lại</Link>
        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--accent)' }}>Chi Tiết Tài Khoản</h1>
      </div>

      <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Username</p>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.username}
              {user.role === 'admin' && <span style={{ fontSize: '10px', background: 'var(--field-accent-light)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>ADMIN</span>}
            </div>
            <p style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: '8px' }}>ID: {user.id}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Số dư hiện tại</p>
            <p style={{ fontSize: '32px', fontWeight: 900, color: 'var(--accent)', margin: 0 }}>{user.balance.toLocaleString()} ⚽</p>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>Thêm/Trừ Bóng Thủ Công</h2>
        <div style={{ display: 'flex', gap: '8px', maxWidth: '400px' }}>
          <input 
            type="number" 
            placeholder="Số Bóng (vd: 50000)" 
            value={amountInput}
            onChange={e => setAmountInput(e.target.value.replace(/-/g, ''))} // Prevent negative sign typed locally
            style={{
              background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', padding: '12px 16px',
              borderRadius: '12px', outline: 'none', color: 'var(--text-primary)', width: '100%',
              fontFamily: 'inherit', fontSize: '15px'
            }}
          />
          <button 
            onClick={() => requestManualAdd(true)}
            style={{
              background: 'linear-gradient(135deg, var(--field-accent-dark), var(--field-accent-light))',
              color: 'white', border: 'none', padding: '0 16px', borderRadius: '12px',
              fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap'
            }}
          >
            + Thêm
          </button>
          <button 
            onClick={() => requestManualAdd(false)}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '0 16px', borderRadius: '12px',
              fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap'
            }}
          >
            - Trừ
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>Lịch Sử Giao Dịch</h2>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Chưa có giao dịch nào.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: tx.amount > 0 ? "var(--field-accent-light)" : "var(--text-secondary)", background: tx.amount > 0 ? "rgba(244,67,54,0.1)" : "var(--bg-secondary)" }}>
                    {tx.amount > 0 ? "+" : "-"}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>{tx.type === "deposit" ? "Thêm Bóng" : (tx.type === "payment" ? "Thanh toán" : "Khác")}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: tx.amount > 0 ? "var(--field-accent-light)" : "var(--text-primary)" }}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount} ⚽
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmModal && confirmModal.isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div className="glass-card" style={{
            background: 'var(--bg-primary)', borderRadius: '24px', padding: '32px',
            width: '100%', maxWidth: '400px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            border: '1px solid var(--border-subtle)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {confirmModal.isAdding ? '🚀' : '⚠️'}
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '12px', color: 'var(--text-primary)' }}>
              Xác Nhận {confirmModal.isAdding ? 'Thêm' : 'Trừ'} Bóng
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
              Bạn chuẩn bị <strong>{confirmModal.isAdding ? 'cộng' : 'trừ'} {confirmModal.amount.toLocaleString()} ⚽</strong> 
              cho tài khoản <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{user?.username}</span>. Hành động này sẽ được lưu vào lịch sử.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setConfirmModal(null)}
                style={{
                  flex: 1, padding: '16px', borderRadius: '12px', fontWeight: 800,
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', cursor: 'pointer'
                }}>
                Thôi
              </button>
              <button 
                onClick={executeManualAdd}
                style={{
                  flex: 2, padding: '16px', borderRadius: '12px', fontWeight: 800,
                  background: confirmModal.isAdding ? 'var(--field-accent-light)' : '#d32f2f',
                  color: 'white', border: 'none', cursor: 'pointer'
                }}>
                {confirmModal.isAdding ? '+ Xác Nhận Thêm' : '- Xác Nhận Trừ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
