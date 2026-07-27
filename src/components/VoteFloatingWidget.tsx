'use client';

import React, { useState, useEffect } from 'react';
import { TeleVoteConfig, MatchData } from '@/types/match';
import { Vote, X, MapPin, Calendar, Clock, Users, ExternalLink, Sparkles, Send } from 'lucide-react';

interface VoteFloatingWidgetProps {
  initialVoteConfig?: TeleVoteConfig | null;
  initialMatchData?: MatchData | null;
}

export default function VoteFloatingWidget({ initialVoteConfig, initialMatchData }: VoteFloatingWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [voteConfig, setVoteConfig] = useState<TeleVoteConfig | null>(initialVoteConfig || null);
  const [matchData, setMatchData] = useState<MatchData | null>(initialMatchData || null);
  const [hasDismissed, setHasDismissed] = useState(false);

  useEffect(() => {
    if (!voteConfig) {
      fetch('/api/tele-vote-config')
        .then(res => res.json())
        .then(res => {
          if (res.data) setVoteConfig(res.data);
        })
        .catch(err => console.error('Error fetching tele vote config:', err));
    }

    if (!matchData) {
      fetch('/api/match')
        .then(res => res.json())
        .then(res => {
          if (res.matchData) setMatchData(res.matchData);
        })
        .catch(err => console.error('Error fetching match data:', err));
    }
  }, [voteConfig, matchData]);

  // Construct Telegram link to the poll message
  const getTelegramUrl = () => {
    if (!voteConfig) return 'https://t.me';
    const { chat_id, message_id, thread_id } = voteConfig;
    if (!chat_id) return 'https://t.me';

    const cleanChatId = chat_id.replace(/^-100/, '');
    if (thread_id && Number(thread_id) > 0) {
      return `https://t.me/c/${cleanChatId}/${thread_id}/${message_id || 1}`;
    }
    if (message_id) {
      return `https://t.me/c/${cleanChatId}/${message_id}`;
    }
    return `https://t.me/c/${cleanChatId}`;
  };

  const benchCount = matchData?.bench?.length || 0;
  const pollTitle = voteConfig?.title || 'Điểm danh trận đấu';
  const venueDate = matchData?.venue?.date || '';
  const venueTime = matchData?.venue?.time || '';
  const venueName = matchData?.venue?.venue || '';

  if (hasDismissed) return null;

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999, fontFamily: 'var(--font-main, sans-serif)' }}>
      {/* Floating Popup Card */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            right: 0,
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            background: 'linear-gradient(145deg, rgba(20, 24, 33, 0.95), rgba(13, 17, 23, 0.98))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(42, 171, 238, 0.15)',
            overflow: 'hidden',
            animation: 'vote-pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            color: '#fff',
          }}
        >
          {/* Top Gradient Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0088cc 0%, #2AABEE 100%)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Vote size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Vote Điểm Danh Mới
                </div>
                <div style={{ fontSize: '11px', opacity: 0.85 }}>Mở bình chọn trên Telegram</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(0,0,0,0.15)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Card Body */}
          <div style={{ padding: '16px' }}>
            {/* Poll Title Badge */}
            <div
              style={{
                background: 'rgba(42, 171, 238, 0.1)',
                border: '1px solid rgba(42, 171, 238, 0.25)',
                borderRadius: '12px',
                padding: '10px 12px',
                marginBottom: '14px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#2AABEE', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                📌 Tiêu đề Vote
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
                {pollTitle}
              </div>
            </div>

            {/* Match Venue / Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '12.5px' }}>
              {(venueDate || venueTime) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.85)' }}>
                  <Calendar size={14} color="#2AABEE" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Thời gian:</strong> {venueTime} {venueDate ? `(${venueDate})` : ''}
                  </span>
                </div>
              )}
              {venueName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.85)' }}>
                  <MapPin size={14} color="#2AABEE" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Sân đấu:</strong> {venueName}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.85)' }}>
                <Users size={14} color="#2AABEE" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Đã đăng ký (Bench):</strong> <span style={{ color: '#4CAF50', fontWeight: 700 }}>{benchCount} người</span>
                </span>
              </div>
            </div>

            {/* Recent Bench Avatars Preview */}
            {matchData?.bench && matchData.bench.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {matchData.bench.slice(0, 5).map((p, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '16px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.9)',
                      fontWeight: 600,
                    }}
                  >
                    ⚽ {p.name}
                  </div>
                ))}
                {matchData.bench.length > 5 && (
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                    +{matchData.bench.length - 5} người khác
                  </div>
                )}
              </div>
            )}

            {/* Action CTA Button */}
            <a
              href={getTelegramUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #0088cc 0%, #2AABEE 100%)',
                color: '#fff',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '13.5px',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(42, 171, 238, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>VOTE NGAY TRÊN TELEGRAM</span>
              <ExternalLink size={15} />
            </a>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Tooltip / Label if not open */}
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            style={{
              background: 'rgba(20, 24, 33, 0.9)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(42, 171, 238, 0.3)',
              borderRadius: '20px',
              padding: '8px 14px',
              color: '#fff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'vote-pulse-subtle 2s infinite',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles size={14} color="#FFD54F" />
            <span>Vote điểm danh trận mới</span>
            {benchCount > 0 && (
              <span
                style={{
                  background: '#2AABEE',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                {benchCount}
              </span>
            )}
          </div>
        )}

        {/* Main Floating Circle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'relative',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: isOpen
              ? 'linear-gradient(135deg, #1e293b, #0f172a)'
              : 'linear-gradient(135deg, #0088cc 0%, #2AABEE 100%)',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 10px 25px rgba(42, 171, 238, 0.5), 0 0 15px rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: isOpen ? 'rotate(90deg)' : 'scale(1)',
          }}
          title="Vote điểm danh trận mới"
        >
          {isOpen ? (
            <X size={24} />
          ) : (
            <>
              <Send size={22} style={{ transform: 'translate(-1px, 1px)' }} />
              {/* Badge count overlay */}
              {benchCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#FF3D00',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #0d1117',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  {benchCount}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes vote-pop-in {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes vote-pulse-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
}
