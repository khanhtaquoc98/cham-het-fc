'use client';

import React, { useState, useEffect } from 'react';
import { TeleVoteConfig, MatchData } from '@/types/match';
import { Vote, X, MapPin, Calendar, Clock, Users, ExternalLink, Sparkles, Send, Loader2 } from 'lucide-react';

interface VoteFloatingWidgetProps {
  initialVoteConfig?: TeleVoteConfig | null;
  initialMatchData?: MatchData | null;
}

export default function VoteFloatingWidget({ initialVoteConfig, initialMatchData }: VoteFloatingWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [voteConfig, setVoteConfig] = useState<TeleVoteConfig | null>(initialVoteConfig || null);
  const [matchData, setMatchData] = useState<MatchData | null>(initialMatchData || null);
  const [hasDismissed, setHasDismissed] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [thirdPartyVoters, setThirdPartyVoters] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const configRes = await fetch(`/api/tele-vote-config?t=${Date.now()}`, { cache: 'no-store' });
        const configJson = await configRes.json();
        const cfg: TeleVoteConfig | null = configJson?.data || null;

        if (isMounted && cfg) setVoteConfig(cfg);

        const matchRes = await fetch('/api/match', { cache: 'no-store' });
        const matchJson = await matchRes.json();
        if (isMounted && matchJson?.matchData) setMatchData(matchJson.matchData);

        const provider = cfg?.provider || voteConfig?.provider;
        if (provider === 'third_party') {
          const vRes = await fetch(`/api/tele-vote-config?action=voters&provider=third_party&t=${Date.now()}`, { cache: 'no-store' });
          const vData = await vRes.json();
          const votersList = vData.voters || [];
          const names: string[] = [];
          votersList.forEach((v: { user_name: string; option_ids: number[] | string }) => {
            let optionIds: number[] = [];
            if (Array.isArray(v.option_ids)) optionIds = v.option_ids;
            else if (typeof v.option_ids === 'string') {
              try { optionIds = JSON.parse(v.option_ids); } catch (e) {}
            }
            const mainOptIndex = optionIds[0] ?? 1;
            if (mainOptIndex === 0) return;
            const count = mainOptIndex > 0 ? mainOptIndex : 1;
            for (let i = 0; i < count; i++) {
              names.push(i === 0 ? v.user_name : `${v.user_name} ${i}`);
            }
          });
          if (isMounted) setThirdPartyVoters(names);
        }
      } catch (err) {
        console.error('Error fetching vote widget data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAllData();
    return () => { isMounted = false; };
  }, []);

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

  const isThirdParty = voteConfig?.provider === 'third_party';
  const displayCount = isThirdParty
    ? (typeof voteConfig?.total_voters === 'number' ? voteConfig.total_voters : thirdPartyVoters.length)
    : benchCount;

  const displayVotersList = isThirdParty
    ? thirdPartyVoters.map(name => ({ name }))
    : (matchData?.bench || []);

  if (hasDismissed || voteConfig?.show_vote === false) return null;

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999, fontFamily: 'var(--font-main, sans-serif)' }}>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            right: 0,
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '20px',
            border: '1px solid rgba(0, 136, 204, 0.2)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(42, 171, 238, 0.15)',
            overflow: 'hidden',
            animation: 'vote-pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            color: '#0f172a',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #0088cc 0%, #2AABEE 100%)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
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
                <div style={{ fontSize: '11px', opacity: 0.9 }}>Mở bình chọn trên Telegram</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
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

          <div style={{ padding: '16px' }}>
            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '12px',
                padding: '10px 12px',
                marginBottom: '14px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                📌 Tiêu đề Vote
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                {isLoading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: 0.7 }}>
                    <Loader2 size={14} className="vote-spin-icon" /> Đang cập nhật dữ liệu...
                  </span>
                ) : (
                  pollTitle
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                <Users size={14} color="#0088cc" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Đã đăng ký:</strong>{' '}
                  {isLoading ? (
                    <span style={{ color: '#0088cc', fontWeight: 600 }}>Đang tải...</span>
                  ) : (
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>{displayCount} người</span>
                  )}
                </span>
              </div>
            </div>

            {isLoading ? (
              <div style={{ padding: '12px 0', fontSize: '12px', opacity: 0.6, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={14} className="vote-spin-icon" color="#0088cc" /> Đang tải danh sách cầu thủ...
              </div>
            ) : displayVotersList.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', flexWrap: 'wrap', maxHeight: '160px', overflowY: 'auto' }}>
                {displayVotersList.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#e0f2fe',
                      border: '1px solid #93c5fd',
                      borderRadius: '16px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      color: '#0369a1',
                      fontWeight: 600,
                    }}
                  >
                    ⚽ {p.name}
                  </div>
                ))}
              </div>
            ) : null}

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
                boxShadow: '0 6px 18px rgba(0, 136, 204, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>VOTE NGAY TRÊN TELEGRAM</span>
              <ExternalLink size={15} />
            </a>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(0, 136, 204, 0.25)',
              borderRadius: '20px',
              padding: '8px 14px',
              color: '#0f172a',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'vote-pulse-subtle 2s infinite',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles size={14} color="#d97706" />
            <span>Điểm danh</span>
            {isLoading && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#0088cc', fontWeight: 600, fontSize: '11px', marginLeft: '2px' }}>
                <Loader2 size={13} className="vote-spin-icon" />
              </span>
            )}

          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'relative',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: isOpen
              ? 'linear-gradient(135deg, #475569, #1e293b)'
              : 'linear-gradient(135deg, #0088cc 0%, #2AABEE 100%)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 10px 25px rgba(0, 136, 204, 0.4), 0 2px 10px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: isOpen ? 'rotate(90deg)' : 'scale(1)',
          }}
          title="Điểm danh"
        >
          {isOpen ? (
            <X size={24} />
          ) : (
            <>
              {isLoading ? (
                <Loader2 size={24} className="vote-spin-icon" color="#ffffff" />
              ) : (
                <Send size={22} style={{ transform: 'translate(-1px, 1px)' }} />
              )}
              {!isLoading && displayCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  {displayCount}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes vote-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .vote-spin-icon {
          animation: vote-spin 1s linear infinite;
        }
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
            transform: scale(1);
          }
          50% {
            transform: scale(1.03);
          }
        }
      `}</style>
    </div>
  );
}
