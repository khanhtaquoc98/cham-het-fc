'use client';

import React, { useState, useEffect } from 'react';
import { SavedTactic, PitchType, UserRole } from './types';
import { TacticPlayerModal } from './TacticPlayerModal';
import { Play, Plus, Trash2, Search, Calendar, Layers, Shield, Eye, RefreshCw, Sparkles, LayoutGrid, Edit3 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TacticsListProps {
  role: UserRole;
  onCreateNewTactic: () => void;
  onEditTactic?: (tactic: SavedTactic) => void;
}

export const TacticsList: React.FC<TacticsListProps> = ({
  role,
  onCreateNewTactic,
  onEditTactic,
}) => {
  const isHlv = role === 'hlv';

  const [tactics, setTactics] = useState<SavedTactic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPitch, setFilterPitch] = useState<PitchType | 'all'>('all');

  // Selected tactic for playback modal
  const [selectedTactic, setSelectedTactic] = useState<SavedTactic | null>(null);

  // Fetch tactics from API
  const fetchTactics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tactical-board/tactics', { cache: 'no-store' });
      const data = await res.json();
      if (data && Array.isArray(data.tactics)) {
        setTactics(data.tactics);
      }
    } catch (err) {
      console.error('Failed to load tactics list:', err);
      toast.error('Không thể tải danh sách chiến thuật.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTactics();
  }, []);

  // Delete tactic handler
  const handleDeleteTactic = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Bạn có chắc chắn muốn xóa chiến thuật "${name}"?`)) return;

    try {
      const res = await fetch(`/api/tactical-board/tactics?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Đã xóa chiến thuật "${name}".`);
        setTactics(data.tactics || []);
      } else {
        toast.error('Không thể xóa chiến thuật.');
      }
    } catch (err) {
      console.error('Error deleting tactic:', err);
      toast.error('Lỗi kết nối khi xóa.');
    }
  };

  // Filter tactics
  const filteredTactics = tactics.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPitch = filterPitch === 'all' || t.pitchType === filterPitch;
    return matchesSearch && matchesPitch;
  });

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#f8fafc',
      padding: '16px 20px',
      boxSizing: 'border-box',
      overflowY: 'auto',
    }}>
      {/* Top Header & Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LayoutGrid size={24} style={{ color: '#ef4444' }} /> DANH SÁCH CHIẾN THUẬT
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
            Quản lý và xem lại hình ảnh chuyển động mô phỏng chiến thuật của đội bóng
          </p>
        </div>

        {/* Create Tactic Button (for HLV) */}
        {isHlv && (
          <button
            onClick={onCreateNewTactic}
            style={{
              padding: '12px 22px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <Plus size={18} /> Tạo chiến thuật mới
          </button>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '14px 18px',
        marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Search Input */}
        <div style={{
          position: 'relative',
          flex: '1 1 260px',
          maxWidth: '400px',
        }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm chiến thuật theo tên..."
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              boxSizing: 'border-box',
              background: '#f8fafc',
            }}
          />
        </div>

        {/* Filter Pitch Size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>LỌC SÂN:</span>
          {(['all', 5, 7, 11] as const).map((p) => (
            <button
              key={String(p)}
              onClick={() => setFilterPitch(p)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: filterPitch === p ? '2px solid #ef4444' : '1px solid #cbd5e1',
                background: filterPitch === p ? '#ef4444' : '#ffffff',
                color: filterPitch === p ? '#ffffff' : '#334155',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {p === 'all' ? 'Tất cả' : `Sân ${p}`}
            </button>
          ))}

          <button
            onClick={fetchTactics}
            title="Tải lại danh sách"
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid of Tactics Cards */}
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          color: '#64748b',
          fontWeight: 700,
        }}>
          <RefreshCw size={24} className="animate-spin" style={{ color: '#ef4444', marginRight: '10px' }} />
          Đang tải danh sách chiến thuật...
        </div>
      ) : filteredTactics.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '48px 24px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          margin: 'auto 0',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#fff1f2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}>
            <Layers size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            Chưa có chiến thuật nào
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
            {isHlv ? 'Nhấn nút "Tạo chiến thuật mới" để bắt đầu thiết lập các bước chiến thuật!' : 'HLV chưa tạo chiến thuật nào.'}
          </p>
          {isHlv && (
            <button
              onClick={onCreateNewTactic}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={16} /> Tạo chiến thuật ngay
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {filteredTactics.map((tactic) => {
            const stepCount = tactic.steps ? tactic.steps.length : 0;
            const createdDateStr = tactic.createdAt
              ? new Date(tactic.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : 'Gần đây';

            return (
              <div
                key={tactic.id}
                onClick={() => setSelectedTactic(tactic)}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '18px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                {/* Pitch Preview Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: '6px',
                      letterSpacing: '0.3px',
                    }}>
                      SÂN {tactic.pitchType}
                    </span>

                    <span style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <Layers size={12} /> {stepCount} Step{stepCount > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '16px',
                    fontWeight: 900,
                    color: '#0f172a',
                    lineHeight: 1.3,
                  }}>
                    {tactic.name}
                  </h3>

                  {/* Date */}
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
                    <Calendar size={12} /> Ngày tạo: {createdDateStr}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                  marginTop: '12px',
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTactic(tactic);
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
                    }}
                  >
                    <Play size={14} style={{ color: '#ef4444' }} /> Play Xem Replay
                  </button>

                  {/* Action Buttons (HLV: Edit & Delete) */}
                  {isHlv && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {onEditTactic && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTactic(tactic);
                          }}
                          title="Chỉnh sửa chiến thuật"
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#2563eb',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                        >
                          <Edit3 size={15} />
                        </button>
                      )}

                      <button
                        onClick={(e) => handleDeleteTactic(tactic.id, tactic.name, e)}
                        title="Xóa chiến thuật này"
                        style={{
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          color: '#be123c',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Playback Modal */}
      {selectedTactic && (
        <TacticPlayerModal
          tactic={selectedTactic}
          role={role}
          onClose={() => setSelectedTactic(null)}
        />
      )}
    </div>
  );
};
