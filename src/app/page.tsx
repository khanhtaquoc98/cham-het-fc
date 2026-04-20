'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { MatchData, Team } from '@/types/match';
import { PlayerConfig } from '@/types/player';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

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
  return 'Pit';
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

function findMatchingPlayer(playerName: string, telegramHandle: string | undefined, playerId: string | undefined, playerConfigs: PlayerConfig[]): PlayerConfig | null {
  // Priority 0: Exact ID match (absolute truth if linked via Admin UI)
  if (playerId) {
    const found = playerConfigs.find(c => c.id === playerId);
    if (found) return found;
  }
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

function TeamCard({ team, index, playerConfigs, isDark, playerStats, statsLoading }: { team: Team; index: number; playerConfigs: PlayerConfig[]; isDark: boolean; playerStats: PlayerStatsSummary[]; statsLoading: boolean }) {
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
        {team.players.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px', opacity: 0.4 }}>👻</span>
            Chưa có thông tin
          </div>
        ) : (
          team.players.map((player, i) => {
          const matched = findMatchingPlayer(player.name, player.telegramHandle, player.playerId, playerConfigs);
          const jerseyLabel = matched?.jerseyNumber ? String(matched.jerseyNumber) : '?';

          // Find stats for this player
          const stat = findPlayerStat(player.name, player.telegramHandle, player.playerId, playerConfigs, playerStats);

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
              {statsLoading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}>
                  <span className="stat-skeleton" style={{
                    width: '36px',
                    height: '18px',
                    borderRadius: '6px',
                  }} />
                  <span className="stat-skeleton" style={{
                    width: '62px',
                    height: '14px',
                    borderRadius: '4px',
                  }} />
                </div>
              ) : stat && stat.totalMatches > 0 ? (
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
              ) : null}
            </div>
          );
        })
        )}
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
  playerId: string | undefined,
  playerConfigs: PlayerConfig[],
  playerStats: PlayerStatsSummary[],
): PlayerStatsSummary | null {
  // Priority 1: Find via registered player -> match by playerId
  // (stats are now grouped by player_id, so this is the most reliable match)
  const matched = findMatchingPlayer(playerName, telegramHandle, playerId, playerConfigs);
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
  const [currentUser, setCurrentUser] = useState<{username: string; id: string; name?: string; player_id?: string} | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
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
    // Phase 1: Fetch match data first (teams render immediately)
    try {
      const matchRes = await fetch('/api/match', { cache: 'no-store' });
      const data = await matchRes.json();
      setMatchData(data.matchData);
      setPlayerConfigs(data.players || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch match:', err);
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }

    // Phase 2: Fetch stats & payment lazily
    try {
      const [statsRes, paymentRes, userRes] = await Promise.all([
        fetch('/api/stats', { cache: 'no-store' }),
        fetch('/api/payment', { cache: 'no-store' }),
        fetch('/api/auth/me', { cache: 'no-store' }),
      ]);
      const statsData = await statsRes.json();
      setPlayerStats(statsData.players || []);
      
      const paymentData = await paymentRes.json();
      setPaymentSummary(paymentData);

      const userData = await userRes.json();
      if (userData.user) setCurrentUser(userData.user);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [benchSaving, setBenchSaving] = useState(false);

  // Helper: check if a player entry (from bench/team) matches the current user
  const isCurrentUserPlayer = (p: { name: string; telegramHandle?: string; playerId?: string }) => {
    // Match by playerId (most reliable)
    if (currentUser?.player_id && p.playerId && p.playerId === currentUser.player_id) return true;

    // Find the registered PlayerConfig for the current user
    const myConfig = currentUser?.player_id
      ? playerConfigs.find(c => c.id === currentUser.player_id)
      : null;

    if (myConfig) {
      const entryName = p.name.trim().toLowerCase();

      // Match by main name
      if (myConfig.name.trim().toLowerCase() === entryName) return true;

      // Match by subNames
      if (myConfig.subNames.some(sub => sub.trim().toLowerCase() === entryName)) return true;

      // Match by telegramHandle
      if (myConfig.telegramHandle && p.telegramHandle) {
        const a = myConfig.telegramHandle.trim().toLowerCase().replace(/^@/, '');
        const b = p.telegramHandle.trim().toLowerCase().replace(/^@/, '');
        if (a && a === b) return true;
      }
    }

    // Fallback: exact name match with resolved playerName
    const playerName = myConfig?.name || currentUser?.name || currentUser?.username || '';
    if (playerName && p.name.trim().toLowerCase() === playerName.trim().toLowerCase()) return true;

    return false;
  };

  const handleJoinBench = async () => {
    if (!currentUser || !matchData || !matchData.bench) return;
    
    let playerName = currentUser.name || currentUser.username;
    if (currentUser.player_id) {
       const matchedP = playerConfigs.find(p => p.id === currentUser.player_id);
       if (matchedP) {
         playerName = matchedP.name;
       }
    }
    
    // Check if player is already in ANY team or bench (using all identifiers)
    const isAlreadyInBench = matchData.bench.some(p => isCurrentUserPlayer(p));
    const isAlreadyInTeam = matchData.teams?.some(t => t.players.some(p => isCurrentUserPlayer(p)));
    
    if (isAlreadyInBench) {
      toast.error('Bạn đã ở trong danh sách Bench rồi!');
      return;
    }
    if (isAlreadyInTeam) {
      toast.error('Bạn đã được xếp vào đội rồi, không cần điểm danh lại!');
      return;
    }

    setBenchSaving(true);
    try {
      const newBench = [...matchData.bench, { name: playerName, telegramHandle: '', playerId: currentUser.player_id }]; // Assign playerId if linked!
      const res = await fetch('/api/match/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bench: newBench }),
      });
      if (res.ok) {
        setMatchData({ ...matchData, bench: newBench });
        toast.success('Điểm danh thành công!');
      } else {
        toast.error('Có lỗi xảy ra khi điểm danh');
      }
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi điểm danh');
    } finally {
      setBenchSaving(false);
    }
  };

  const handleLeaveBench = async () => {
    if (!currentUser || !matchData || !matchData.bench) return;

    setBenchSaving(true);
    try {
      const newBench = matchData.bench.filter(p => !isCurrentUserPlayer(p));
      const res = await fetch('/api/match/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bench: newBench }),
      });
      if (res.ok) {
        setMatchData({ ...matchData, bench: newBench });
        toast.success('Đã rời khỏi Bench!');
      } else {
        toast.error('Có lỗi xảy ra');
      }
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra');
    } finally {
      setBenchSaving(false);
    }
  };

  const totalPlayers = matchData?.teams?.reduce((sum, t) => sum + t.players.length, 0) || 0;
  const teamCount = matchData?.teams?.length || 0;
  const isInBench = currentUser && matchData?.bench?.some(p => isCurrentUserPlayer(p));
  const isInTeam = currentUser && matchData?.teams?.some(t => t.players.some(p => isCurrentUserPlayer(p)));

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
      {/* <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}>
        {isDark ? '☀️' : '🌙'}
      </button> */}

      {matchData?.updatedAt && (
        <div className="update-ticker" style={{ justifyContent: 'center', marginBottom: '24px', color: 'var(--text-muted)' }}>
          <div className="live-dot" style={{ backgroundColor: 'var(--accent)' }}/>
          <span>Cập nhật {formatRelativeTime(matchData.updatedAt)}</span>
        </div>
      )}

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
        ) : !matchData || (!matchData.teams?.length && !matchData.bench?.length && !matchData.venue?.date && !matchData.venue?.time && !matchData.venue?.venue) ? (
          <EmptyState />
        ) : (
          <>
            <MatchInfoSection matchData={matchData} />

            {/* Bench Section */}
            {matchData.bench !== undefined && !(paymentSummary?.matchPayment?.fieldCost > 0 && paymentSummary?.matchPayment?.losingTeams?.length > 0) && (
              <div style={{ marginTop: '24px', marginBottom: '24px', padding: '24px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
                {currentUser ? (
                  <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px dashed var(--border-subtle)', marginBottom: '24px' }}>
                    <p style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
                      Xin chào {currentUser.name || currentUser.username}!
                    </p>
                    {isInTeam ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>
                        ✅ Bạn đã được xếp vào đội
                      </span>
                    ) : isInBench ? (
                      <button 
                        onClick={handleLeaveBench}
                        disabled={benchSaving}
                        style={{ 
                          background: 'linear-gradient(135deg, #757575, #9e9e9e)', 
                          color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', 
                          fontWeight: 800, fontSize: '14px', cursor: benchSaving ? 'not-allowed' : 'pointer',
                          opacity: benchSaving ? 0.7 : 1, transition: 'all 0.2s ease', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                        }}>
                        {benchSaving ? 'Đang xử lý...' : '👋 Rời khỏi Bench'}
                      </button>
                    ) : (
                      <button 
                        onClick={handleJoinBench}
                        disabled={benchSaving}
                        style={{ 
                          background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', 
                          color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', 
                          fontWeight: 800, fontSize: '14px', cursor: benchSaving ? 'not-allowed' : 'pointer',
                          opacity: benchSaving ? 0.7 : 1, transition: 'all 0.2s ease', 
                          boxShadow: '0 4px 12px rgba(229,57,53,0.2)' 
                        }}>
                        {benchSaving ? 'Đang điểm danh...' : '✋ Điểm danh vào Bench'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px dashed var(--border-subtle)', marginBottom: '24px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '0' }}>
                      <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 800, textDecoration: 'none' }}>Đăng nhập ngay</Link> hoặc liên hệ Cap để điểm danh vào Bench chia team!
                    </p>
                  </div>
                )}

                <h3 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  🪑 BENCH DỰ BỊ ({matchData.bench.length})
                </h3>
                
                {matchData.bench.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                    {matchData.bench.map((player, idx) => (
                      <div key={idx} style={{ padding: '8px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '20px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        {player.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    Bench đang trống
                  </div>
                )}
              </div>
            )}

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

            {/* Thanh toán Button (nếu đủ thông tin) */}
            {paymentSummary?.matchPayment?.fieldCost > 0 && paymentSummary?.matchPayment?.losingTeams?.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', marginTop: '24px' }}>
                <Link href="/payment" style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'linear-gradient(135deg, #e53935, #ef5350)',
                  color: 'white', padding: '12px 24px', borderRadius: '12px',
                  textDecoration: 'none', fontWeight: 700, fontSize: '15px',
                  boxShadow: '0 4px 12px rgba(229,57,53,0.3)',
                  transition: 'transform 0.2s ease'
                }}>
                  💳 Thanh toán trận này
                </Link>
              </div>
            )}

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
                    <TeamCard team={team} index={i} playerConfigs={playerConfigs} isDark={isDark} playerStats={playerStats} statsLoading={statsLoading} />
                    {i === 0 && (
                      <div className="vs-badge-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', alignSelf: 'center' }}>
                        <div className="vs-badge">VS</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <TeamCard key={team.name} team={team} index={i} playerConfigs={playerConfigs} isDark={isDark} playerStats={playerStats} statsLoading={statsLoading} />
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
