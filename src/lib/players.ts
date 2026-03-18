import { PlayerConfig } from '@/types/player';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getPlayers(): PlayerConfig[] {
  ensureDataDir();
  if (!fs.existsSync(PLAYERS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(PLAYERS_FILE, 'utf-8');
    return JSON.parse(raw) as PlayerConfig[];
  } catch {
    return [];
  }
}

export function savePlayers(players: PlayerConfig[]): void {
  ensureDataDir();
  fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2), 'utf-8');
}

export function addPlayer(player: Omit<PlayerConfig, 'id'>): PlayerConfig {
  const players = getPlayers();
  const newPlayer: PlayerConfig = {
    ...player,
    telegramHandle: player.telegramHandle || '',
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
  };
  players.push(newPlayer);
  savePlayers(players);
  return newPlayer;
}

export function updatePlayer(id: string, data: Partial<Omit<PlayerConfig, 'id'>>): PlayerConfig | null {
  const players = getPlayers();
  const idx = players.findIndex(p => p.id === id);
  if (idx === -1) return null;
  players[idx] = { ...players[idx], ...data };
  savePlayers(players);
  return players[idx];
}

export function deletePlayer(id: string): boolean {
  const players = getPlayers();
  const filtered = players.filter(p => p.id !== id);
  if (filtered.length === players.length) return false;
  savePlayers(filtered);
  return true;
}

/**
 * Find a player config by matching:
 * 1. First check telegramHandle (priority)
 * 2. Then check subNames
 */
export function findPlayerByName(name: string, telegramHandle?: string): PlayerConfig | null {
  const players = getPlayers();

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
