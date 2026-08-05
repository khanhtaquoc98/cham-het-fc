'use client';

import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { UserRole } from './types';

interface LoginModalProps {
  isDisabledByAdmin?: boolean;
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isDisabledByAdmin, onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tactical-board/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        onLoginSuccess(data.role as UserRole);
      } else {
        setError(data.error || 'Mật khẩu không chính xác');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Không thể kết nối đến hệ thống');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(15, 15, 20, 0.82)',
      backdropFilter: 'blur(12px)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3), 0 0 0 1px rgba(229, 57, 53, 0.2)',
        overflow: 'hidden',
        animation: 'tacticalModalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #111827 0%, #1f2937 60%, #e53935 100%)',
          padding: '28px 24px',
          color: 'white',
          textAlign: 'center',
          position: 'relative',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
          }}>
            <Lock size={26} style={{ color: '#ffffff' }} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>
            Bảng Chiến Thuật Realtime
          </h2>
          <p style={{ fontSize: '13px', opacity: 0.85, marginTop: '6px', margin: 0 }}>
            Vui lòng nhập mật khẩu để truy cập hệ thống
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {isDisabledByAdmin ? (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '14px',
              padding: '16px',
              textAlign: 'center',
              color: '#991b1b',
            }}>
              <ShieldAlert size={36} style={{ margin: '0 auto 8px', color: '#ef4444' }} />
              <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>
                Trang đang tạm khóa
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                Admin hiện đang tắt truy cập trang Bảng chiến thuật. Vui lòng liên hệ Admin để được mở lại.
              </div>

              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: '#111827',
                  color: 'white',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <ArrowLeft size={16} /> Trang chủ
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  Mật khẩu truy cập
                </label>

                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                  }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu (HLV / Cầu thủ)..."
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '12px',
                      border: error ? '2px solid #ef4444' : '1px solid #d1d5db',
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border 0.2s',
                    }}
                  />
                </div>

                {error && (
                  <div style={{
                    color: '#ef4444',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginTop: '6px',
                  }}>
                    ⚠️ {error}
                  </div>
                )}
              </div>

              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '12px',
                color: '#64748b',
                marginBottom: '20px',
                lineHeight: 1.4,
              }}>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: '2px' }}>💡 Phân quyền đăng nhập:</div>
                <div>• Mật khẩu HLV: Quyền kéo thả cầu thủ, chọn sân & vẽ chiến thuật live.</div>
                <div>• Mật khẩu Player: Quyền xem live chiến thuật real-time.</div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #e53935 0%, #b71c1c 100%)',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(229, 57, 53, 0.35)',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? 'Đang xác thực...' : 'Đăng Nhập Tactical Board'}
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes tacticalModalIn {
          from { opacity: 0; transform: scale(0.94) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};
