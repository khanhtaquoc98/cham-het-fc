import { supabase } from '@/lib/supabase';
import { PlayerCardCustomState, DEFAULT_PLAYER_AVATAR } from '@/lib/fut-card-config';

const CARD_CONFIGS_KEY = 'player_card_configs';

/**
 * Fetch all player card configurations from database
 */
export async function getAllPlayerCardConfigs(): Promise<Record<string, PlayerCardCustomState>> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', CARD_CONFIGS_KEY)
      .single();

    if (error || !data?.value) {
      return {};
    }

    const parsed = JSON.parse(data.value);
    const configs: Record<string, PlayerCardCustomState> =
      typeof parsed === 'object' && parsed !== null ? parsed : {};

    // Auto-heal:
    // 1. Players without avatar who mistakenly got 10.webp (Nghĩa's photo)
    // 2. Players using default avatar: enforce scale 0.85, offsetX 6, offsetY 22
    let hasChanges = false;
    for (const [pId, cfg] of Object.entries(configs)) {
      if (
        pId !== 'mmvkh4hd6y2u' &&
        !cfg?.playerName?.toUpperCase().includes('NGHĨA') &&
        cfg?.avatarUrl &&
        (cfg.avatarUrl.includes('/10.webp') || cfg.avatarUrl === '/player/10.webp')
      ) {
        cfg.avatarUrl = DEFAULT_PLAYER_AVATAR;
        hasChanges = true;
      }

      const isDefaultAvatar =
        !cfg?.avatarUrl ||
        cfg.avatarUrl === DEFAULT_PLAYER_AVATAR ||
        cfg.avatarUrl.includes('unknown.webp');

      if (isDefaultAvatar) {
        if (cfg.scale !== 0.85 || cfg.offsetX !== 6 || cfg.offsetY !== 22) {
          cfg.scale = 0.85;
          cfg.offsetX = 6;
          cfg.offsetY = 22;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      // Background update to persist the cleanup to database
      supabase
        .from('app_settings')
        .upsert(
          {
            key: CARD_CONFIGS_KEY,
            value: JSON.stringify(configs),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        )
        .then(
          () => {
            console.log('[CardConfigs] Automatically sanitized avatars and default positions (scale: 0.85, x: 6, y: 22) in database.');
          },
          (err: unknown) => {
            console.error('[CardConfigs] Failed to persist sanitized configs:', err);
          }
        );
    }

    return configs;
  } catch (err) {
    console.error('Failed to get player card configs from DB:', err);
    return {};
  }
}

/**
 * Get card config for a specific player by ID (or fallback by name)
 */
export async function getPlayerCardConfig(
  playerId?: string | null,
  playerName?: string | null
): Promise<PlayerCardCustomState | null> {
  const allConfigs = await getAllPlayerCardConfigs();
  if (playerId && allConfigs[playerId]) {
    return allConfigs[playerId];
  }
  if (playerName) {
    const normalized = playerName.trim().toUpperCase();
    for (const [_, cfg] of Object.entries(allConfigs)) {
      if (cfg.playerName && cfg.playerName.trim().toUpperCase() === normalized) {
        return cfg;
      }
    }
  }
  return null;
}

/**
 * Save / update card config for a specific player
 */
export async function savePlayerCardConfig(
  playerId: string,
  config: PlayerCardCustomState
): Promise<boolean> {
  try {
    const allConfigs = await getAllPlayerCardConfigs();
    const sanitizedConfig = { ...config };
    if (
      playerId !== 'mmvkh4hd6y2u' &&
      !sanitizedConfig.playerName?.toUpperCase().includes('NGHĨA') &&
      sanitizedConfig.avatarUrl &&
      (sanitizedConfig.avatarUrl.includes('/10.webp') || sanitizedConfig.avatarUrl === '/player/10.webp')
    ) {
      sanitizedConfig.avatarUrl = DEFAULT_PLAYER_AVATAR;
    }

    const isDefaultAvatar =
      !sanitizedConfig.avatarUrl ||
      sanitizedConfig.avatarUrl === DEFAULT_PLAYER_AVATAR ||
      sanitizedConfig.avatarUrl.includes('unknown.webp');

    if (
      isDefaultAvatar &&
      (sanitizedConfig.scale === 1.05 || sanitizedConfig.scale === 1.0 || !sanitizedConfig.scale) &&
      sanitizedConfig.offsetX === 0 &&
      sanitizedConfig.offsetY === 0
    ) {
      sanitizedConfig.scale = 0.85;
      sanitizedConfig.offsetX = 6;
      sanitizedConfig.offsetY = 22;
    }

    allConfigs[playerId] = sanitizedConfig;

    const { error } = await supabase.from('app_settings').upsert(
      {
        key: CARD_CONFIGS_KEY,
        value: JSON.stringify(allConfigs),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    if (error) {
      console.error('Failed to save card config to DB:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception in savePlayerCardConfig:', err);
    return false;
  }
}
