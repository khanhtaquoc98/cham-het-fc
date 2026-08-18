import { supabase } from '@/lib/supabase';
import { MatchHistory, PlayerStat, PlayerStatsSummary, MatchResult, PlayerResult } from '@/types/history';
import { Team } from '@/types/match';
import { getPlayers, updatePlayer } from '@/lib/players';

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

export async function updateMatchHistoryScore(
  id: string,
  homeScore: number,
  awayScore: number,
  extraScore: number | null = null,
): Promise<MatchHistory | null> {
  // Fetch existing match
  const { data: existing, error: fetchErr } = await supabase
    .from('match_history')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) {
    console.error('Match not found for update:', fetchErr);
    return null;
  }

  // Determine result
  let result: MatchResult;
  if (extraScore !== null && extraScore !== undefined) {
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

  // Update match_history table
  const { data: updated, error: updateErr } = await supabase
    .from('match_history')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      extra_score: extraScore,
      result,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateErr || !updated) {
    console.error('Failed to update match score:', updateErr);
    return null;
  }

  const matchHistory: MatchHistory = {
    id: updated.id,
    matchDate: updated.match_date,
    matchTime: updated.match_time,
    venue: updated.venue,
    homeScore: updated.home_score,
    awayScore: updated.away_score,
    extraScore: updated.extra_score,
    result: updated.result as MatchResult,
    teams: updated.teams || [],
    createdAt: updated.created_at,
  };

  // Clear existing player_stats for this match and re-save with new result
  await supabase.from('player_stats').delete().eq('match_history_id', id);
  await savePlayerStatsForMatch(matchHistory);

  return matchHistory;
}

// ==========================================
// PLAYER STATS
// ==========================================

async function savePlayerStatsForMatch(match: MatchHistory): Promise<void> {
  try {
    const players = await getPlayers().catch(() => []);
    const stats: Omit<PlayerStat, 'id' | 'createdAt'>[] = [];

    for (let i = 0; i < match.teams.length; i++) {
      const team = match.teams[i];
      const teamUpper = (team.name || '').toUpperCase();
      const isHome = i === 0 || teamUpper.includes('HOME') || teamUpper.includes('CHAMHETFC');
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
        playerResult = isHome ? 'win' : 'lose';
      } else {
        // away_win
        playerResult = isHome ? 'lose' : 'win';
      }

      for (const player of team.players || []) {
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
        console.warn('Could not insert into player_stats (table may not exist in DB yet):', error.message);
      }
    }
  } catch (err) {
    console.warn('savePlayerStatsForMatch caught error:', err);
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

  // Priority 2: Exact MAIN NAME match
  const normalized = playerName.trim().toLowerCase();
  const exactNameMatch = playerConfigs.find(c => (c.name || '').trim().toLowerCase() === normalized);
  if (exactNameMatch) return { id: exactNameMatch.id };

  // Priority 3: match by subNames
  for (const config of playerConfigs) {
    for (const sub of config.subNames || []) {
      if (sub.trim().toLowerCase() === normalized) return { id: config.id };
    }
  }
  return null;
}

/**
 * Fallback computation of player stats summary directly from match_history table.
 * Used when player_stats table does not exist or has 0 rows.
 */
async function computePlayerStatsFromMatchHistory(page: number = 1, pageSize: number = 10): Promise<{
  players: PlayerStatsSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { data: matches, error } = await supabase
    .from('match_history')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !matches || matches.length === 0) {
    if (error) console.error('Failed to fetch match_history for fallback player stats:', error);
    return { players: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const registeredPlayers = await getPlayers().catch(() => []);
  const playerMap = new Map<string, PlayerStatsSummary>();

  for (const match of matches) {
    const teams = match.teams || [];
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      const teamUpper = (team.name || '').toUpperCase();
      const isHome = i === 0 || teamUpper.includes('HOME') || teamUpper.includes('CHAMHETFC');
      let playerResult: PlayerResult = 'lose';

      if (match.result === 'extra_win') {
        playerResult = teamUpper.includes('EXTRA') ? 'win' : 'lose';
      } else if (match.result === 'draw') {
        playerResult = 'draw';
      } else if (match.result === 'home_win') {
        playerResult = isHome ? 'win' : 'lose';
      } else if (match.result === 'away_win') {
        playerResult = isHome ? 'lose' : 'win';
      }

      for (const player of (team.players || [])) {
        const pName = (player.name || '').trim();
        if (!pName) continue;

        const matchedConfig = findMatchingPlayerConfig(pName, player.telegramHandle, registeredPlayers);
        const playerId = matchedConfig?.id || null;

        const key = playerId ? `id:${playerId}` : `name:${pName.toLowerCase()}`;

        let summary = playerMap.get(key);
        if (!summary) {
          const registeredName = registeredPlayers.find(r => r.id === playerId)?.name;
          summary = {
            playerName: registeredName || pName,
            playerId: playerId,
            wins: 0,
            draws: 0,
            losses: 0,
            totalMatches: 0,
            winRate: 0,
          };
          playerMap.set(key, summary);
        }

        if (playerResult === 'win') summary.wins++;
        else if (playerResult === 'draw') summary.draws++;
        else if (playerResult === 'lose') summary.losses++;
        summary.totalMatches++;
      }
    }
  }

  const allPlayers = Array.from(playerMap.values()).map((p) => ({
    ...p,
    winRate: p.totalMatches > 0 ? Math.round((p.wins / p.totalMatches) * 100) : 0,
  }));

  allPlayers.sort((a, b) => {
    const aUnlinked = !a.playerId ? 1 : 0;
    const bUnlinked = !b.playerId ? 1 : 0;
    if (aUnlinked !== bUnlinked) return bUnlinked - aUnlinked;
    return b.totalMatches - a.totalMatches || b.winRate - a.winRate;
  });

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

export async function getPlayerStatsSummary(page: number = 1, pageSize: number = 10): Promise<{
  players: PlayerStatsSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('player_name, player_id, result');

    if (error || !data || data.length === 0) {
      return computePlayerStatsFromMatchHistory(page, pageSize);
    }

    const playerMap = new Map<string, PlayerStatsSummary>();

    for (const row of data) {
      const key = row.player_id
        ? `id:${row.player_id}`
        : `name:${row.player_name.toLowerCase().trim()}`;

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

      if (!summary.playerId && row.player_id) {
        summary.playerId = row.player_id;
      }

      if (row.result === 'win') summary.wins++;
      else if (row.result === 'draw') summary.draws++;
      else if (row.result === 'lose') summary.losses++;
      summary.totalMatches++;
    }

    const allPlayers = Array.from(playerMap.values()).map((p) => ({
      ...p,
      winRate: p.totalMatches > 0 ? Math.round((p.wins / p.totalMatches) * 100) : 0,
    }));

    allPlayers.sort((a, b) => {
      const aUnlinked = !a.playerId ? 1 : 0;
      const bUnlinked = !b.playerId ? 1 : 0;
      if (aUnlinked !== bUnlinked) return bUnlinked - aUnlinked;
      return b.totalMatches - a.totalMatches || b.winRate - a.winRate;
    });

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
  } catch (err) {
    console.warn('getPlayerStatsSummary caught error, using fallback:', err);
    return computePlayerStatsFromMatchHistory(page, pageSize);
  }
}

/**
 * Fallback match history for a single player directly from match_history table.
 */
async function computePlayerMatchHistoryFromMatchHistory(playerName: string, page: number = 1, pageSize: number = 10) {
  const normalizedName = playerName.trim().toLowerCase();
  const { data: matches, error } = await supabase
    .from('match_history')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !matches) {
    return { matches: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const results: (PlayerStat & { matchHistory?: MatchHistory })[] = [];

  for (const match of matches) {
    const matchHistory: MatchHistory = {
      id: match.id,
      matchDate: match.match_date,
      matchTime: match.match_time,
      venue: match.venue,
      homeScore: match.home_score,
      awayScore: match.away_score,
      extraScore: match.extra_score,
      result: match.result as MatchResult,
      teams: match.teams || [],
      createdAt: match.created_at,
    };

    for (let i = 0; i < matchHistory.teams.length; i++) {
      const team = matchHistory.teams[i];
      const teamUpper = (team.name || '').toUpperCase();
      const isHome = i === 0 || teamUpper.includes('HOME') || teamUpper.includes('CHAMHETFC');
      let playerResult: PlayerResult = 'lose';

      if (match.result === 'extra_win') {
        playerResult = teamUpper.includes('EXTRA') ? 'win' : 'lose';
      } else if (match.result === 'draw') {
        playerResult = 'draw';
      } else if (match.result === 'home_win') {
        playerResult = isHome ? 'win' : 'lose';
      } else if (match.result === 'away_win') {
        playerResult = isHome ? 'lose' : 'win';
      }

      for (const player of (team.players || [])) {
        if ((player.name || '').trim().toLowerCase() === normalizedName) {
          results.push({
            id: `${match.id}-${player.name}`,
            matchHistoryId: match.id,
            playerName: player.name,
            teamName: team.name,
            result: playerResult,
            createdAt: match.created_at,
            matchHistory,
          });
        }
      }
    }
  }

  const total = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize;
  const paged = results.slice(from, from + pageSize);

  return {
    matches: paged,
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
  try {
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

    if (error || !data || data.length === 0) {
      return computePlayerMatchHistoryFromMatchHistory(playerName, page, pageSize);
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
  } catch (err) {
    return computePlayerMatchHistoryFromMatchHistory(playerName, page, pageSize);
  }
}

export async function updatePlayerStatsPlayerId(playerName: string, playerId: string): Promise<boolean> {
  try {
    let updated = false;

    // 1. Link by adding playerName as a subName to the registered player in `players` table
    const registeredPlayers = await getPlayers().catch(() => []);
    const targetPlayer = registeredPlayers.find(p => p.id === playerId);
    if (targetPlayer) {
      const normName = playerName.trim();
      const subs = targetPlayer.subNames || [];
      const exists = subs.some(s => s.trim().toLowerCase() === normName.toLowerCase());
      if (!exists) {
        const updatedSubs = [...subs, normName];
        await updatePlayer(playerId, { subNames: updatedSubs });
      }
      updated = true;
    }

    // 2. Also try updating player_stats table if it exists in DB
    const { error } = await supabase
      .from('player_stats')
      .update({ player_id: playerId })
      .ilike('player_name', playerName.trim().toLowerCase());

    if (!error) {
      updated = true;
    }

    return updated;
  } catch (err) {
    console.error('Error in updatePlayerStatsPlayerId:', err);
    return false;
  }
}

