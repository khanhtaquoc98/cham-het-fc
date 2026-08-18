"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { UserCheck, Upload, RefreshCw, Shield, Sparkles } from 'lucide-react';

interface PlayerInfo {
  id: string;
  name: string;
  jersey_number?: number | null;
  is_injury_prone?: boolean | null;
  avatar_version?: string | number | null;
  telegram_handle?: string | null;
}

export default function PlayerAvatarSection({ player }: { player: PlayerInfo }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [version, setVersion] = useState<number>(() => Date.now());

  const filename = player.jersey_number != null ? player.jersey_number : player.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udlhudfxwuwbecjqvvhv.supabase.co';
  const avatarUrl = `${supabaseUrl}/storage/v1/object/public/players/${filename}.webp?v=${version}`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tập tin hình ảnh (PNG, JPG, WEBP)');
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dung lượng hình ảnh phải nhỏ hơn 5MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', `${filename}.webp`);
      formData.append('playerId', player.id);

      const res = await fetch('/api/players/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVersion(Date.now());
        toast.success('Đã cập nhật Avatar cầu thủ thành công!', { icon: '✨' });
        router.refresh();
      } else {
        toast.error(data.error || 'Tải ảnh lên thất bại');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Không thể kết nối máy chủ');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-card" style={{
      padding: '24px',
      borderRadius: '20px',
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
      border: '1px solid #cbd5e1',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <UserCheck size={20} style={{ color: '#dc2626' }} />
          Hồ Sơ Cầu Thủ Đã Liên Kết
        </h3>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={12} /> Đã kết nối
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Avatar Image Circle */}
        <div style={{
          position: 'relative',
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          padding: '3px',
          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
          flexShrink: 0
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#0f172a', position: 'relative' }}>
            <img
              src={avatarUrl}
              alt={player.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                // Fallback default placeholder
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f172a&color=ffffff&bold=true`;
              }}
            />
          </div>
        </div>

        {/* Player Meta Details */}
        <div style={{ flex: 1, minWidth: '160px' }}>
          <h4 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {player.name}
          </h4>
          {player.jersey_number != null && (
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} style={{ color: '#dc2626' }} />
              Áo số #{player.jersey_number}
            </div>
          )}
          {player.is_injury_prone && (
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#c62828',
              background: '#ffebee',
              border: '1px solid rgba(198,40,40,0.3)',
              padding: '2px 8px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              marginTop: '4px'
            }}>
              🩹 Dễ chấn thương
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div>
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: uploading ? '#94a3b8' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            color: '#ffffff',
            padding: '9px 16px',
            borderRadius: '10px',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: uploading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
            transition: 'all 0.15s ease'
          }}>
            {uploading ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                Đang tải lên...
              </>
            ) : (
              <>
                <Upload size={15} />
                Đổi Avatar Cầu Thủ
              </>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
