'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TeleVoteConfig, MatchData, Player } from '@/types/match';
import { isDuplicateWithTeleVoters } from '@/lib/players';
import { Vote, X, MapPin, Calendar, Clock, Users, ExternalLink, Sparkles, Send, Loader2, Plus, Trash2, Smartphone, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface VoteFloatingWidgetProps {
  initialVoteConfig?: TeleVoteConfig | null;
  initialMatchData?: MatchData | null;
}

export default function VoteFloatingWidget({ initialVoteConfig, initialMatchData }: VoteFloatingWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'app' | 'telegram'>('all');
  const [voteConfig, setVoteConfig] = useState<TeleVoteConfig | null>(initialVoteConfig || null);
  const [matchData, setMatchData] = useState<MatchData | null>(initialMatchData || null);
  const [hasDismissed, setHasDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [thirdPartyVoters, setThirdPartyVoters] = useState<string[]>([]);
  const [inputName, setInputName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [playerConfigs, setPlayerConfigs] = useState<{ id?: string; name: string; subNames?: string[] }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [appVoters, setAppVoters] = useState<string[]>([]);

  const filteredWidgetSuggestions = useMemo(() => {
    const query = inputName.trim().toLowerCase();
    if (!query) return [];

    const list: { name: string; subNames?: string[] }[] = [];
    const seen = new Set<string>();

    (playerConfigs || []).forEach(p => {
      if (p.name && !seen.has(p.name.toLowerCase())) {
        seen.add(p.name.toLowerCase());
        list.push({ name: p.name, subNames: p.subNames });
      }
    });

    (matchData?.teams || []).forEach(t => {
      t.players.forEach(p => {
        if (p.name && !seen.has(p.name.toLowerCase())) {
          seen.add(p.name.toLowerCase());
          list.push({ name: p.name });
        }
      });
    });

    return list.filter(item => {
      const matchName = item.name.toLowerCase().includes(query);
      const matchSub = item.subNames?.some(s => s.toLowerCase().includes(query));
      return matchName || matchSub;
    }).slice(0, 8);
  }, [inputName, playerConfigs, matchData]);

  const loadConfigVoters = async () => {
    try {
      const res = await fetch(`/api/tele-vote-config?action=voters&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      const voters = (data.voters || []).map((v: { user_name: string }) => v.user_name);
      setAppVoters(voters);
    } catch (e) {
      console.error('Error loading config voters:', e);
    }
  };

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
        if (isMounted && matchJson?.players) setPlayerConfigs(matchJson.players || []);

        await loadConfigVoters();

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

  // Listen for match-data-updated events from page.tsx or other components
  useEffect(() => {
    const handleDataUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setMatchData((prev) => (prev ? { ...prev, bench: customEvent.detail } : prev));
      }
      loadConfigVoters();
    };
    window.addEventListener('match-data-updated', handleDataUpdate);
    return () => window.removeEventListener('match-data-updated', handleDataUpdate);
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

  const normalizeStr = (str: string) => str.trim().toLowerCase().replace(/^@/, '');

  const checkDuplicateName = (rawName: string): { isDuplicate: boolean; reason?: string } => {
    const norm = normalizeStr(rawName);
    if (!norm) return { isDuplicate: false };

    // 1. Check App Voters in Config
    const appMatch = appVoters.find(v => normalizeStr(v) === norm);
    if (appMatch) {
      return { isDuplicate: true, reason: `Cầu thủ "${appMatch}" đã có trong danh sách điểm danh!` };
    }

    // 2. Check Telegram Voters
    const teleMatch = thirdPartyVoters.find(v => normalizeStr(v) === norm);
    if (teleMatch) {
      return { isDuplicate: true, reason: `Cầu thủ "${teleMatch}" đã vote trên Telegram!` };
    }

    return { isDuplicate: false };
  };

  const isValidPlayerName = (name: string): boolean => {
    const nameRegex = /^[a-zA-Z0-9\s+àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]+$/;
    return nameRegex.test(name.trim());
  };

  const handleAddAppPlayer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập tên điểm danh!');
      return;
    }

    if (!isValidPlayerName(trimmed)) {
      toast.error('Tên điểm danh không được chứa ký tự đặc biệt!');
      return;
    }

    // Check duplicates across App and Telegram
    const dupCheck = checkDuplicateName(trimmed);
    if (dupCheck.isDuplicate) {
      toast.error(dupCheck.reason || 'Tên này đã có trong danh sách!');
      return;
    }

    setIsSubmitting(true);
    try {
      const newVoters = [...appVoters, trimmed];
      const res = await fetch('/api/tele-vote-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_voters', voters: newVoters }),
      });

      if (res.ok) {
        setAppVoters(newVoters);
        setInputName('');
        toast.success(`Đã điểm danh cho: ${trimmed} (lưu tạm ở config)`);
        window.dispatchEvent(new CustomEvent('match-data-updated'));
      } else {
        toast.error('Có lỗi xảy ra khi điểm danh');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối khi lưu điểm danh');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAppPlayer = async (nameToDelete: string) => {
    setIsSubmitting(true);
    try {
      const newVoters = appVoters.filter(name => name !== nameToDelete);
      const res = await fetch('/api/tele-vote-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_voters', voters: newVoters }),
      });

      if (res.ok) {
        setAppVoters(newVoters);
        toast.success(`Đã xoá ${nameToDelete} khỏi danh sách điểm danh`);
        window.dispatchEvent(new CustomEvent('match-data-updated'));
      } else {
        toast.error('Lỗi khi xoá cầu thủ');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  const benchCount = appVoters.length;
  const pollTitle = voteConfig?.title || 'Điểm danh trận đấu';
  const teleCount = typeof voteConfig?.total_voters === 'number' ? voteConfig.total_voters : thirdPartyVoters.length;

  if (hasDismissed || voteConfig?.show_vote === false) return null;

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999, fontFamily: 'var(--font-main, sans-serif)' }}>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            right: 0,
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: '80vh',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '20px',
            border: '1px solid rgba(0, 136, 204, 0.2)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(42, 171, 238, 0.2)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'vote-pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            color: '#0f172a',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0088cc 0%, #2AABEE 100%)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
              flexShrink: 0,
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
                  ĐIỂM DANH & BÌNH CHỌN
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>Điểm danh trên App hoặc Vote Telegram</div>
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

          <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
            {/* Poll Title Box */}
            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '12px',
                padding: '10px 12px',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                📌 Trận đấu
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

            {/* Input form to add name on App */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowSuggestions(false);
                handleAddAppPlayer(e);
              }}
              style={{ display: 'flex', gap: '6px', marginBottom: '14px', position: 'relative', zIndex: 50 }}
            >
              <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                <input
                  type="text"
                  placeholder="Nhập tên điểm danh..."
                  value={inputName}
                  onChange={(e) => {
                    setInputName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#ffffff',
                    color: '#0f172a',
                  }}
                />
                {showSuggestions && filteredWidgetSuggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      zIndex: 100,
                    }}
                  >
                    {filteredWidgetSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => {
                          setInputName(item.name);
                          setShowSuggestions(false);
                        }}
                        style={{
                          padding: '9px 12px',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          borderBottom: idx < filteredWidgetSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          color: '#0f172a',
                          background: '#ffffff',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                      >
                        <span style={{ fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>👤 {item.name}</span>
                        {item.subNames && item.subNames.length > 0 && (
                          <span
                            title={item.subNames.join(', ')}
                            style={{
                              fontSize: '11px',
                              color: '#64748b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              textAlign: 'right',
                              minWidth: 0,
                            }}
                          >
                            ({item.subNames.join(', ')})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !inputName.trim()}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: isSubmitting || !inputName.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || !inputName.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Plus size={15} /> Điểm danh
              </button>
            </form>

            {/* Filter Tabs: Tất cả, App, Telegram */}
            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '14px' }}>
              <button
                onClick={() => setActiveTab('all')}
                style={{
                  flex: 1,
                  padding: '7px 8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'all' ? '#ffffff' : 'transparent',
                  color: activeTab === 'all' ? '#0f172a' : '#64748b',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'all' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                Tất cả ({benchCount + teleCount})
              </button>
              <button
                onClick={() => setActiveTab('app')}
                style={{
                  flex: 1,
                  padding: '7px 8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'app' ? '#ffffff' : 'transparent',
                  color: activeTab === 'app' ? '#0284c7' : '#64748b',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'app' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                📱 App ({benchCount})
              </button>
              <button
                onClick={() => setActiveTab('telegram')}
                style={{
                  flex: 1,
                  padding: '7px 8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'telegram' ? '#ffffff' : 'transparent',
                  color: activeTab === 'telegram' ? '#0088cc' : '#64748b',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'telegram' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                ✈️ Tele ({teleCount})
              </button>
            </div>

            {/* List 1: Điểm danh trên App */}
            {(activeTab === 'all' || activeTab === 'app') && (
              <div style={{ marginBottom: activeTab === 'all' ? '16px' : '0' }}>
                <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 800, marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📱 ĐIỂM DANH TRÊN APP ({benchCount})</span>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>(Ai cũng có quyền thêm/xoá)</span>
                </div>

                {isLoading ? (
                  <div style={{ padding: '8px 0', fontSize: '12px', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={14} className="vote-spin-icon" color="#0284c7" /> Đang tải danh sách...
                  </div>
                ) : appVoters.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto', padding: '2px' }}>
                    {appVoters.map((name, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#e0f2fe',
                          border: '1px solid #93c5fd',
                          borderRadius: '16px',
                          padding: '4px 10px',
                          fontSize: '11.5px',
                          color: '#0369a1',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>⚽ {name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAppPlayer(name)}
                          disabled={isSubmitting}
                          title={`Xoá ${name}`}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            opacity: 0.8,
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '8px 0', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                    Chưa có ai điểm danh trên App
                  </div>
                )}
              </div>
            )}

            {/* List 2: Bình chọn trên Telegram */}
            {(activeTab === 'all' || activeTab === 'telegram') && (
              <div>
                <div style={{ fontSize: '12px', color: '#0088cc', fontWeight: 800, marginBottom: '6px' }}>
                  ✈️ BÌNH CHỌN TELEGRAM ({teleCount})
                </div>
                {isLoading ? (
                  <div style={{ padding: '8px 0', fontSize: '12px', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={14} className="vote-spin-icon" color="#0088cc" /> Đang tải Telegram voters...
                  </div>
                ) : thirdPartyVoters.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto' }}>
                    {thirdPartyVoters.map((name, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: '16px',
                          padding: '4px 10px',
                          fontSize: '11.5px',
                          color: '#15803d',
                          fontWeight: 700,
                        }}
                      >
                        ✈️ {name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '8px 0', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                    Chưa ghi nhận danh sách bình chọn Telegram
                  </div>
                )}
              </div>
            )}

            {/* 2 Separate Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('app');
                  const el = document.querySelector<HTMLInputElement>('input[placeholder="Nhập tên điểm danh..."]');
                  if (el) el.focus();
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px 8px',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Smartphone size={15} />
                <span>Điểm danh App</span>
              </button>

              <a
                href={getTelegramUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px 8px',
                  background: 'linear-gradient(135deg, #0088cc 0%, #2AABEE 100%)',
                  color: '#ffffff',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(0, 136, 204, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>Telegram Poll</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Floating Pill Button (Collapsed state) */}
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
              {!isLoading && (benchCount + teleCount) > 0 && (
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
                  {benchCount + teleCount}
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

