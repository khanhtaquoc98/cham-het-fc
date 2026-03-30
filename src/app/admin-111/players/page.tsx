'use client';

import { useEffect, useState, useCallback } from 'react';

interface PlayerConfig {
  id: string;
  name: string;
  subNames: string[];
  telegramHandle: string;
  jerseyNumber: number | null;
}

type EditingPlayer = {
  id: string;
  name: string;
  subNames: string;
  telegramHandle: string;
  jerseyNumber: string;
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlayer, setNewPlayer] = useState({ name: '', subNames: '', telegramHandle: '', jerseyNumber: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingPlayer | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch('/api/players');
      const data = await res.json();
      setPlayers(data);
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleAdd = async () => {
    if (!newPlayer.name) return;
    setSaving(true);
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlayer.name,
          subNames: newPlayer.subNames.split(',').map(s => s.trim()).filter(Boolean),
          telegramHandle: newPlayer.telegramHandle,
          jerseyNumber: newPlayer.jerseyNumber ? parseInt(newPlayer.jerseyNumber) : null,
        }),
      });
      if (res.ok) {
        setNewPlayer({ name: '', subNames: '', telegramHandle: '', jerseyNumber: '' });
        await fetchPlayers();
      }
    } finally { setSaving(false); }
  };

  const startEdit = (player: PlayerConfig) => {
    setEditingId(player.id);
    setEditForm({
      id: player.id,
      name: player.name,
      subNames: player.subNames.join(', '),
      telegramHandle: player.telegramHandle || '',
      jerseyNumber: player.jerseyNumber != null ? String(player.jerseyNumber) : '',
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const handleUpdate = async () => {
    if (!editForm) return;
    setSaving(true);
    try {
      const res = await fetch('/api/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editForm.id,
          name: editForm.name,
          subNames: editForm.subNames.split(',').map(s => s.trim()).filter(Boolean),
          telegramHandle: editForm.telegramHandle,
          jerseyNumber: editForm.jerseyNumber ? parseInt(editForm.jerseyNumber) : null,
        }),
      });
      if (res.ok) { setEditingId(null); setEditForm(null); await fetchPlayers(); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xoá cầu thủ này?')) return;
    try {
      const res = await fetch(`/api/players?id=${id}`, { method: 'DELETE' });
      if (res.ok) await fetchPlayers();
    } catch (err) { console.error('Delete failed:', err); }
  };

  return (
    <>
      {/* Add Player */}
      <div style={cardStyle}>
        <h2 style={{ ...sectionTitleStyle, marginBottom: '14px' }}>Thêm cầu thủ mới</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 150px' }}>
            <label style={labelStyle}>Tên cầu thủ</label>
            <input style={inputStyle} placeholder="Nguyễn Văn A" value={newPlayer.name}
              onChange={e => setNewPlayer(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
          <div style={{ flex: '1.5 1 200px' }}>
            <label style={labelStyle}>Biệt danh (phẩy phân cách)</label>
            <input style={inputStyle} placeholder="Khanh, aKai, Khanh3" value={newPlayer.subNames}
              onChange={e => setNewPlayer(p => ({ ...p, subNames: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Telegram</label>
            <input style={inputStyle} placeholder="@username" value={newPlayer.telegramHandle}
              onChange={e => setNewPlayer(p => ({ ...p, telegramHandle: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
          <div style={{ flex: '0 0 80px' }}>
            <label style={labelStyle}>Số áo</label>
            <input style={{ ...inputStyle, textAlign: 'center' }} type="number" placeholder="10"
              value={newPlayer.jerseyNumber}
              onChange={e => setNewPlayer(p => ({ ...p, jerseyNumber: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
          <button
            style={{
              ...btnPrimary,
              opacity: !newPlayer.name ? 0.5 : 1,
              cursor: !newPlayer.name ? 'not-allowed' : 'pointer',
            }}
            onClick={handleAdd}
            disabled={saving || !newPlayer.name}
          >
            {saving ? '...' : 'Thêm'}
          </button>
        </div>
      </div>

      {/* Players Table */}
      <div style={{
        background: 'white', borderRadius: '14px', overflow: 'hidden',
        border: '1px solid rgba(198,40,40,0.1)',
        boxShadow: '0 2px 8px rgba(198,40,40,0.05)',
        marginTop: '16px',
      }}>
        <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(198,40,40,0.08)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
            Danh sách cầu thủ ({players.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8a8aaa' }}>Đang tải...</div>
        ) : players.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#8a8aaa' }}>
            <p style={{ fontSize: '15px' }}>Chưa có cầu thủ nào</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Thêm cầu thủ đầu tiên ở form bên trên</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(198,40,40,0.03)' }}>
                <th style={{ ...thStyle, width: '40px' }}>#</th>
                <th style={{ ...thStyle, width: '60px' }}>Số áo</th>
                <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '16px' }}>Tên</th>
                <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '16px' }}>Biệt danh</th>
                <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '16px' }}>Telegram</th>
                <th style={{ ...thStyle, width: '110px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, idx) => (
                <tr key={player.id} style={{ borderBottom: '1px solid rgba(198,40,40,0.05)' }}>
                  {editingId === player.id && editForm ? (
                    <>
                      <td style={tdCenter}>{idx + 1}</td>
                      <td style={tdCenter}>
                        <input style={{ ...inputCompact, width: '56px', textAlign: 'center' }} type="number"
                          value={editForm.jerseyNumber}
                          onChange={e => setEditForm({ ...editForm, jerseyNumber: e.target.value })} />
                      </td>
                      <td style={tdLeft}>
                        <input style={{ ...inputCompact, width: '100%' }} value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                      </td>
                      <td style={tdLeft}>
                        <input style={{ ...inputCompact, width: '100%' }} value={editForm.subNames}
                          onChange={e => setEditForm({ ...editForm, subNames: e.target.value })} />
                      </td>
                      <td style={tdLeft}>
                        <input style={{ ...inputCompact, width: '100%' }} value={editForm.telegramHandle}
                          onChange={e => setEditForm({ ...editForm, telegramHandle: e.target.value })} placeholder="@username" />
                      </td>
                      <td style={tdCenter}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button style={btnSave} onClick={handleUpdate}>Lưu</button>
                          <button style={btnCancel} onClick={cancelEdit}>Huỷ</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={tdCenter}>
                        <span style={{ color: '#8a8aaa', fontSize: '13px' }}>{idx + 1}</span>
                      </td>
                      <td style={tdCenter}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: player.jerseyNumber != null
                            ? 'linear-gradient(135deg, #e53935, #ef5350)'
                            : 'linear-gradient(135deg, #9e9e9e, #bdbdbd)',
                          color: 'white', fontWeight: 800, fontSize: '14px',
                        }}>
                          {player.jerseyNumber != null ? player.jerseyNumber : '?'}
                        </span>
                      </td>
                      <td style={{ ...tdLeft, fontWeight: 600, color: '#1a1a2e' }}>{player.name}</td>
                      <td style={tdLeft}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {player.subNames.map((sub, i) => (
                            <span key={i} style={{
                              padding: '3px 10px', borderRadius: '6px',
                              background: 'rgba(198,40,40,0.08)', color: '#c62828',
                              fontSize: '12px', fontWeight: 500,
                            }}>
                              {sub}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={tdLeft}>
                        {player.telegramHandle && (
                          <span style={{
                            padding: '3px 10px', borderRadius: '6px',
                            background: 'rgba(25,118,210,0.08)', color: '#1565c0',
                            fontSize: '12px', fontWeight: 500,
                          }}>
                            {player.telegramHandle}
                          </span>
                        )}
                      </td>
                      <td style={tdCenter}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button style={btnEdit} onClick={() => startEdit(player)}>Sửa</button>
                          <button style={btnDelete} onClick={() => handleDelete(player.id)}>Xoá</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
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
  fontSize: '14px', fontFamily: 'Outfit, sans-serif', outline: 'none',
  color: '#1a1a2e', transition: 'border-color 0.2s',
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

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  padding: '10px 24px', borderRadius: '10px',
  background: 'linear-gradient(135deg, #e53935, #ef5350)',
  color: 'white', fontSize: '14px',
};

const btnEdit: React.CSSProperties = {
  ...btnBase, background: '#e3f2fd', color: '#1565c0',
};

const btnDelete: React.CSSProperties = {
  ...btnBase, background: '#fce4ec', color: '#c62828',
};

const btnSave: React.CSSProperties = {
  ...btnBase, background: '#ffebee', color: '#c62828',
};

const btnCancel: React.CSSProperties = {
  ...btnBase, background: '#f5f5f5', color: '#616161',
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
