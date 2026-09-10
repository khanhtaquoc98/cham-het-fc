export interface CardTemplate {
  id: string;
  name: string;
  fileName: string;
  src: string;
  category: 'popular' | 'base' | 'icons_heroes' | 'special_promo';
  textTheme: 'light' | 'dark' | 'gold';
  textColor?: string;
  accentColor?: string;
}

export interface NationOption {
  id: string;
  name: string;
  flagUrl: string;
}

export interface ClubOption {
  id: string;
  name: string;
  logoUrl: string;
}

export interface PlayStyleOption {
  id: string;
  name: string;
  shortName: string;
  category: string;
  color: string;
  iconSvg?: string;
}

export interface FaceStats {
  wr: number; // 1. WR: Winrate (%)
  w: number;  // 2. W: Win (Số trận thắng)
  d: number;  // 3. D: Draw (Số trận hòa)
  l: number;  // 4. L: Lose (Số trận thua)
  p: number;  // 5. P: Tổng trận đấu: W + D + L
  no: number | string; // 6. No.: Số áo thi đấu của cầu thủ
  yo?: number; // legacy backward-compatibility
  birthYear?: number;
}

export interface PlayerCardCustomState {
  templateId: string;
  rating: number;
  position: string;
  roleIntensity: '' | '+' | '++';
  altPositions: string[];
  playerName: string;
  jerseyNumber: number | string;
  isInjuryProne: boolean;
  avatarUrl: string;
  // Avatar transform
  scale: number; // 0.5 to 2.5
  offsetX: number; // -150 to 150
  offsetY: number; // -150 to 150
  // Horizontal Face Stats
  faceStats: FaceStats;
  // Attributes
  skills: number; // 1 to 5
  weakFoot: number; // 1 to 5
  preferredFoot: 'R' | 'L';
  ratingScore: number; // e.g. 88.5
  // Badges
  nationId: string;
  customNationUrl?: string;
  clubId: string;
  customClubUrl?: string;
  leagueId: string;
  playStylePlusId: string;
  // Display toggles
  showClub: boolean;
  showNation: boolean;
  showLeague: boolean;
  showStats: boolean;
  showPlayStyle: boolean;
  showAltPositions: boolean;
  customTextColor?: string;
  // Alt Positions Colors
  altPositionTextColor?: string;
  altPositionBorderColor?: string;
  altPositionBgColor?: string;
}

// ── Curated Card Templates (Modern EA FC 26 Only) ─────────────────
export const CARD_TEMPLATES: CardTemplate[] = [
  // ── 1. BASE CARDS ────────────────────────────────────────────────
  {
    id: 'rare_gold',
    name: 'Gold Rare (Vàng Hiếm)',
    fileName: 'rare_gold.png',
    src: '/fut-cards/templates/rare_gold.png',
    category: 'base',
    textTheme: 'dark',
    textColor: '#262015',
    accentColor: '#eab308',
  },
  {
    id: 'gold',
    name: 'Gold Thường (Non-Rare)',
    fileName: 'gold.png',
    src: '/fut-cards/templates/gold.png',
    category: 'base',
    textTheme: 'dark',
    textColor: '#3a2d10',
    accentColor: '#d97706',
  },
  {
    id: 'silver_rare',
    name: 'Silver Rare (Bạc Hiếm)',
    fileName: 'silver_rare.png',
    src: '/fut-cards/templates/silver_rare.png',
    category: 'base',
    textTheme: 'dark',
    textColor: '#1e293b',
    accentColor: '#94a3b8',
  },
  {
    id: 'bronze_rare',
    name: 'Bronze Rare (Đồng Hiếm)',
    fileName: 'bronze_rare.png',
    src: '/fut-cards/templates/bronze_rare.png',
    category: 'base',
    textTheme: 'dark',
    textColor: '#2a1a08',
    accentColor: '#b45309',
  },

  // ── 2. HOT PROMO & SEASONS ──────────────────────────────────────
  {
    id: 'toty',
    name: 'Team of the Year (TOTY)',
    fileName: 'toty.png',
    src: '/fut-cards/templates/toty.png',
    category: 'popular',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#38bdf8',
  },
  {
    id: 'tots',
    name: 'Team of the Season (TOTS)',
    fileName: 'tots.png',
    src: '/fut-cards/templates/tots.png',
    category: 'popular',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#3b82f6',
  },
  {
    id: 'totw',
    name: 'Team of the Week (TOTW)',
    fileName: 'totw.png',
    src: '/fut-cards/templates/totw.png',
    category: 'popular',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#f59e0b',
  },
  {
    id: 'champions_red',
    name: 'Champions Red (Siêu Đỏ)',
    fileName: 'champions_red.png',
    src: '/fut-cards/templates/champions_red.png',
    category: 'popular',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#ef4444',
  },
  {
    id: 'centurions',
    name: 'Centurions (Sấm Sét)',
    fileName: 'centurions.png',
    src: '/fut-cards/templates/centurions.png',
    category: 'popular',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#fbbf24',
  },
  {
    id: '16_futties',
    name: 'Futties Hồng Rực Lửa',
    fileName: '16_futties.png',
    src: '/fut-cards/templates/16_futties.png',
    category: 'popular',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#f43f5e',
  },
  {
    id: 'future_star',
    name: 'Future Stars (Ngôi Sao Trẻ)',
    fileName: 'future_star.png',
    src: '/fut-cards/templates/future_star.png',
    category: 'popular',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#ec4899',
  },
  {
    id: '107_path_to_glory',
    name: 'Path To Glory Cúp Vàng',
    fileName: '107_path_to_glory.png',
    src: '/fut-cards/templates/107_path_to_glory.png',
    category: 'popular',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#10b981',
  },
  {
    id: '111_fantasy_fc',
    name: 'Fantasy FC Neon',
    fileName: '111_fantasy_fc.png',
    src: '/fut-cards/templates/111_fantasy_fc.png',
    category: 'popular',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#06b6d4',
  },
  {
    id: '124_ucl_rttf',
    name: 'UEFA Champions League RTTF',
    fileName: '124_ucl_rttf.png',
    src: '/fut-cards/templates/124_ucl_rttf.png',
    category: 'popular',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#3b82f6',
  },
  {
    id: '63_showdown_upgrade',
    name: 'Showdown Upgrade Quyết Đấu',
    fileName: '63_showdown_upgrade.png',
    src: '/fut-cards/templates/63_showdown_upgrade.png',
    category: 'popular',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#f97316',
  },

  // ── 3. ICONS & HEROES ───────────────────────────────────────────
  {
    id: 'icon',
    name: 'Icon Huyền Thoại (White Gold)',
    fileName: 'icon.png',
    src: '/fut-cards/templates/icon.png',
    category: 'icons_heroes',
    textTheme: 'dark',
    textColor: '#2c2514',
    accentColor: '#fef08a',
  },
  {
    id: '21_prime_heroes',
    name: 'Prime Heroes FC 26',
    fileName: '21_prime_heroes.png',
    src: '/fut-cards/templates/21_prime_heroes.png',
    category: 'icons_heroes',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#a855f7',
  },
  {
    id: '130_greats_of_the_game_hero',
    name: 'Greats Of The Game Hero',
    fileName: '130_greats_of_the_game_hero.png',
    src: '/fut-cards/templates/130_greats_of_the_game_hero.png',
    category: 'icons_heroes',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#8b5cf6',
  },
  {
    id: '131_greats_of_the_game_icon',
    name: 'Greats Of The Game Icon',
    fileName: '131_greats_of_the_game_icon.png',
    src: '/fut-cards/templates/131_greats_of_the_game_icon.png',
    category: 'icons_heroes',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#fbbf24',
  },
  {
    id: '148_fut_birthday_hero',
    name: 'FUT Birthday Hero',
    fileName: '148_fut_birthday_hero.png',
    src: '/fut-cards/templates/148_fut_birthday_hero.png',
    category: 'icons_heroes',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#ec4899',
  },
  {
    id: '149_fut_birthday_icon',
    name: 'FUT Birthday Icon',
    fileName: '149_fut_birthday_icon.png',
    src: '/fut-cards/templates/149_fut_birthday_icon.png',
    category: 'icons_heroes',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#f43f5e',
  },
  {
    id: '76_trophy_titans_icon',
    name: 'Trophy Titans Icon',
    fileName: '76_trophy_titans_icon.png',
    src: '/fut-cards/templates/76_trophy_titans_icon.png',
    category: 'icons_heroes',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#eab308',
  },
  {
    id: '77_trophy_titans_hero',
    name: 'Trophy Titans Hero',
    fileName: '77_trophy_titans_hero.png',
    src: '/fut-cards/templates/77_trophy_titans_hero.png',
    category: 'icons_heroes',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#f59e0b',
  },
  {
    id: '116_captains_icon',
    name: 'Captains Icon (Thủ Lĩnh)',
    fileName: '116_captains_icon.png',
    src: '/fut-cards/templates/116_captains_icon.png',
    category: 'icons_heroes',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#eab308',
  },
  {
    id: '139_futties_icon',
    name: 'Futties Icon Hồng',
    fileName: '139_futties_icon.png',
    src: '/fut-cards/templates/139_futties_icon.png',
    category: 'icons_heroes',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#f43f5e',
  },
  {
    id: '14_knockout_royalty_hero',
    name: 'Knockout Royalty Hero',
    fileName: '14_knockout_royalty_hero.png',
    src: '/fut-cards/templates/14_knockout_royalty_hero.png',
    category: 'icons_heroes',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#a855f7',
  },
  {
    id: '15_knockout_royalty_icon',
    name: 'Knockout Royalty Icon',
    fileName: '15_knockout_royalty_icon.png',
    src: '/fut-cards/templates/15_knockout_royalty_icon.png',
    category: 'icons_heroes',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#fbbf24',
  },
  {
    id: '135_fantasy_fc_hero',
    name: 'Fantasy FC Hero',
    fileName: '135_fantasy_fc_hero.png',
    src: '/fut-cards/templates/135_fantasy_fc_hero.png',
    category: 'icons_heroes',
    textTheme: 'light',
    textColor: '#ffffff',
    accentColor: '#06b6d4',
  },
];

// ── Nations (Vietnam only as requested) ────────────────────────────
export const NATIONS: NationOption[] = [
  { id: 'vietnam', name: 'Việt Nam 🇻🇳', flagUrl: '/fut-cards/nations/Vietnam.png' },
];

// ── Clubs (Cham Het FC default / hidden from UI) ───────────────────
export const CLUBS: ClubOption[] = [
  { id: 'cham_het', name: 'Chấm Hết FC ⚽', logoUrl: '/fut-cards/clubs/cham_het_fc.png' },
];

// ── Leagues ────────────────────────────────────────────────────────
export const LEAGUES = [
  { id: 'cham_het_league', name: 'Chấm Hết Super League 🏆', icon: '🏆' },
];

// ── PlayStyles+ ────────────────────────────────────────────────────
export const PLAYSTYLES_PLUS: PlayStyleOption[] = [
  { id: 'finesse_shot', name: 'Finesse Shot+', shortName: 'Finesse', category: 'Shooting', color: '#38bdf8' },
  { id: 'technical', name: 'Technical+', shortName: 'Technical', category: 'Ball Control', color: '#f59e0b' },
  { id: 'rapid', name: 'Rapid+', shortName: 'Rapid', category: 'Pace', color: '#ec4899' },
  { id: 'power_shot', name: 'Power Shot+', shortName: 'Power', category: 'Shooting', color: '#ef4444' },
  { id: 'dead_ball', name: 'Dead Ball+', shortName: 'Dead Ball', category: 'Passing', color: '#10b981' },
  { id: 'relentless', name: 'Relentless+', shortName: 'Relentless', category: 'Physical', color: '#8b5cf6' },
  { id: 'intercept', name: 'Intercept+', shortName: 'Intercept', category: 'Defending', color: '#06b6d4' },
  { id: 'block', name: 'Block+', shortName: 'Block', category: 'Defending', color: '#6366f1' },
  { id: 'quick_step', name: 'Quick Step+', shortName: 'Quick Step', category: 'Pace', color: '#f97316' },
  { id: 'trickster', name: 'Trickster+', shortName: 'Trickster', category: 'Skill', color: '#d946ef' },
  { id: 'long_ball', name: 'Long Ball Pass+', shortName: 'Long Ball', category: 'Passing', color: '#84cc16' },
  { id: 'power_header', name: 'Power Header+', shortName: 'Header', category: 'Physical', color: '#eab308' },
];

// ── Positions ──────────────────────────────────────────────────────
export const POSITIONS = [
  { group: 'Tiền Đạo (Attackers)', items: ['ST', 'CF', 'RW', 'LW'] },
  { group: 'Tiền Vệ (Midfielders)', items: ['CAM', 'CM', 'CDM', 'RM', 'LM'] },
  { group: 'Hậu Vệ (Defenders)', items: ['CB', 'LB', 'RB', 'LWB', 'RWB'] },
  { group: 'Thủ Môn (Goalkeeper)', items: ['GK'] },
];

// ── Helper: Calculate stats from player DB record ──────────────────
export function calculateFutStatsFromPlayer(player: {
  name: string;
  jerseyNumber?: number | string | null;
  wins?: number;
  losses?: number;
  draws?: number;
  totalMatches?: number;
  winRate?: number;
  isInjuryProne?: boolean;
  birthYear?: number;
}): {
  rating: number;
  faceStats: FaceStats;
  ratingScore: number;
} {
  const wins = Number(player.wins || 0);
  const losses = Number(player.losses || 0);
  const draws = Number(player.draws || 0);
  const total = (player.totalMatches && player.totalMatches > 0) ? player.totalMatches : (wins + losses + draws);
  const winRate = player.winRate != null && player.winRate >= 0
    ? Math.round(player.winRate)
    : total > 0
    ? Math.round((wins / total) * 100)
    : 0;

  const currentYear = new Date().getFullYear();
  const birthYear = player.birthYear || 1998;
  const yo = Math.max(16, currentYear - birthYear);
  const rawJersey = player.jerseyNumber;
  const jerseyNo = (rawJersey != null && rawJersey !== '' && rawJersey !== 0 && rawJersey !== '0' && rawJersey !== '?')
    ? rawJersey
    : '?';

  // Overall rating (OVR)
  let ovr = 75;
  if (winRate >= 75) ovr = 90;
  else if (winRate >= 60) ovr = 86;
  else if (winRate >= 50) ovr = 82;
  else if (winRate >= 40) ovr = 78;
  else ovr = 74;

  if (total >= 40) ovr += 4;
  else if (total >= 20) ovr += 3;
  else if (total >= 10) ovr += 2;

  ovr = Math.min(99, Math.max(65, ovr));
  const ratingScore = parseFloat((ovr - 2.5 + (winRate / 20)).toFixed(1));

  return {
    rating: ovr,
    faceStats: {
      wr: winRate,
      w: wins,
      d: draws,
      l: losses,
      p: total,
      no: jerseyNo,
      yo,
      birthYear,
    },
    ratingScore,
  };
}

export const DEFAULT_PLAYER_AVATAR = '/fut-cards/players/unknown.webp';

export const DEFAULT_CARD_STATE: PlayerCardCustomState = {
  templateId: 'rare_gold',
  rating: 88,
  position: 'RW',
  roleIntensity: '++',
  altPositions: ['CAM', 'LW'],
  playerName: 'CHẤM HẾT FC',
  jerseyNumber: 10,
  isInjuryProne: false,
  avatarUrl: DEFAULT_PLAYER_AVATAR,
  scale: 0.85,
  offsetX: 6,
  offsetY: 22,
  faceStats: {
    wr: 68,
    w: 12,
    d: 4,
    l: 3,
    p: 19,
    no: 10,
    yo: 28,
    birthYear: 1998,
  },
  skills: 4,
  weakFoot: 4,
  preferredFoot: 'R',
  ratingScore: 88.5,
  nationId: 'vietnam',
  clubId: 'cham_het',
  leagueId: 'cham_het_league',
  playStylePlusId: 'technical',
  showClub: true,
  showNation: true,
  showLeague: false,
  showStats: true,
  showPlayStyle: false,
  showAltPositions: true,
  altPositionTextColor: '#ffffff',
  altPositionBorderColor: '#ffffff',
  altPositionBgColor: '#623B91',
};
