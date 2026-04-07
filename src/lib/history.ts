import { supabase } from '@/lib/supabase';
import { MatchHistory, PlayerStat, PlayerStatsSummary, MatchResult, PlayerResult } from '@/types/history';
import { Team } from '@/types/match';
import { getPlayers } from '@/lib/players';

// ==========================================
// MATCH HISTORY
// ==========================================

export async function getMatchHistory(page: number = 1, pageSize: number = 10): Promise<{
  matches: MatchHistory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { count } = await supabase
    .from('match_history')
    .select('*', { count: 'exact', head: true });

  const { data, error } = await supabase
    .from('match_history')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error || !data) {
    console.error('Failed to fetch match history:', error);
    return { matches: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const matches: MatchHistory[] = data.map((row) => ({
    id: row.id,
    matchDate: row.match_date,
    matchTime: row.match_time,
    venue: row.venue,
    homeScore: row.home_score,
    awayScore: row.away_score,
    extraScore: row.extra_score,
    result: row.result as MatchResult,
    teams: row.teams || [],
    createdAt: row.created_at,
  }));

  const total = count || 0;

  return {
    matches,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function saveMatchHistory(
  homeScore: number,
  awayScore: number,
  extraScore: number | null,
  teams: Team[],
  matchDate?: string,
  matchTime?: string,
  venue?: string,
): Promise<MatchHistory | null> {
  // Determine result
  let result: MatchResult;
  if (extraScore !== null && extraScore !== undefined) {
    // 3-team mode: compare all scores to find actual winner
    const scores = [
      { team: 'home_win' as MatchResult, score: homeScore },
      { team: 'away_win' as MatchResult, score: awayScore },
      { team: 'extra_win' as MatchResult, score: extraScore },
    ];
    scores.sort((a, b) => b.score - a.score);
    if (scores[0].score > scores[1].score) {
      result = scores[0].team;
    } else {
      result = 'draw';
    }
  } else if (homeScore > awayScore) {
    result = 'home_win';
  } else if (awayScore > homeScore) {
    result = 'away_win';
  } else {
    result = 'draw';
  }

  const { data, error } = await supabase
    .from('match_history')
    .insert({
      match_date: matchDate || null,
      match_time: matchTime || null,
      venue: venue || null,
      home_score: homeScore,
      away_score: awayScore,
      extra_score: extraScore,
      result,
      teams,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to save match history:', error);
    return null;
  }

  const matchHistory: MatchHistory = {
    id: data.id,
    matchDate: data.match_date,
    matchTime: data.match_time,
    venue: data.venue,
    homeScore: data.home_score,
    awayScore: data.away_score,
    extraScore: data.extra_score,
    result: data.result as MatchResult,
    teams: data.teams || [],
    createdAt: data.created_at,
  };

  // Save player stats for this match
  await savePlayerStatsForMatch(matchHistory);

  return matchHistory;
}

// ==========================================
// PLAYER STATS
// ==========================================

async function savePlayerStatsForMatch(match: MatchHistory): Promise<void> {
  const players = await getPlayers();
  const stats: Omit<PlayerStat, 'id' | 'createdAt'>[] = [];

  for (const team of match.teams) {
    const teamUpper = team.name.toUpperCase();
    let playerResult: PlayerResult;

    if (match.result === 'extra_win') {
      if (teamUpper.includes('EXTRA')) {
        playerResult = 'win';
      } else {
        playerResult = 'lose';
      }
    } else if (match.result === 'draw') {
      playerResult = 'draw';
    } else if (match.result === 'home_win') {
      playerResult = teamUpper.includes('HOME') ? 'win' : 'lose';
    } else {
      // away_win
      playerResult = teamUpper.includes('AWAY') ? 'win' : 'lose';
    }

    for (const player of team.players) {
      // Try to find the registered player
      const matchedPlayer = findMatchingPlayerConfig(player.name, player.telegramHandle, players);

      stats.push({
        matchHistoryId: match.id,
        playerName: player.name,
        playerId: matchedPlayer?.id || null,
        teamName: team.name,
        result: playerResult,
      });
    }
  }

  if (stats.length > 0) {
    const rows = stats.map((s) => ({
      match_history_id: s.matchHistoryId,
      player_name: s.playerName,
      player_id: s.playerId,
      team_name: s.teamName,
      result: s.result,
    }));

    const { error } = await supabase.from('player_stats').insert(rows);
    if (error) {
      console.error('Failed to save player stats:', error);
    }
  }
}

function findMatchingPlayerConfig(
  playerName: string,
  telegramHandle: string | undefined,
  playerConfigs: { id: string; name: string; subNames: string[]; telegramHandle: string }[],
): { id: string } | null {
  // Priority 1: match by telegramHandle
  if (telegramHandle) {
    const normalizedHandle = telegramHandle.trim().toLowerCase().replace(/^@/, '');
    for (const config of playerConfigs) {
      if (config.telegramHandle) {
        const configHandle = config.telegramHandle.trim().toLowerCase().replace(/^@/, '');
        if (configHandle === normalizedHandle) return { id: config.id };
      }
    }
  }

  // Priority 2: match by subNames
  const normalized = playerName.trim().toLowerCase();
  for (const config of playerConfigs) {
    for (const sub of config.subNames) {
      if (sub.trim().toLowerCase() === normalized) return { id: config.id };
    }
  }
  return null;
}

export async function getPlayerStatsSummary(page: number = 1, pageSize: number = 10): Promise<{
  players: PlayerStatsSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  // Get all player stats, group by player
  const { data, error } = await supabase
    .from('player_stats')
    .select('player_name, player_id, result');

  if (error || !data) {
    console.error('Failed to fetch player stats:', error);
    return { players: [], total: 0, page, pageSize, totalPages: 0 };
  }

  // Group by player_name (using distinct name)
  const playerMap = new Map<string, PlayerStatsSummary>();

  for (const row of data) {
    const key = row.player_name.toLowerCase().trim();
    let summary = playerMap.get(key);
    if (!summary) {
      summary = {
        playerName: row.player_name,
        playerId: row.player_id,
        wins: 0,
        draws: 0,
        losses: 0,
        totalMatches: 0,
        winRate: 0,
      };
      playerMap.set(key, summary);
    }

    // Update player_id if it was null before but now we have it
    if (!summary.playerId && row.player_id) {
      summary.playerId = row.player_id;
    }

    if (row.result === 'win') summary.wins++;
    else if (row.result === 'draw') summary.draws++;
    else if (row.result === 'lose') summary.losses++;
    summary.totalMatches++;
  }

  // Calculate win rates
  const allPlayers = Array.from(playerMap.values()).map((p) => ({
    ...p,
    winRate: p.totalMatches > 0 ? Math.round((p.wins / p.totalMatches) * 100) : 0,
  }));

  // Sort by total matches desc, then win rate desc
  allPlayers.sort((a, b) => b.totalMatches - a.totalMatches || b.winRate - a.winRate);

  const total = allPlayers.length;
  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize;
  const paged = allPlayers.slice(from, from + pageSize);

  return {
    players: paged,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getPlayerMatchHistory(playerName: string, page: number = 1, pageSize: number = 10): Promise<{
  matches: (PlayerStat & { matchHistory?: MatchHistory })[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const normalizedName = playerName.trim().toLowerCase();

  const { count } = await supabase
    .from('player_stats')
    .select('*', { count: 'exact', head: true })
    .ilike('player_name', normalizedName);

  const { data, error } = await supabase
    .from('player_stats')
    .select('*, match_history(*)')
    .ilike('player_name', normalizedName)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error || !data) {
    return { matches: [], total: 0, page, pageSize, totalPages: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = data.map((row: any) => ({
    id: row.id,
    matchHistoryId: row.match_history_id,
    playerName: row.player_name,
    playerId: row.player_id,
    teamName: row.team_name,
    result: row.result as PlayerResult,
    createdAt: row.created_at,
    matchHistory: row.match_history ? {
      id: row.match_history.id,
      matchDate: row.match_history.match_date,
      matchTime: row.match_history.match_time,
      venue: row.match_history.venue,
      homeScore: row.match_history.home_score,
      awayScore: row.match_history.away_score,
      extraScore: row.match_history.extra_score,
      result: row.match_history.result as MatchResult,
      teams: row.match_history.teams || [],
      createdAt: row.match_history.created_at,
    } : undefined,
  }));

  const total = count || 0;

  return {
    matches,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function updatePlayerStatsPlayerId(playerName: string, playerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('player_stats')
    .update({ player_id: playerId })
    .ilike('player_name', playerName.trim().toLowerCase());

  if (error) {
    console.error('Failed to update player_id:', error);
    return false;
  }
  return true;
}
