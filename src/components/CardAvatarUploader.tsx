'use client';

import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, ExternalLink, Sparkles, CheckCircle2, RotateCcw, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { DEFAULT_PLAYER_AVATAR } from '@/lib/fut-card-config';

export interface CardAvatarUploaderProps {
  currentAvatarUrl?: string | null;
  playerName?: string;
  playerId?: string | null;
  jerseyNumber?: number | string | null;
  onAvatarUploaded: (newAvatarUrl: string) => void;
  onResetDefault?: () => void;
}

export default function CardAvatarUploader({
  currentAvatarUrl,
  playerName = 'Cầu thủ',
  playerId,
  jerseyNumber,
  onAvatarUploaded,
  onResetDefault,
}: CardAvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDefaultAvatar =
    !currentAvatarUrl ||
    currentAvatarUrl === DEFAULT_PLAYER_AVATAR ||
    currentAvatarUrl.includes('unknown.webp');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset file input value so user can re-select same file if needed
    e.target.value = '';

    if (!file) return;

    // Strict PNG-only validation
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    if (!isPng) {
      toast.error('Chỉ chấp nhận định dạng ảnh PNG! Vui lòng tách nền tại remove.bg để có ảnh PNG trong suốt.', {
        duration: 5000,
        icon: '⚠️',
      });
      return;
    }

    // Size limit: 8MB
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Dung lượng ảnh phải nhỏ hơn 8MB', { duration: 4000 });
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Đang tải ảnh PNG lên Supabase...');

    try {
      // Create unique filename based on jerseyNumber or playerId with timestamp to bust cache
      const rawBase = jerseyNumber != null ? `${jerseyNumber}` : (playerId || 'card_avatar');
      const uniqueFilename = `${rawBase}_${Date.now()}.png`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', uniqueFilename);
      formData.append('onlyPng', 'true');
      if (playerId) {
        formData.append('playerId', playerId);
      }

      const res = await fetch('/api/players/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.avatarUrl) {
        toast.success('Đã tải ảnh PNG lên Supabase & gắn vào thẻ thành công!', {
          id: toastId,
          icon: '✨',
        });
        onAvatarUploaded(data.avatarUrl);
      } else {
        toast.error(data.error || 'Tải ảnh lên Supabase thất bại', { id: toastId });
      }
    } catch (err: unknown) {
      console.error('Upload error:', err);
      toast.error('Không thể kết nối máy chủ để tải ảnh', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: '#ffffff',
        borderRadius: '14px',
        padding: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}
    >
      {/* ── 1. HƯỚNG DẪN TÁCH NỀN QUA REMOVE.BG ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          borderRadius: '12px',
          padding: '12px 14px',
          border: '1px solid #a7f3d0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px' }}>✂️</span>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#065f46' }}>
              HƯỚNG DẪN TÁCH NỀN ẢNH ĐỂ LÊN THẺ ĐẸP NHẤT
            </span>
          </div>
          <a
            href="https://www.remove.bg/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#059669',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 2px 5px rgba(5, 150, 105, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Mở remove.bg (Miễn phí)</span>
            <ExternalLink size={11} />
          </a>
        </div>

        <div style={{ fontSize: '11.5px', color: '#047857', lineHeight: '1.5' }}>
          <div>
            • <strong>Bước 1:</strong> Bấm nút <strong>Mở remove.bg</strong> ở trên rồi tải ảnh chân dung của bạn lên để tách nền tự động.
          </div>
          <div>
            • <strong>Bước 2:</strong> Bấm <strong>Download</strong> để lưu ảnh kết quả về máy ở định dạng <strong>PNG</strong> (ảnh trong suốt).
          </div>
          <div>
            • <strong>Bước 3:</strong> Bấm nút <strong>Tải Lên Ảnh Avatar (PNG)</strong> bên dưới để đưa ảnh lên Supabase và gắn vào thẻ.
          </div>
        </div>
      </div>

      {/* ── 2. UPLOAD BUTTON & CURRENT STATUS ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          paddingTop: '2px',
        }}
      >
        {/* Avatar Mini Preview & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#0f172a',
              border: isDefaultAvatar ? '1px dashed #cbd5e1' : '2px solid #10b981',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt={playerName}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <ImageIcon size={20} color="#94a3b8" />
            )}
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>
              {isDefaultAvatar ? 'Đang dùng Avatar mặc định' : 'Đã có Avatar riêng (PNG)'}
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
              Yêu cầu định dạng: <strong>.PNG</strong> (tối đa 8MB)
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Reset to Default Button (if not already default) */}
          {!isDefaultAvatar && onResetDefault && (
            <button
              type="button"
              onClick={onResetDefault}
              disabled={isUploading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 10px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Đặt lại về ảnh đại diện mặc định"
            >
              <RotateCcw size={12} />
              Dùng avatar mặc định
            </button>
          )}

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: isUploading
                ? '#94a3b8'
                : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800,
              cursor: isUploading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <Upload size={13} />
            {isUploading ? 'Đang tải lên Supabase...' : 'Tải Lên Ảnh Avatar (PNG)'}
          </button>
        </div>
      </div>
    </div>
  );
}
