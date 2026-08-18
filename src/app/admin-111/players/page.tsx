'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { PlayerConfig } from '@/types/player';

interface PlayerWithStats extends PlayerConfig {
  wins: number;
  losses: number;
  draws: number;
}

interface StatsSummary {
  playerName: string;
  playerId: string | null;
  wins: number;
  losses: number;
  draws: number;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalData, setModalData] = useState({
    id: '',
    name: '',
    subNames: '',
    telegramHandle: '',
    jerseyNumber: '',
    isInjuryProne: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPlayers = useCallback(async () => {
    try {
      const [playersRes, statsRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/stats'),
      ]);
      const playersData: PlayerConfig[] = await playersRes.json();
      const statsData: { players: StatsSummary[] } = await statsRes.json();

      const statsMap = new Map<string, StatsSummary>();
      for (const s of statsData.players) {
        if (s.playerId) statsMap.set(s.playerId, s);
      }

      const merged: PlayerWithStats[] = playersData.map((p) => {
        const stat = statsMap.get(p.id);
        return {
          ...p,
          wins: stat?.wins ?? 0,
          losses: stat?.losses ?? 0,
          draws: stat?.draws ?? 0,
        };
      });

      setPlayers(merged);
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setModalMode('add');
    setModalData({ id: '', name: '', subNames: '', telegramHandle: '', jerseyNumber: '', isInjuryProne: false });
    setSelectedFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (player: PlayerConfig) => {
    setModalMode('edit');
    setModalData({
      id: player.id,
      name: player.name,
      subNames: (player.subNames || []).join(', '),
      telegramHandle: player.telegramHandle || '',
      jerseyNumber: player.jerseyNumber != null ? String(player.jerseyNumber) : '',
      isInjuryProne: Boolean(player.isInjuryProne),
    });

    const filename = player.jerseyNumber != null ? player.jerseyNumber : player.id;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const versionParam = player.updatedAt
      ? `?v=${new Date(player.updatedAt).getTime()}`
      : player.avatarVersion
      ? `?v=${player.avatarVersion}`
      : '';

    const currentUrl = supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/players/${filename}.webp${versionParam}`
      : `/player/${filename}.webp${versionParam}`;

    setSelectedFile(null);
    setImagePreview(currentUrl);
    setIsModalOpen(true);
  };

  // Handle Image File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chọn file hình ảnh!');
        return;
      }
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  // Helper to upload image to Supabase Storage via API route
  const uploadAvatarToSupabase = async (jerseyNum: number | null, playerId: string, file: File): Promise<{ success: boolean; avatarUrl?: string }> => {
    try {
      const filename = jerseyNum != null ? `${jerseyNum}` : playerId;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', filename);

      const res = await fetch('/api/players/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        console.error('Upload avatar API error:', json.error);
        toast.error('Lỗi upload ảnh: ' + (json.error || 'Thất bại'));
        return { success: false };
      }
      return { success: true, avatarUrl: json.avatarUrl };
    } catch (err: any) {
      console.error('Upload exception:', err);
      toast.error('Lỗi khi tải ảnh lên server');
      return { success: false };
    }
  };

  // Save Modal Form (Add or Edit)
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalData.name.trim()) {
      toast.error('Vui lòng nhập tên cầu thủ');
      return;
    }

    setSaving(true);
    try {
      const jerseyNum = modalData.jerseyNumber ? parseInt(modalData.jerseyNumber) : null;
      const subNamesArray = modalData.subNames.split(',').map(s => s.trim()).filter(Boolean);

      if (modalMode === 'add') {
        // 1. Add player record first
        const res = await fetch('/api/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: modalData.name,
            subNames: subNamesArray,
            telegramHandle: modalData.telegramHandle,
            jerseyNumber: jerseyNum,
            isInjuryProne: modalData.isInjuryProne,
          }),
        });

        if (!res.ok) {
          toast.error('Thêm cầu thủ thất bại');
          return;
        }

        const createdPlayer: PlayerConfig = await res.json();

        // 2. Upload image if selected
        if (selectedFile && createdPlayer) {
          const uploadRes = await uploadAvatarToSupabase(jerseyNum, createdPlayer.id, selectedFile);
          if (uploadRes.success) {
            // Touch avatarVersion and avatarUrl in DB
            await fetch('/api/players', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: createdPlayer.id,
                avatarVersion: Date.now(),
                avatarUrl: uploadRes.avatarUrl,
              }),
            });
          }
        }

        toast.success('Đã thêm cầu thủ mới!');
      } else {
        // Edit Mode
        const id = modalData.id;
        let avatarVer: number | undefined = undefined;
        let uploadedAvatarUrl: string | undefined = undefined;

        // Upload new image if selected
        if (selectedFile) {
          const uploadRes = await uploadAvatarToSupabase(jerseyNum, id, selectedFile);
          if (uploadRes.success) {
            avatarVer = Date.now();
            uploadedAvatarUrl = uploadRes.avatarUrl;
          }
        }

        const updatePayload: Record<string, unknown> = {
          id,
          name: modalData.name,
          subNames: subNamesArray,
          telegramHandle: modalData.telegramHandle,
          jerseyNumber: jerseyNum,
          isInjuryProne: modalData.isInjuryProne,
        };

        if (avatarVer) {
          updatePayload.avatarVersion = avatarVer;
        }
        if (uploadedAvatarUrl) {
          updatePayload.avatarUrl = uploadedAvatarUrl;
        }

        const res = await fetch('/api/players', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });

        if (res.ok) {
          toast.success('Đã cập nhật cầu thủ!');
        } else {
          toast.error('Cập nhật cầu thủ thất bại');
        }
      }

      setIsModalOpen(false);
      await fetchPlayers();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu thông tin cầu thủ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xoá cầu thủ này?')) return;
    try {
      const res = await fetch(`/api/players?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Đã xóa cầu thủ');
        await fetchPlayers();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleRefreshAvatar = async (id: string) => {
    try {
      const res = await fetch('/api/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          avatarVersion: Date.now(),
        }),
      });
      if (res.ok) {
        toast.success('Đã làm mới cache ảnh!');
        await fetchPlayers();
      } else {
        toast.error('Không thể làm mới ảnh');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi làm mới ảnh');
    }
  };

  const filteredPlayers = players
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(q);
      const subMatch = (p.subNames || []).some((s) => s.toLowerCase().includes(q));
      const teleMatch = (p.telegramHandle || '').toLowerCase().includes(q);
      const jerseyMatch = p.jerseyNumber != null && String(p.jerseyNumber).includes(q);
      return nameMatch || subMatch || teleMatch || jerseyMatch;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));

  return (
    <>
      {/* Top Header Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px 24px',
        border: '1px solid rgba(198,40,40,0.1)',
        boxShadow: '0 2px 10px rgba(198,40,40,0.05)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>
            Quản lý cầu thủ ({filteredPlayers.length})
          </h1>
          <p style={{ fontSize: '13px', color: '#6a6a8a', margin: '4px 0 0 0' }}>
            Quản lý danh sách, chỉ số và hình ảnh đại diện cầu thủ trên Supabase
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '220px' }}>
            <input
              type="text"
              placeholder="Tìm tên, số áo, tele..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                borderRadius: '10px',
                border: '1px solid rgba(198,40,40,0.2)',
                fontSize: '13px',
                outline: 'none',
                background: '#fffafa',
              }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '13px' }}>
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#999' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Open Add Player Modal Button */}
          <button
            onClick={handleOpenAddModal}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #e53935, #ef5350)',
              color: 'white',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(229,57,53,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>➕</span> Thêm cầu thủ
          </button>
        </div>
      </div>
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#8a8aaa', background: 'white', borderRadius: '16px', marginTop: '16px' }}>
          Đang tải danh sách cầu thủ...
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#8a8aaa', background: 'white', borderRadius: '16px', marginTop: '16px' }}>
          <p style={{ fontSize: '15px', fontWeight: 600 }}>Không tìm thấy cầu thủ nào</p>
          {searchQuery && <p style={{ fontSize: '13px', marginTop: '4px' }}>Thử tìm kiếm từ khoá khác</p>}
        </div>
      ) : (
        /* VERTICAL CARD GRID VIEW MODE */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '18px',
          marginTop: '16px',
        }}>
          {filteredPlayers.map((player) => {
            const totalMatches = player.wins + player.draws + player.losses;
            const winRate = totalMatches > 0 ? Math.round((player.wins / totalMatches) * 100) : 0;

            return (
              <div key={player.id} style={{
                background: 'white',
                borderRadius: '18px',
                padding: '20px 16px 16px 16px',
                border: '1px solid rgba(198,40,40,0.12)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                transition: 'transform 0.2s ease, boxShadow 0.2s ease',
                position: 'relative',
              }}>
                {/* Winrate Pill Top Right */}
                {winRate > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: winRate >= 50 ? '#2e7d32' : winRate >= 30 ? '#e65100' : '#c62828',
                    background: winRate >= 50 ? 'rgba(46,125,50,0.1)' : winRate >= 30 ? 'rgba(230,81,0,0.1)' : 'rgba(198,40,40,0.1)',
                    padding: '3px 8px',
                    borderRadius: '8px',
                  }}>
                    {winRate}% WR
                  </span>
                )}

                {/* Vertical Center Info */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
                  <PlayerVerticalAvatar player={player} size={84} />

                  <div style={{ width: '100%', marginTop: '4px' }}>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span>{player.name}</span>
                      {player.isInjuryProne && (
                        <span
                          title="Cầu thủ hay chấn thương (Injury Prone)"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.8)',
                            boxShadow: '0 2px 5px rgba(220, 38, 38, 0.4)',
                            flexShrink: 0,
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff">
                            <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
                          </svg>
                        </span>
                      )}
                    </div>

                    {player.telegramHandle ? (
                      <div style={{ marginTop: '3px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 9px',
                          borderRadius: '6px',
                          background: 'rgba(25,118,210,0.08)',
                          color: '#1565c0',
                          fontSize: '11.5px',
                          fontWeight: 600,
                        }}>
                          {player.telegramHandle}
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#b0b0c0', marginTop: '3px', fontStyle: 'italic' }}>Chưa link Telegram</div>
                    )}

                    {player.subNames.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
                        {player.subNames.map((sub, i) => (
                          <span key={i} style={{
                            padding: '2px 7px',
                            borderRadius: '5px',
                            background: 'rgba(198,40,40,0.06)',
                            color: '#c62828',
                            fontSize: '11px',
                            fontWeight: 500,
                          }}>
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Bar */}
                <div style={{
                  width: '100%',
                  background: '#fafafa',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  border: '1px solid rgba(0,0,0,0.04)',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#6a6a8a', fontWeight: 700, textTransform: 'uppercase' }}>W</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#2e7d32' }}>{player.wins}</div>
                  </div>
                  <div style={{ height: '16px', width: '1px', background: '#e0e0e0' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#6a6a8a', fontWeight: 700, textTransform: 'uppercase' }}>D</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#6a6a8a' }}>{player.draws}</div>
                  </div>
                  <div style={{ height: '16px', width: '1px', background: '#e0e0e0' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#6a6a8a', fontWeight: 700, textTransform: 'uppercase' }}>L</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#c62828' }}>{player.losses}</div>
                  </div>
                </div>

                {/* Actions Row */}
                <div style={{ display: 'flex', gap: '6px', width: '100%', justifyContent: 'center' }}>
                  <button
                    style={{ flex: 1, padding: '6px', borderRadius: '8px', border: 'none', background: 'rgba(76,175,80,0.08)', color: '#2e7d32', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => handleRefreshAvatar(player.id)}
                    title="Xóa cache & load lại ảnh mới"
                  >
                    🔄 Ảnh
                  </button>
                  <button
                    style={{ flex: 1, padding: '6px', borderRadius: '8px', border: 'none', background: '#e3f2fd', color: '#1565c0', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => handleOpenEditModal(player)}
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    style={{ flex: 1, padding: '6px', borderRadius: '8px', border: 'none', background: '#fce4ec', color: '#c62828', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => handleDelete(player.id)}
                  >
                    🗑️ Xoá
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT PLAYER MODAL POPUP */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              background: 'linear-gradient(135deg, #e53935, #c62828)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                {modalMode === 'add' ? '➕ Thêm cầu thủ mới' : '✏️ Chỉnh sửa cầu thủ'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveModal} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Avatar Upload Area */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'relative',
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    border: '2px dashed #e53935',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: '#fcfcfc',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                  }}
                  title="Bấm để chọn/thay đổi ảnh avatar"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'scale-down' }}
                      onError={() => setImagePreview(null)}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#e53935', fontSize: '11px', fontWeight: 700 }}>
                      <div style={{ fontSize: '22px' }}>📷</div>
                      Chọn ảnh
                    </div>
                  )}

                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 700,
                    textAlign: 'center',
                    padding: '2px 0',
                  }}>
                    ĐỔI ÁNH
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                <span style={{ fontSize: '11px', color: '#6a6a8a' }}>
                  Ảnh sẽ tự động upload & lưu trên Supabase Storage
                </span>
              </div>

              {/* Form Inputs */}
              <div>
                <label style={labelStyle}>Tên cầu thủ *</label>
                <input
                  style={inputStyle}
                  placeholder="Ví dụ: Nguyễn Văn Khánh"
                  value={modalData.name}
                  onChange={(e) => setModalData(d => ({ ...d, name: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Số áo</label>
                  <input
                    type="number"
                    style={{ ...inputStyle, textAlign: 'center' }}
                    placeholder="VD: 10"
                    value={modalData.jerseyNumber}
                    onChange={(e) => setModalData(d => ({ ...d, jerseyNumber: e.target.value }))}
                  />
                </div>
                <div style={{ flex: 1.5 }}>
                  <label style={labelStyle}>Telegram Handle</label>
                  <input
                    style={inputStyle}
                    placeholder="VD: @username"
                    value={modalData.telegramHandle}
                    onChange={(e) => setModalData(d => ({ ...d, telegramHandle: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Biệt danh / Tên phụ (phân cách bởi dấu phẩy)</label>
                <input
                  style={inputStyle}
                  placeholder="VD: Khanh, aKai, Khanh3"
                  value={modalData.subNames}
                  onChange={(e) => setModalData(d => ({ ...d, subNames: e.target.value }))}
                />
              </div>

              <div style={{ marginTop: '4px', paddingTop: '4px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, color: '#c62828' }}>
                  <input
                    type="checkbox"
                    checked={modalData.isInjuryProne}
                    onChange={(e) => setModalData(d => ({ ...d, isInjuryProne: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#c62828', cursor: 'pointer' }}
                  />
                  <span>🩹 Cầu thủ hay chấn thương (Injury Prone)</span>
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #ddd',
                    background: '#f5f5f5',
                    color: '#444',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={saving || !modalData.name.trim()}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #e53935, #c62828)',
                    color: 'white',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    boxShadow: '0 4px 12px rgba(229,57,53,0.3)',
                  }}
                >
                  {saving ? '⏳ Đang lưu...' : modalMode === 'add' ? 'Thêm cầu thủ' : 'Cập nhật cầu thủ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Vertical Player Avatar Helper Component (Handles Fallbacks Smoothly)
function PlayerVerticalAvatar({ player, size = 84 }: { player: PlayerConfig; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const [cacheBuster, setCacheBuster] = useState(() => Date.now());
  const filename = player?.jerseyNumber != null ? player.jerseyNumber : (player?.id || 'unknown');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  useEffect(() => {
    setImgError(false);
    setCacheBuster(Date.now());
  }, [player?.avatarVersion, player?.avatarUrl, player?.updatedAt, player?.jerseyNumber, player?.id]);

  const versionParam = player?.updatedAt
    ? `?v=${new Date(player.updatedAt).getTime()}`
    : player?.avatarVersion
    ? `?v=${player.avatarVersion}`
    : `?v=${cacheBuster}`;

  const rawImgSrc = player?.avatarUrl
    ? player.avatarUrl
    : supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/players/${filename}.webp`
    : `/player/${filename}.webp`;

  const imgSrc = rawImgSrc.startsWith('data:')
    ? rawImgSrc
    : rawImgSrc.includes('?')
    ? `${rawImgSrc}&t=${cacheBuster}`
    : `${rawImgSrc}${versionParam}`;

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, margin: '0 auto', flexShrink: 0 }}>
      {imgError ? (
        <div style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: player.jerseyNumber != null
            ? 'linear-gradient(135deg, #e53935, #c62828)'
            : 'linear-gradient(135deg, #546e7a, #37474f)',
          color: 'white',
          fontWeight: 800,
          fontSize: `${Math.round(size * 0.36)}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {player.jerseyNumber != null ? `#${player.jerseyNumber}` : player.name.charAt(0).toUpperCase()}
        </div>
      ) : (
        <img
          key={imgSrc}
          src={imgSrc}
          alt={player.name}
          onError={() => setImgError(true)}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            objectFit: 'scale-down',
            border: '3px solid white',
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
            background: '#f5f5f5',
          }}
        />
      )}

      {player.jerseyNumber != null && (
        <span style={{
          position: 'absolute',
          bottom: '0px',
          right: '0px',
          background: 'linear-gradient(135deg, #e53935, #b71c1c)',
          color: 'white',
          fontWeight: 800,
          fontSize: '11px',
          padding: '2px 7px',
          borderRadius: '12px',
          border: '2px solid white',
          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        }}>
          #{player.jerseyNumber}
        </span>
      )}
    </div>
  );
}

/* ========== STYLES ========== */

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: '#4a4a6a',
  display: 'block', marginBottom: '4px', textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1.5px solid rgba(198,40,40,0.15)', background: '#fffafa',
  fontSize: '14px', fontFamily: 'Chiron GoRound TC, sans-serif', outline: 'none',
  color: '#1a1a2e', transition: 'border-color 0.2s',
};

const btnBase: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', border: 'none',
  fontSize: '13px', fontWeight: 600, fontFamily: 'Chiron GoRound TC, sans-serif',
  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
};

const btnEdit: React.CSSProperties = {
  ...btnBase, background: '#e3f2fd', color: '#1565c0',
};

const btnDelete: React.CSSProperties = {
  ...btnBase, background: '#fce4ec', color: '#c62828',
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

const statBadgeBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: '26px', height: '22px', borderRadius: '6px',
  fontSize: '12px', fontWeight: 800, padding: '0 5px',
};

const statBadgeW: React.CSSProperties = {
  ...statBadgeBase, background: 'rgba(46,125,50,0.1)', color: '#2e7d32',
};

const statBadgeL: React.CSSProperties = {
  ...statBadgeBase, background: 'rgba(198,40,40,0.1)', color: '#c62828',
};

const statBadgeD: React.CSSProperties = {
  ...statBadgeBase, background: 'rgba(100,100,120,0.1)', color: '#6a6a8a',
};
