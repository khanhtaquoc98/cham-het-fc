import { PlayerConfig } from '@/types/player';
import { DEFAULT_PLAYERS } from '@/lib/default-players';
import { supabase } from '@/lib/supabase';

export async function getPlayers(): Promise<PlayerConfig[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) {
    return [...DEFAULT_PLAYERS];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    subNames: row.sub_names || [],
    telegramHandle: row.telegram_handle || '',
    jerseyNumber: row.jersey_number,
    updatedAt: row.created_at || null,
    avatarVersion: row.avatar_version || null,
  }));
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

  const { error } = await supabase.from('players').insert({
    id,
    name: player.name,
    sub_names: player.subNames || [],
    telegram_handle: player.telegramHandle || '',
    jersey_number: player.jerseyNumber,
  });

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
  const { data: updated, error } = await supabase
    .from('players')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single();

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

  const upsertRow = {
    id,
    name: newName,
    sub_names: newSubNames,
    telegram_handle: newTele,
    jersey_number: newJersey,
    avatar_version: newAvatarVer,
  };

  const { data: upserted, error: upsertError } = await supabase
    .from('players')
    .upsert(upsertRow, { onConflict: 'id' })
    .select()
    .single();

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
