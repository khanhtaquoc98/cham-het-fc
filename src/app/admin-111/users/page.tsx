"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

interface Account {
  id: string;
  username: string;
  balance: number;
  player_id: string | null;
  role: string;
}

interface Player {
  id: string;
  name: string;
}

export default function UsersAdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, accountId: string | null}>({isOpen: false, accountId: null});
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{isOpen: boolean, accountId: string | null, username: string}>({isOpen: false, accountId: null, username: ""});
  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts || []);
        setPlayers(data.players || []);
        
        // Cập nhật lại drafts theo dữ liệu mới nhất
        const newDrafts: Record<string, string> = {};
        (data.accounts || []).forEach((acc: Account) => {
          newDrafts[acc.id] = acc.player_id || "";
        });
        setDrafts(newDrafts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const confirmLink = (accountId: string) => {
    setConfirmModal({ isOpen: true, accountId });
  };

  const handleLink = async () => {
    if (!confirmModal.accountId) return;
    const accountId = confirmModal.accountId;
    const playerId = drafts[accountId];
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ accountId, playerId }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        toast.success("Cập nhật liên kết thành công!");
        fetchData();
        setConfirmModal({ isOpen: false, accountId: null });
      } else {
        toast.error("Lỗi khi cập nhật");
      }
    } catch (err) {
      toast.error("Lỗi mạng");
    }
  };

  const handleDeleteClick = (accountId: string, username: string) => {
    setDeleteConfirmModal({ isOpen: true, accountId, username });
  };

  const executeDelete = async () => {
    if (!deleteConfirmModal.accountId) return;
    
    try {
      const res = await fetch(`/api/admin/users?id=${deleteConfirmModal.accountId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Xóa user thành công!");
        fetchData();
        setDeleteConfirmModal({ isOpen: false, accountId: null, username: "" });
      } else {
        toast.error("Lỗi khi xóa user");
      }
    } catch {
      toast.error("Lỗi mạng");
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải danh sách user...</div>;

  return (
    <div style={{ padding: '24px', background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', fontFamily: 'var(--font-sans, "Chiron GoRound TC", sans-serif)' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '24px', color: 'var(--accent)' }}>Quản Lý User & Player</h1>
      
      <div className="glass-card" style={{ overflowX: 'auto', borderRadius: '16px' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
            <tr>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Username</th>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Số Bóng</th>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Liên Kết Player</th>
              <th style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s ease' }} className="hover:bg-[var(--player-hover-bg)]">
                <td style={{ padding: '16px', fontWeight: 600 }}>
                  {acc.username} 
                  {acc.role === 'admin' && <span style={{ fontSize: '10px', background: 'var(--field-accent-light)', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 800 }}>ADMIN</span>}
                </td>
                <td style={{ padding: '16px', fontWeight: 800, color: 'var(--accent)' }}>
                  {acc.balance.toLocaleString()} ⚽
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', maxWidth: '300px' }}>
                    <select 
                      style={{
                        background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', padding: '8px 12px',
                        borderRadius: '8px', outline: 'none', color: 'var(--text-primary)', flex: 1,
                        fontFamily: 'inherit', fontSize: '14px'
                      }}
                      value={drafts[acc.id] !== undefined ? drafts[acc.id] : (acc.player_id || "")}
                      onChange={(e) => setDrafts(prev => ({ ...prev, [acc.id]: e.target.value }))}
                    >
                      <option value="">-- Chưa liên kết --</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => confirmLink(acc.id)}
                      style={{
                        background: 'linear-gradient(135deg, var(--field-accent-dark), var(--field-accent-light))',
                        color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
                      }}
                    >
                      Lưu
                    </button>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link 
                      href={`/admin-111/users/${acc.id}`}
                      style={{
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)',
                        padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
                        textDecoration: 'none', display: 'inline-block'
                      }}
                    >
                      Chi Tiết
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(acc.id, acc.username)}
                      style={{
                        background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2',
                        padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
                      }}
                    >
                      Xoá
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '90%', background: 'var(--bg-primary)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>Xác nhận liên kết</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Bạn có chắc chắn muốn lưu liên kết này không? Thao tác này sẽ cập nhật dữ liệu của người dùng.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setConfirmModal({ isOpen: false, accountId: null })}
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button 
                onClick={handleLink}
                style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'var(--bg-primary, #fff)', borderRadius: '16px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle, #eee)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#c62828' }}>⚠️ Xác nhận Xoá User</h3>
            </div>
            <div style={{ padding: '20px', fontSize: '14px', color: '#4a4a6a', lineHeight: '1.5' }}>
              Bạn có chắc chắn muốn xóa user <b style={{color: '#c62828'}}>&quot;{deleteConfirmModal.username}&quot;</b> không? Toàn bộ dữ liệu của user này sẽ bị xóa hằng ngày.
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle, #eee)', display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setDeleteConfirmModal({ isOpen: false, accountId: null, username: "" })}
                style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#4a4a6a' }}
              >
                Hủy
              </button>
              <button 
                onClick={executeDelete}
                style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #e53935, #ef5350)', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: 'white' }}
              >
                Chắc chắn xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
