import { Team } from './match';

export type MatchResult = 'home_win' | 'away_win' | 'extra_win' | 'draw';
export type PlayerResult = 'win' | 'lose' | 'draw';

export interface MatchHistory {
  id: string;
  matchDate?: string;
  matchTime?: string;
  venue?: string;
  homeScore: number;
  awayScore: number;
  extraScore?: number | null;
  result: MatchResult;
  teams: Team[];
  createdAt: string;
}

export interface PlayerStat {
  id: string;
  matchHistoryId: string;
  playerName: string;
  playerId?: string | null; // links to registered player
  teamName: string;
  result: PlayerResult;
  createdAt: string;
}

export interface PlayerStatsSummary {
  playerName: string;
  playerId?: string | null;
  wins: number;
  draws: number;
  losses: number;
  totalMatches: number;
  winRate: number; // percentage
}
