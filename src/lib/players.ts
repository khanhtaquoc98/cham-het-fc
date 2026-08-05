import { PlayerConfig } from '@/types/player';
import { DEFAULT_PLAYERS } from '@/lib/default-players';
import { supabase } from '@/lib/supabase';

export async function getPlayers(): Promise<PlayerConfig[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*');

  if (error) {
    console.error('Error fetching players from Supabase:', error);
  }

  const dbPlayers: PlayerConfig[] = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    subNames: Array.isArray(row.sub_names)
      ? row.sub_names
      : typeof row.sub_names === 'string'
      ? (() => { try { return JSON.parse(row.sub_names); } catch (e) { return []; } })()
      : [],
    telegramHandle: row.telegram_handle || '',
    jerseyNumber: row.jersey_number,
    updatedAt: row.created_at || null,
    avatarVersion: row.avatar_version || null,
  }));

  // Create sets for fast lookup
  const dbPlayerIds = new Set(dbPlayers.map((p) => p.id));
  const dbPlayerNames = new Set(dbPlayers.map((p) => p.name.trim().toLowerCase()));

  // Include DEFAULT_PLAYERS that have not been overridden/created in DB yet
  const missingDefaultPlayers = DEFAULT_PLAYERS.filter(
    (def) => !dbPlayerIds.has(def.id) && !dbPlayerNames.has(def.name.trim().toLowerCase())
  );

  return [...dbPlayers, ...missingDefaultPlayers];
}

export async function savePlayers(players: PlayerConfig[]): Promise<void> {
  // Delete all existing and re-insert
  await supabase.from('players').delete().neq('id', '');

  const rows = players.map((p) => ({
    id: p.id,
    name: p.name,
    sub_names: p.subNames,
    telegram_handle: p.telegramHandle || '',
    jersey_number: p.jerseyNumber,
    avatar_version: p.avatarVersion || null,
  }));

  const { error } = await supabase.from('players').insert(rows);
  if (error) {
    console.error('Failed to save players:', error);
  }
}

export async function addPlayer(player: Omit<PlayerConfig, 'id'>): Promise<PlayerConfig> {
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  const rowData: Record<string, unknown> = {
    id,
    name: player.name,
    sub_names: player.subNames || [],
    telegram_handle: player.telegramHandle || '',
    jersey_number: player.jerseyNumber ?? null,
  };

  const { error } = await supabase.from('players').insert(rowData);

  if (error) {
    console.error('Failed to add player:', error);
  }

  return { ...player, id, telegramHandle: player.telegramHandle || '' };
}

export async function updatePlayer(id: string, data: Partial<Omit<PlayerConfig, 'id'>>): Promise<PlayerConfig | null> {
  // Build update object with snake_case keys
  const updateObj: Record<string, unknown> = {};
  if (data.name !== undefined) updateObj.name = data.name;
  if (data.subNames !== undefined) updateObj.sub_names = data.subNames;
  if (data.telegramHandle !== undefined) updateObj.telegram_handle = data.telegramHandle;
  if (data.jerseyNumber !== undefined) updateObj.jersey_number = data.jerseyNumber;
  if (data.avatarVersion !== undefined) updateObj.avatar_version = data.avatarVersion;

  // Try standard update first
  let { data: updated, error } = await supabase
    .from('players')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single();

  // Retry without avatar_version if column does not exist in DB
  if (error && error.message?.includes('avatar_version')) {
    delete updateObj.avatar_version;
    const retryRes = await supabase
      .from('players')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single();
    updated = retryRes.data;
    error = retryRes.error;
  }

  if (!error && updated) {
    return {
      id: updated.id,
      name: updated.name,
      subNames: updated.sub_names || [],
      telegramHandle: updated.telegram_handle || '',
      jerseyNumber: updated.jersey_number,
      avatarVersion: updated.avatar_version || null,
    };
  }

  // Fallback: If row doesn't exist in Supabase DB yet (e.g. came from DEFAULT_PLAYERS), upsert it!
  const defaultPlayer = DEFAULT_PLAYERS.find(p => p.id === id);
  const newName = (data.name !== undefined ? data.name : defaultPlayer?.name) || 'Unknown';
  const newSubNames = data.subNames !== undefined ? data.subNames : (defaultPlayer?.subNames || []);
  const newTele = data.telegramHandle !== undefined ? data.telegramHandle : (defaultPlayer?.telegramHandle || '');
  const newJersey = data.jerseyNumber !== undefined ? data.jerseyNumber : (defaultPlayer?.jerseyNumber ?? null);
  const newAvatarVer = data.avatarVersion !== undefined ? data.avatarVersion : null;

  const upsertRow: Record<string, unknown> = {
    id,
    name: newName,
    sub_names: newSubNames,
    telegram_handle: newTele,
    jersey_number: newJersey,
    avatar_version: newAvatarVer,
  };

  let { data: upserted, error: upsertError } = await supabase
    .from('players')
    .upsert(upsertRow, { onConflict: 'id' })
    .select()
    .single();

  if (upsertError && upsertError.message?.includes('avatar_version')) {
    delete upsertRow.avatar_version;
    const retryRes = await supabase
      .from('players')
      .upsert(upsertRow, { onConflict: 'id' })
      .select()
      .single();
    upserted = retryRes.data;
    upsertError = retryRes.error;
  }

  if (upsertError || !upserted) {
    console.error('Failed to update/upsert player:', error || upsertError);
    return null;
  }

  return {
    id: upserted.id,
    name: upserted.name,
    subNames: upserted.sub_names || [],
    telegramHandle: upserted.telegram_handle || '',
    jerseyNumber: upserted.jersey_number,
    avatarVersion: upserted.avatar_version || null,
  };
}

export async function deletePlayer(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from('players')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    console.error('Failed to delete player:', error);
    return false;
  }

  return (count ?? 0) > 0;
}

/**
 * Find a player config by matching:
 * 1. First check telegramHandle (priority)
 * 2. Then check subNames
 */
export async function findPlayerByName(name: string, telegramHandle?: string): Promise<PlayerConfig | null> {
  const players = await getPlayers();

  // Priority 1: match by telegramHandle if provided
  if (telegramHandle) {
    const normalizedHandle = telegramHandle.trim().toLowerCase().replace(/^@/, '');
    for (const player of players) {
      if (player.telegramHandle) {
        const configHandle = player.telegramHandle.trim().toLowerCase().replace(/^@/, '');
        if (configHandle === normalizedHandle) {
          return player;
        }
      }
    }
  }

  // Priority 2: match by subNames
  const normalizedName = name.trim().toLowerCase();
  for (const player of players) {
    for (const sub of player.subNames) {
      if (sub.trim().toLowerCase() === normalizedName) {
        return player;
      }
    }
  }
  return null;
}

export function findMatchingPlayer(
  playerName: string,
  telegramHandle?: string,
  playerId?: string,
  playerConfigs: PlayerConfig[] = []
): PlayerConfig | null {
  if (!playerConfigs || playerConfigs.length === 0) return null;

  // Priority 0: Explicit playerId match if linked
  if (playerId) {
    const idMatch = playerConfigs.find(c => c.id === playerId);
    if (idMatch) return idMatch;
  }

  // Priority 1: Match by telegramHandle if provided
  if (telegramHandle) {
    const normalizedHandle = telegramHandle.trim().toLowerCase().replace(/^@/, '');
    for (const config of playerConfigs) {
      if (config.telegramHandle) {
        const configHandle = config.telegramHandle.trim().toLowerCase().replace(/^@/, '');
        if (configHandle === normalizedHandle) return config;
      }
    }
  }

  // Priority 2: Exact MAIN NAME match
  const normalized = playerName.trim().toLowerCase();
  const exactNameMatch = playerConfigs.find(c => c.name.trim().toLowerCase() === normalized);
  if (exactNameMatch) return exactNameMatch;

  // Priority 3: match by subNames
  for (const config of playerConfigs) {
    if (config.subNames) {
      for (const sub of config.subNames) {
        if (sub.trim().toLowerCase() === normalized) return config;
      }
    }
  }
  return null;
}

export function isDuplicateWithTeleVoters(
  player: { name: string; telegramHandle?: string; playerId?: string },
  teleVoters: string[],
  playerConfigs: PlayerConfig[] = []
): boolean {
  if (!player || !teleVoters || teleVoters.length === 0) return false;

  const rawPName = player.name ? player.name.trim() : '';
  const normPName = rawPName.toLowerCase().replace(/^@/, '');
  const normPHandle = player.telegramHandle ? player.telegramHandle.trim().toLowerCase().replace(/^@/, '') : '';

  let pConfig: PlayerConfig | null = null;
  if (playerConfigs && playerConfigs.length > 0 && rawPName) {
    pConfig = findMatchingPlayer(rawPName, player.telegramHandle, player.playerId, playerConfigs);
  }

  for (const rawTeleVoter of teleVoters) {
    if (!rawTeleVoter) continue;
    // Strip trailing index if any (e.g. "Phúc em 1" -> "Phúc em")
    const teleVoter = rawTeleVoter.replace(/\s+\d+$/, '').trim();
    const normTele = teleVoter.toLowerCase().replace(/^@/, '');

    if (!normTele) continue;

    // 1. Direct name match
    if (normPName && normPName === normTele) return true;

    // 2. Handle match
    if (normPHandle && normPHandle === normTele) return true;

    // 3. Match via playerConfigs
    if (playerConfigs && playerConfigs.length > 0) {
      const teleConfig = findMatchingPlayer(teleVoter, undefined, undefined, playerConfigs);
      if (teleConfig && pConfig) {
        if (teleConfig.id === pConfig.id || teleConfig.name.toLowerCase() === pConfig.name.toLowerCase()) {
          return true;
        }
      }
    }
  }

  return false;
}

