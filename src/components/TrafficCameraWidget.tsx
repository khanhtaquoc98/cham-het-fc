'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Camera, RefreshCw, Maximize2, X, ExternalLink, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface TrafficCameraWidgetProps {
  initialUrl?: string;
  autoRefreshIntervalSeconds?: number;
}

export default function TrafficCameraWidget({
  initialUrl,
  autoRefreshIntervalSeconds = 60,
}: TrafficCameraWidgetProps) {
  const [cameraUrl, setCameraUrl] = useState<string>(initialUrl || '');
  const [loadingConfig, setLoadingConfig] = useState<boolean>(!initialUrl);
  const [timestamp, setTimestamp] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [useProxy, setUseProxy] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(autoRefreshIntervalSeconds);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Camera URL config from API
  const fetchCameraConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch('/api/traffic-camera', { cache: 'no-store' });
      const data = await res.json();
      if (data && data.url) {
        setCameraUrl(data.url);
      } else {
        setCameraUrl('');
      }
    } catch (err) {
      console.error('Error fetching traffic camera URL:', err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    fetchCameraConfig();
  }, [fetchCameraConfig]);

  // Refresh image function
  const refreshImage = useCallback(() => {
    setIsRefreshing(true);
    setImgError(false);
    const now = Date.now();
    setTimestamp(now);
    setLastRefreshedAt(new Date(now));
    setCountdown(autoRefreshIntervalSeconds);
  }, [autoRefreshIntervalSeconds]);

  // Auto refresh interval (every 60 seconds)
  useEffect(() => {
    if (!cameraUrl) return;

    // Countdown tick every second
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshImage();
          return autoRefreshIntervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cameraUrl, autoRefreshIntervalSeconds, refreshImage]);

  if (loadingConfig) {
    return null;
  }

  if (!cameraUrl) {
    return null;
  }

  // Construct image source
  const getImgSrc = () => {
    if (useProxy) {
      return `/api/traffic-camera/proxy?url=${encodeURIComponent(cameraUrl)}&_t=${timestamp}`;
    }
    const separator = cameraUrl.includes('?') ? '&' : '?';
    return `${cameraUrl}${separator}_t=${timestamp}`;
  };

  const handleImageError = () => {
    if (!useProxy) {
      // If direct URL failed (e.g. CORS/HTTP port issue), automatically retry via server proxy
      console.warn('Direct camera image load failed, switching to backend proxy...');
      setUseProxy(true);
      setImgError(false);
    } else {
      setImgError(true);
      setIsRefreshing(false);
    }
  };

  const handleImageLoad = () => {
    setImgError(false);
    setIsRefreshing(false);
  };

  const formattedTime = lastRefreshedAt.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <>
      <div
        className="content-appear stagger-2"
        style={{
          marginTop: '24px',
          marginBottom: '24px',
          background: 'var(--bg-secondary, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle, rgba(198,40,40,0.12))',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(198,40,40,0.06), rgba(229,57,53,0.02))',
            borderBottom: '1px solid var(--border-subtle, rgba(198,40,40,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #e53935, #c62828)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(229,57,53,0.25)',
              }}
            >
              <Camera size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: 'var(--text-primary, #1a1a2e)',
                    margin: 0,
                    letterSpacing: '0.3px',
                  }}
                >
                  Camera Giao Thông Realtime
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#e53935',
                    background: 'rgba(229,57,53,0.1)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#e53935',
                      boxShadow: '0 0 8px #e53935',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                  LIVE (Refetch 1p/lần)
                </span>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted, #757575)',
                  margin: '2px 0 0 0',
                }}
              >
                Cập nhật lúc {formattedTime} • Tự làm mới sau{' '}
                <strong style={{ color: '#e53935' }}>{countdown}s</strong>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={refreshImage}
              disabled={isRefreshing}
              title="Làm mới ảnh ngay lập tức"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle, rgba(0,0,0,0.1))',
                background: 'var(--bg-primary, #ffffff)',
                color: 'var(--text-primary, #1a1a2e)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <RefreshCw
                size={14}
                style={{
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                }}
              />
              <span>{isRefreshing ? 'Đang tải...' : 'Làm mới'}</span>
            </button>

            <button
              onClick={() => setIsExpanded(true)}
              title="Xem mở rộng"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle, rgba(0,0,0,0.1))',
                background: 'var(--bg-primary, #ffffff)',
                color: 'var(--text-primary, #1a1a2e)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Maximize2 size={15} />
            </button>

            <a
              href={cameraUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở link gốc"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle, rgba(0,0,0,0.1))',
                background: 'var(--bg-primary, #ffffff)',
                color: 'var(--text-primary, #1a1a2e)',
                transition: 'all 0.2s ease',
              }}
            >
              <ExternalLink size={15} />
            </a>

            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              title={isCollapsed ? 'Mở rộng khung camera' : 'Thu gọn khung camera'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle, rgba(0,0,0,0.1))',
                background: 'var(--bg-primary, #ffffff)',
                color: 'var(--text-primary, #1a1a2e)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </div>

        {/* Camera Image Display Container (Collapsible) */}
        {!isCollapsed && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/9',
              maxHeight: '520px',
              background: '#090a0f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {imgError ? (
              <div
                style={{
                  padding: '30px',
                  textAlign: 'center',
                  color: '#ff8a80',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <AlertTriangle size={36} style={{ color: '#ef5350' }} />
                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                  Không thể tải hình ảnh từ camera
                </div>
                <div style={{ fontSize: '12px', color: '#b0bec5', maxWidth: '380px' }}>
                  Đường dẫn camera có thể đang tạm gián đoạn hoặc chặn truy cập.
                </div>
                <button
                  onClick={refreshImage}
                  style={{
                    marginTop: '8px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #e53935, #c62828)',
                    color: 'white',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={timestamp}
                  src={getImgSrc()}
                  alt="Traffic Camera Live Stream"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    opacity: isRefreshing ? 0.7 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                />

                {/* Top Watermark Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(8px)',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    pointerEvents: 'none',
                  }}
                >
                  <ShieldCheck size={13} style={{ color: '#4caf50' }} />
                  <span>TP. Hồ Chí Minh • Camera Handler</span>
                </div>

                {/* Bottom Live Bar Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(8px)',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    pointerEvents: 'none',
                  }}
                >
                  Refetch: 1 phút/lần ({countdown}s)
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Expand Modal */}
      {isExpanded && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
          }}
          onClick={() => setIsExpanded(false)}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              color: 'white',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Camera size={24} style={{ color: '#ef5350' }} />
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                  Camera Giao Thông (Toàn Màn Hình)
                </h2>
                <p style={{ fontSize: '12px', color: '#b0bec5', margin: '2px 0 0 0' }}>
                  Cập nhật tự động 1 phút/lần • Khung hình: {formattedTime}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={refreshImage}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw
                  size={14}
                  style={{
                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                  }}
                />
                Làm mới ({countdown}s)
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X size={22} />
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={timestamp}
              src={getImgSrc()}
              alt="Traffic Camera Fullscreen"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6)',
              }}
            />
          </div>
        </div>
      )}

      {/* Global Spin animation */}
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.15);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
