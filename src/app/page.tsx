'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { MatchData, Team } from '@/types/match';
import { PlayerConfig } from '@/types/player';
import Link from 'next/link';

interface PlayerStatsSummary {
  playerName: string;
  playerId?: string | null;
  wins: number;
  draws: number;
  losses: number;
  totalMatches: number;
  winRate: number;
}

/* =============================================
   UTILITY FUNCTIONS
   ============================================= */

function getTeamColor(name: string): 'home' | 'away' | 'extra' {
  const n = name.toUpperCase();
  if (n.includes('HOME')) return 'home';
  if (n.includes('AWAY')) return 'away';
  return 'extra';
}

function getTeamBorderClass(name: string): string {
  const n = name.toUpperCase();
  if (n.includes('HOME')) return 'team-card-home';
  if (n.includes('AWAY')) return 'team-card-away';
  return 'team-card-extra';
}

function getTeamTooltip(name: string): string {
  const n = name.toUpperCase();
  if (n.includes('HOME')) return 'Trắng';
  if (n.includes('AWAY')) return 'Đen';
  return 'Cam';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const updated = new Date(isoString);
  const diffMs = now.getTime() - updated.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  return `${diffDay} ngày trước`;
}

function findMatchingPlayer(playerName: string, telegramHandle: string | undefined, playerConfigs: PlayerConfig[]): PlayerConfig | null {
  // Priority 1: match by telegramHandle
  if (telegramHandle) {
    const normalizedHandle = telegramHandle.trim().toLowerCase().replace(/^@/, '');
    for (const config of playerConfigs) {
      if (config.telegramHandle) {
        const configHandle = config.telegramHandle.trim().toLowerCase().replace(/^@/, '');
        if (configHandle === normalizedHandle) return config;
      }
    }
  }

  // Priority 2: match by subNames
  const normalized = playerName.trim().toLowerCase();
  for (const config of playerConfigs) {
    for (const sub of config.subNames) {
      if (sub.trim().toLowerCase() === normalized) return config;
    }
  }
  return null;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array<ArrayBuffer>;
}

/* =============================================
   JERSEY ICONS
   ============================================= */

const JERSEY_COLORS_LIGHT = {
  home:  { fill: '#ffffff', stroke: '#e53935', text: '#c62828', collar: '#e53935' },
  away:  { fill: '#263238', stroke: '#455a64', text: '#ffffff', collar: '#37474f' },
  extra: { fill: '#ef6c00', stroke: '#e65100', text: '#ffffff', collar: '#bf360c' },
};

const JERSEY_COLORS_DARK = {
  home:  { fill: '#37474f', stroke: '#78909c', text: '#eceff1', collar: '#546e7a' },
  away:  { fill: '#2a0000', stroke: '#ef5350', text: '#ff8a80', collar: '#ef5350' },
  extra: { fill: '#e65100', stroke: '#ff9800', text: '#ffffff', collar: '#ef6c00' },
};

/** Small jersey icon for team headers (no text) */
function SmallJerseyIcon({ team, isDark }: { team: 'home' | 'away' | 'extra'; isDark: boolean }) {
  const c = (isDark ? JERSEY_COLORS_DARK : JERSEY_COLORS_LIGHT)[team];
  return (
    <svg viewBox="0 0 48 48" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 12L8 16V22L10 23V40C10 41.1 10.9 42 12 42H36C37.1 42 38 41.1 38 40V23L40 22V16L34 12H14Z"
        fill={c.fill} stroke={c.stroke} strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 12L8 16V22L10 23V18L14 15V12Z"
        fill={c.fill} stroke={c.stroke} strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />
      <path d="M34 12L40 16V22L38 23V18L34 15V12Z"
        fill={c.fill} stroke={c.stroke} strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />
      <path d="M18 12C18 12 20 14 24 14C28 14 30 12 30 12"
        stroke={c.collar} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Player jersey icon with label (number or initials) */
function JerseyIcon({ label, team, isDark }: { label: string; team: 'home' | 'away' | 'extra'; isDark: boolean }) {
  const c = (isDark ? JERSEY_COLORS_DARK : JERSEY_COLORS_LIGHT)[team];
  return (
    <div className="jersey-container">
      <svg viewBox="0 0 48 48" width="42" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 12L8 16V22L10 23V40C10 41.1 10.9 42 12 42H36C37.1 42 38 41.1 38 40V23L40 22V16L34 12H14Z"
          fill={c.fill} stroke={c.stroke} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M14 12L8 16V22L10 23V18L14 15V12Z"
          fill={c.fill} stroke={c.stroke} strokeWidth="1" strokeLinejoin="round" opacity="0.85" />
        <path d="M34 12L40 16V22L38 23V18L34 15V12Z"
          fill={c.fill} stroke={c.stroke} strokeWidth="1" strokeLinejoin="round" opacity="0.85" />
        <path d="M18 12C18 12 20 14 24 14C28 14 30 12 30 12"
          stroke={c.collar} strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M21 12L24 16L27 12"
          stroke={c.collar} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="jersey-initial" style={{ color: c.text }}>{label || '?'}</span>
    </div>
  );
}

/* =============================================
   TEAM CARD
   ============================================= */

function TeamCard({ team, index, playerConfigs, isDark, playerStats }: { team: Team; index: number; playerConfigs: PlayerConfig[]; isDark: boolean; playerStats: PlayerStatsSummary[] }) {
  const color = getTeamColor(team.name);
  const borderClass = getTeamBorderClass(team.name);
  const tooltip = getTeamTooltip(team.name);

  return (
    <div className={`glass-card ${borderClass}`} style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="team-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SmallJerseyIcon team={color} isDark={isDark} />
          <h2 className={`team-name ${color}-name`}>{team.name}</h2>
          <span style={{
            fontSize: '11px',
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: '6px',
            background: color === 'home' ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(198,40,40,0.08)') : color === 'away' ? (isDark ? 'rgba(239,83,80,0.12)' : 'rgba(55,71,79,0.08)') : 'rgba(239,108,0,0.08)',
            color: color === 'home' ? (isDark ? '#ffffff' : 'var(--accent)') : color === 'away' ? (isDark ? '#ef5350' : '#37474f') : 'var(--accent-orange)',
          }}>
            Áo {tooltip}
          </span>
        </div>
        <div className={`team-count ${color}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {team.players.length}
        </div>
      </div>

      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {team.players.map((player, i) => {
          const matched = findMatchingPlayer(player.name, player.telegramHandle, playerConfigs);
          const jerseyLabel = matched?.jerseyNumber ? String(matched.jerseyNumber) : '?';

          // Find stats for this player
          const stat = findPlayerStat(player.name, player.telegramHandle, playerConfigs, playerStats);

          return (
            <div key={i} className="player-item" style={{ animationDelay: `${(index * 0.08) + (i * 0.04)}s` }}>
              <div className="player-number">{i + 1}</div>
              <JerseyIcon label={jerseyLabel} team={color} isDark={isDark} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text-primary)',
                }}>
                  {player.name}
                </div>
                {player.telegramHandle && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {player.telegramHandle}
                  </div>
                )}
              </div>
              {stat && stat.totalMatches > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: stat.winRate >= 50 ? '#2e7d32' : stat.winRate >= 30 ? '#e65100' : '#c62828',
                    background: stat.winRate >= 50 ? 'rgba(46,125,50,0.08)' : stat.winRate >= 30 ? 'rgba(230,81,0,0.08)' : 'rgba(198,40,40,0.08)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}>
                    {stat.winRate}%
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ color: '#2e7d32' }}>{stat.wins}W</span>/
                    <span style={{ color: '#616161' }}>{stat.draws}D</span>/
                    <span style={{ color: '#c62828' }}>{stat.losses}L</span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =============================================
   MATCH INFO
   ============================================= */

function MatchInfoSection({ matchData }: { matchData: MatchData }) {
  const { venue } = matchData;
  if (!venue.date && !venue.time && !venue.venue) return null;

  return (
    <div className="match-info-bar" style={{ marginBottom: '24px' }}>
      <div className="match-info-label">
        ⚽ Thông tin trận đấu
      </div>
      <div className="match-info-chips">
        {venue.date && (
          <div className="info-chip">
            <span className="label">Ngày</span>
            <span className="value">{venue.date}</span>
          </div>
        )}
        {venue.time && (
          <div className="info-chip">
            <span className="label">Giờ</span>
            <span className="value">{venue.time}</span>
          </div>
        )}
        {venue.venue && (
          <div className="info-chip">
            <span className="label">Sân</span>
            <span className="value">
              {venue.googleMapLink ? (
                <a href={venue.googleMapLink} target="_blank" rel="noopener noreferrer" className="venue-link">
                  {venue.venue}
                </a>
              ) : venue.venue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================
   RULES SECTION
   ============================================= */

function RulesSection({ teamCount }: { teamCount: number }) {
  const ruleStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'var(--text-primary)',
    lineHeight: 1.7,
    padding: '4px 0',
  };

  const dividerStyle: React.CSSProperties = {
    borderTop: '1px dashed var(--border-subtle)',
    margin: '10px 0',
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  };

  return (
    <div className="match-info-bar" style={{ marginTop: '24px', flexDirection: 'column' }}>
      <div className="match-info-label" style={{ minWidth: 'unset', justifyContent: 'center' }}>
        📋 Rule
      </div>
      <div style={{ padding: '16px 20px' }}>
        {teamCount === 3 ? (
          <>
            {/* Điểm */}
            <div style={sectionTitle}>Hệ thống tính điểm</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
              <span style={{ ...ruleStyle, fontWeight: 700, color: '#2e7d32' }}>🏆 Thắng: 3đ</span>
              <span style={{ ...ruleStyle, fontWeight: 700, color: 'var(--text-muted)' }}>🤝 Hoà: 1đ</span>
              <span style={{ ...ruleStyle, fontWeight: 700, color: '#c62828' }}>❌ Thua: 0đ</span>
            </div>

            <div style={dividerStyle} />

            {/* Luật chung */}
            <div style={sectionTitle}>Luật thi đấu</div>
            <div style={ruleStyle}>🔄 Thay người, Nằm sân, Cột giày → được <strong>dừng trận đấu</strong>, còn lại chưa chết thì vẫn phải đá</div>
            <div style={ruleStyle}>📣 Thay người khi trái banh <strong>không còn nằm trong sân</strong> và phải <strong>&quot;La&quot;</strong> khi thay người</div>

            <div style={dividerStyle} />

            {/* Team out */}
            <div style={sectionTitle}>Team out sau mỗi trận</div>
            <div style={ruleStyle}>👉 Team nào vào sau, nếu <strong>hoà thì ở lại</strong></div>
            <div style={ruleStyle}>⚽ Thua <strong>2 bàn = out</strong></div>
            <div style={ruleStyle}>🎲 Trận đấu đầu tiên nếu hoà sẽ <strong>random 1 đội ra</strong></div>

            <div style={dividerStyle} />

            {/* Thời gian */}
            <div style={sectionTitle}>Thời gian</div>
            <div style={ruleStyle}>⏱️ <strong>7 phút / 1 trận</strong></div>
            <div style={ruleStyle}>🥤 Team đá trận cuối cùng <strong>kết quả</strong> sẽ được tính tại thời điểm hết tiền sân</div>
            <div style={dividerStyle} />

            {/* Tiền nước */}
            <div style={sectionTitle}>Sau trận đấu</div>
            <div style={ruleStyle}>💰 Nếu 2 team đồng top 1 → Tính thêm <strong>hệ số phụ: số trận ít hơn, bàn thắng nhiều hơn</strong> để cộng vào Win-rate từng cá nhân</div>
            <div style={ruleStyle}>💰 Nếu 2 team đồng hạng bét. Để tìm hạng nhì → Tính thêm <strong>hệ số phụ: số trận ít hơn, bàn thắng nhiều hơn</strong></div>
            <div style={ruleStyle}>🥤 Team <strong>bét</strong> sẽ trả <strong>70% tiền nước</strong> và Team <strong>nhì</strong> sẽ trả <strong>30% tiền nước</strong> và mặc định <strong>2</strong> lốc nếu không hết trả lại</div>
            <div style={ruleStyle}>🥤 Ai đi vễ vẫn sẽ phải trả tiền nước nếu team mình thua, nên hãy uống nước trước khi về nhé!</div>
          </>
        ) : (
          <>
            <div style={sectionTitle}>Luật thi đấu</div>
            <div style={ruleStyle}>🥤 Team nào <strong>thua</strong> sẽ phải trả <strong>tiền nước</strong></div>

            <div style={dividerStyle} />

            <div style={ruleStyle}>🔄 Thay người, Nằm sân, Cột giày → được <strong>dừng trận đấu</strong>, còn lại chưa chết thì vẫn phải đá</div>
            <div style={ruleStyle}>📣 Thay người khi trái banh <strong>không còn nằm trong sân</strong> và phải <strong>&quot;La&quot;</strong> khi thay người</div>
            <div style={ruleStyle}>🥤 Team <strong>thua</strong> sẽ trả <strong>100% tiền nước</strong> và mặc định <strong>1</strong> lốc nếu không hết trả lại</div>
            <div style={ruleStyle}>🥤 Ai đi vễ vẫn sẽ phải trả tiền nước nếu team mình thua, nên hãy uống nước trước khi về nhé!</div>
          </>
        )}
      </div>
    </div>
  );
}

/* =============================================
   EMPTY STATE
   ============================================= */

function EmptyState() {
  return (
    <div className="empty-state">
      <span className="empty-icon">⚽</span>
      <h2>Chưa có dữ liệu trận đấu</h2>
      <p>
        Đăng ký với Captain để được thêm vào trận đấu sắp tới nhé
      </p>
    </div>
  );
}

/* =============================================
   MAIN PAGE
   ============================================= */

function findPlayerStat(
  playerName: string,
  telegramHandle: string | undefined,
  playerConfigs: PlayerConfig[],
  playerStats: PlayerStatsSummary[],
): PlayerStatsSummary | null {
  // Priority 1: Find via registered player -> match by playerId
  // (stats are now grouped by player_id, so this is the most reliable match)
  const matched = findMatchingPlayer(playerName, telegramHandle, playerConfigs);
  if (matched) {
    for (const stat of playerStats) {
      if (stat.playerId === matched.id) return stat;
    }
  }

  // Priority 2: Try to find stats by matching player name (case-insensitive)
  const normalized = playerName.trim().toLowerCase();
  for (const stat of playerStats) {
    if (stat.playerName.trim().toLowerCase() === normalized) return stat;
  }

  return null;
}

export default function Home() {
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStatsSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  // PWA Install states
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [showNotiModal, setShowNotiModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('football-theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Helper: subscribe to push notifications
  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });
      console.log('Push subscription saved!');
    } catch (err) {
      console.log('Push subscription failed:', err);
    }
  };

  // Service Worker + Push + Install Prompt
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(async (registration) => {
        console.log('SW registered:', registration.scope);

        // Auto-subscribe only if permission already granted (works on Chrome/Android)
        if ('Notification' in window && Notification.permission === 'granted') {
          subscribeToPush();
        }
      }).catch(err => console.log('SW registration failed (needs HTTPS):', err));
    }

    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
      // Show noti popup after 3s if not yet granted
      const notiDismissed = localStorage.getItem('noti-dismissed-at');
      const notiSkipped = notiDismissed && (Date.now() - parseInt(notiDismissed)) < 3 * 24 * 60 * 60 * 1000;
      if (Notification.permission === 'default' && !notiSkipped) {
        setTimeout(() => setShowNotiModal(true), 3000);
      }
    }

    // Detect mobile browser - multiple methods for reliability
    const ua = navigator.userAgent || '';
    const isMobileUA = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const isMobile = isMobileUA || (isTouchDevice && isSmallScreen);

    // Check if already installed as standalone app
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    // iOS detection (Safari on iPhone/iPad, not already installed)
    const isIOSDevice = /iPhone|iPad|iPod/i.test(ua) || (ua.includes('Mac') && isTouchDevice);
    setIsIOS(isIOSDevice && !isStandalone);

    // Check dismissed state (reset after 7 days)
    const dismissedAt = localStorage.getItem('install-dismissed-at');
    const dismissed = dismissedAt && (Date.now() - parseInt(dismissedAt)) < 7 * 24 * 60 * 60 * 1000;

    console.log('Install check:', { isMobile, isStandalone, dismissed, isIOSDevice, ua: ua.substring(0, 60) });

    // Show install modal on mobile if not installed and not dismissed
    if (isMobile && !isStandalone && !dismissed) {
      setTimeout(() => setShowInstallModal(true), 1500);
    }

    // Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (isMobile && !dismissed) {
        setShowInstallModal(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt && 'prompt' in deferredPrompt) {
      (deferredPrompt as { prompt: () => void }).prompt();
      setShowInstallModal(false);
      setDeferredPrompt(null);
    }
  };

  const dismissInstall = () => {
    setShowInstallModal(false);
    localStorage.setItem('install-dismissed-at', String(Date.now()));
  };

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
      localStorage.setItem('football-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [matchRes, statsRes] = await Promise.all([
        fetch('/api/match', { cache: 'no-store' }),
        fetch('/api/stats', { cache: 'no-store' }),
      ]);
      const data = await matchRes.json();
      const statsData = await statsRes.json();
      setMatchData(data.matchData);
      setPlayerConfigs(data.players || []);
      setPlayerStats(statsData.players || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch:', err);
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPlayers = matchData?.teams?.reduce((sum, t) => sum + t.players.length, 0) || 0;
  const teamCount = matchData?.teams?.length || 0;

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* PWA Install Modal */}
      {showInstallModal && (
        <div className="install-modal-overlay" onClick={dismissInstall}>
          <div className="install-modal" onClick={e => e.stopPropagation()}>
            <div className="install-modal-icon">
              <Image src="/logo.png" alt="Chấm Hết FC" width={72} height={72} style={{ borderRadius: '16px' }} />
            </div>
            <h3 className="install-modal-title">Install Cham Het FC</h3>
            <p className="install-modal-desc">
              Thêm app vào màn hình chính để truy cập nhanh hơn và nhận thông báo trước giờ đá!
            </p>

            {isIOS ? (
              <div className="install-modal-ios">
                <p>Nhấn <strong>
                  Chia sẻ
                </strong> rồi chọn <strong>&quot;Thêm vào MH chính&quot;</strong></p>
              </div>
            ) : (
              <button className="install-modal-btn" onClick={handleInstall}>
                Install now
              </button>
            )}

            <button className="install-modal-dismiss" onClick={dismissInstall}>
              Later
            </button>
          </div>
        </div>
      )}

      {/* Theme Toggle */}
      <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}>
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Header */}
      <header className="field-header">
        <div className="field-corner-tl" />
        <div className="field-corner-tr" />
        <div className="field-corner-bl" />
        <div className="field-corner-br" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '2px', color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              FOOTBALL LINEUP
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', letterSpacing: '3px', textTransform: 'uppercase' }}>
            Đội hình thi đấu
          </p>
        </div>

        {matchData?.updatedAt && (
          <div className="update-ticker" style={{ justifyContent: 'center', marginTop: '12px', color: 'rgba(255,255,255,0.55)', position: 'relative', zIndex: 1 }}>
            <div className="live-dot" />
            <span>Cập nhật {formatRelativeTime(matchData.updatedAt)}</span>
          </div>
        )}
      </header>

      {/* Main */}
      <main style={{ padding: '0 24px 60px', maxWidth: '1200px', margin: '0 auto', flex: 1, width: '100%' }}>
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <div className="skeleton" style={{ height: '72px', marginBottom: '24px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '20px' }}>
              {[1].map(i => <div key={i} className="skeleton" style={{ height: 'calc(100vh - 350px)' }} />)}
            </div>
          </div>
        ) : error ? (
          <div className="empty-state">
            <span className="empty-icon">❌</span>
            <h2>{error}</h2>
          </div>
        ) : !matchData || !matchData.teams || matchData.teams.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <MatchInfoSection matchData={matchData} />

            {/* Stats */}
            <div className="stat-bar" style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <div className="stat-box">
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)' }}>{totalPlayers}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                  Tổng cầu thủ
                </div>
              </div>
              <div className="stat-box">
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-dark)' }}>{teamCount}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                  Số đội
                </div>
              </div>
              <Link href="/match-now" className="stat-box" style={{ textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ fontSize: '24px' }}>⚽</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                  Trận đấu
                </div>
              </Link>
            </div>

            {/* Teams Grid */}
            <div className="teams-grid" style={{
              display: 'grid',
              gridTemplateColumns: teamCount === 2 ? '1fr auto 1fr' : `repeat(${teamCount}, 1fr)`,
              gap: teamCount === 2 ? '0' : '16px',
              alignItems: 'start',
            }}>
              {matchData.teams.map((team, i) =>
                teamCount === 2 ? (
                  <div key={team.name} style={{ display: 'contents' }}>
                    <TeamCard team={team} index={i} playerConfigs={playerConfigs} isDark={isDark} playerStats={playerStats} />
                    {i === 0 && (
                      <div className="vs-badge-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', alignSelf: 'center' }}>
                        <div className="vs-badge">VS</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <TeamCard key={team.name} team={team} index={i} playerConfigs={playerConfigs} isDark={isDark} playerStats={playerStats} />
                )
              )}
            </div>

            <RulesSection teamCount={teamCount} />
          </>
        )}
      </main>

      {/* Notification Permission Popup */}
      {showNotiModal && notifPermission === 'default' && (
        <div className="install-modal-overlay" onClick={() => {
          setShowNotiModal(false);
          localStorage.setItem('noti-dismissed-at', String(Date.now()));
        }}>
          <div className="install-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔔</div>
            <h3 className="install-modal-title">Bật thông báo</h3>
            <p className="install-modal-desc">
              Nhận nhắc nhở trước giờ đá để không bỏ lỡ trận nào!
            </p>
            <button className="install-modal-btn" onClick={async () => {
              const perm = await Notification.requestPermission();
              setNotifPermission(perm);
              setShowNotiModal(false);
              if (perm === 'granted') {
                await subscribeToPush();
              }
            }}>
              Bật thông báo
            </button>
            <button className="install-modal-dismiss" onClick={() => {
              setShowNotiModal(false);
              localStorage.setItem('noti-dismissed-at', String(Date.now()));
            }}>
              Để sau
            </button>
          </div>
        </div>
      )}


      <footer className="app-footer">
        Powered by Chấm Hết FC
      </footer>
    </div>
  );
}
