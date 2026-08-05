'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Save, Power, Key, Trash2, ExternalLink, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AdminTacticalPage() {
  const [enabled, setEnabled] = useState(true);
  const [hlvPass, setHlvPass] = useState('coach');
  const [playerPass, setPlayerPass] = useState('chamhet');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tactical-board/admin', { cache: 'no-store' });
      const data = await res.json();
      setEnabled(data.enabled ?? true);
      setHlvPass(data.hlvPass || 'coach');
      setPlayerPass(data.playerPass || 'chamhet');
    } catch (err) {
      console.error('Failed to fetch tactical board admin config:', err);
      toast.error('Lỗi khi tải cấu hình bảng chiến thuật');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hlvPass.trim()) {
      toast.error('Mật khẩu HLV không được để trống');
      return;
    }
    if (!playerPass.trim()) {
      toast.error('Mật khẩu Player không được để trống');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/tactical-board/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          hlvPass: hlvPass.trim(),
          playerPass: playerPass.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(data.message || 'Đã lưu cấu hình thành công!');
      } else {
        toast.error(data.error || 'Không thể lưu cấu hình');
      }
    } catch (err) {
      console.error('Failed to save tactical board config:', err);
      toast.error('Có lỗi xảy ra khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleClearRealtimeData = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa TẤT CẢ dữ liệu chiến thuật realtime hiện có không?\n\nHành động này sẽ đặt lại bảng chiến thuật về trạng thái trống.')) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch('/api/tactical-board/admin', { method: 'DELETE' });
      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(data.message || 'Đã xóa toàn bộ dữ liệu chiến thuật realtime!');
      } else {
        toast.error(data.error || 'Lỗi khi xóa dữ liệu');
      }
    } catch (err) {
      console.error('Failed to clear realtime tactical data:', err);
      toast.error('Có lỗi xảy ra khi xóa dữ liệu');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <RefreshCw size={28} className="animate-spin" style={{ color: '#e53935' }} />
        <span style={{ marginLeft: '12px', fontWeight: 600, color: '#666' }}>Đang tải cấu hình...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Title section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a2e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck style={{ color: '#e53935' }} size={26} /> Quản lý Bảng chiến thuật (Tactical Board)
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '4px', margin: 0 }}>
            Cấu hình bật/tắt trang, mật khẩu HLV, mật khẩu Cầu thủ và xóa dữ liệu realtime.
          </p>
        </div>

        <Link
          href="/tactical-board"
          target="_blank"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#1a1a2e',
            color: 'white',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.2s ease',
          }}
        >
          <ExternalLink size={16} /> Mở Bảng Chiến Thuật
        </Link>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSave} style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.06)',
        marginBottom: '28px'
      }}>
        {/* Toggle On/Off */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: enabled ? '#f0fdf4' : '#fef2f2',
          borderRadius: '12px',
          border: `1px solid ${enabled ? '#bbf7d0' : '#fecaca'}`,
          marginBottom: '24px'
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: enabled ? '#15803d' : '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Power size={18} /> Trang Bảng chiến thuật đang: {enabled ? 'BẬT (Hoạt động)' : 'TẮT (Tạm khóa)'}
            </div>
            <div style={{ fontSize: '13px', color: enabled ? '#166534' : '#b91c1c', marginTop: '2px' }}>
              {enabled
                ? 'Người dùng và HLV có thể truy cập bằng link /tactical-board và nhập mật khẩu.'
                : 'Trang sẽ thông báo khóa tạm thời khi có người truy cập.'}
            </div>
          </div>

          <label style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: enabled ? '#22c55e' : '#cbd5e1',
              borderRadius: '34px',
              transition: '0.3s',
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '22px',
                width: '22px',
                left: enabled ? '28px' : '4px',
                bottom: '4px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: '0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </span>
          </label>
        </div>

        {/* Passwords Settings */}
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={18} style={{ color: '#e53935' }} /> Cấu hình Mật khẩu phân quyền
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* HLV Password */}
          <div style={{ background: '#fafafa', padding: '18px', borderRadius: '12px', border: '1px solid #eee' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#333', marginBottom: '6px' }}>
              Mật khẩu HLV (Huấn luyện viên)
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Có quyền điều chỉnh chiến thuật, chọn sân (5/7/11), sắp xếp đội hình, vẽ mũi tên và di chuyển cầu thủ/banh.
            </p>
            <input
              type="text"
              value={hlvPass}
              onChange={(e) => setHlvPass(e.target.value)}
              placeholder="coach"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                fontSize: '15px',
                fontWeight: 700,
                color: '#e53935',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <span style={{ fontSize: '11px', color: '#999', marginTop: '4px', display: 'block' }}>Mặc định: coach</span>
          </div>

          {/* Player Password */}
          <div style={{ background: '#fafafa', padding: '18px', borderRadius: '12px', border: '1px solid #eee' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#333', marginBottom: '6px' }}>
              Mật khẩu Cầu thủ (Player)
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Chỉ có quyền xem chiến thuật real-time được HLV thao tác trên màn hình.
            </p>
            <input
              type="text"
              value={playerPass}
              onChange={(e) => setPlayerPass(e.target.value)}
              placeholder="chamhet"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                fontSize: '15px',
                fontWeight: 700,
                color: '#1a1a2e',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <span style={{ fontSize: '11px', color: '#999', marginTop: '4px', display: 'block' }}>Mặc định: chamhet</span>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          style={{
            background: 'linear-gradient(135deg, #e53935, #b71c1c)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '15px',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(229, 57, 53, 0.35)',
            opacity: saving ? 0.7 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          <Save size={18} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </form>

      {/* Danger Zone: Clear Realtime Data */}
      <div style={{
        background: '#fff1f2',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #fecdd3',
        boxShadow: '0 4px 16px rgba(225, 29, 72, 0.05)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#be123c', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} /> Vùng nguy hiểm: Xóa dữ liệu Realtime
        </h3>
        <p style={{ fontSize: '13px', color: '#881337', marginBottom: '16px', lineHeight: 1.5 }}>
          Nút bấm bên dưới sẽ xóa sạch toàn bộ vị trí cầu thủ, mũi tên và vị trí bóng đang lưu trữ realtime. Bảng chiến thuật sẽ được đưa về trạng thái trống ban đầu cho tất cả mọi người.
        </p>

        <button
          type="button"
          onClick={handleClearRealtimeData}
          disabled={clearing}
          style={{
            background: '#e11d48',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '14px',
            cursor: clearing ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
            opacity: clearing ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          <Trash2 size={18} /> {clearing ? 'Đang xóa...' : 'Xóa hết tất cả dữ liệu riu time hiện có'}
        </button>
      </div>
    </div>
  );
}
