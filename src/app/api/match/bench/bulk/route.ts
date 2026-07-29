import { NextResponse } from 'next/server';
import { getMatchData, saveMatchData, generateId } from '@/lib/storage';
import { getPlayers } from '@/lib/players';
import { Player } from '@/types/match';

export const dynamic = 'force-dynamic';

interface IncomingPlayerObj {
  name?: string;
  telegramHandle?: string;
  telegram_handle?: string;
  username?: string;
  telegramId?: string | number;
  telegram_id?: string | number;
  id?: string | number;
  playerId?: string;
  nicknames?: string[] | string;
  subNames?: string[] | string;
  sub_names?: string[] | string;
}

type IncomingPlayer = string | IncomingPlayerObj;

function normalize(str?: string | number | null): string {
  if (str === undefined || str === null) return '';
  return String(str).trim().toLowerCase().replace(/^@/, '');
}

function parseCandidate(item: IncomingPlayer) {
  let candidateName = '';
  let candidateHandle = '';
  let candidateId = '';
  let candidateNicks: string[] = [];

  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (trimmed) {
      const handleMatch = trimmed.match(/^(.+?)\s*\((@\w+)\)\s*$/);
      if (handleMatch) {
        candidateName = handleMatch[1].trim();
        candidateHandle = handleMatch[2];
      } else if (trimmed.startsWith('@')) {
        candidateHandle = trimmed;
        candidateName = trimmed;
      } else {
        candidateName = trimmed;
      }
    }
  } else if (typeof item === 'object' && item !== null) {
    candidateName = item.name || item.username || '';
    candidateHandle = item.telegramHandle || item.telegram_handle || item.username || '';
    candidateId = String(item.telegramId || item.telegram_id || item.playerId || item.id || '');

    const rawNicks = item.nicknames || item.subNames || item.sub_names || [];
    if (Array.isArray(rawNicks)) {
      candidateNicks = rawNicks.map(n => String(n));
    } else if (typeof rawNicks === 'string') {
      candidateNicks = rawNicks.split(',').map(s => s.trim());
    }
  }

  return {
    rawName: candidateName || candidateHandle || candidateId,
    name: normalize(candidateName),
    telegramHandle: normalize(candidateHandle),
    telegramId: normalize(candidateId),
    nicknames: candidateNicks.map(normalize),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawPlayers: IncomingPlayer[] = body.players || body.data || [];
    const rawPlayersOut: IncomingPlayer[] = body.playerOut || body.playersOut || body.player_out || body.players_out || [];

    if (
      (!Array.isArray(rawPlayers) || rawPlayers.length === 0) &&
      (!Array.isArray(rawPlayersOut) || rawPlayersOut.length === 0)
    ) {
      return NextResponse.json(
        { error: 'Vui lòng truyền danh sách "players" (thêm vào bench) hoặc "playerOut" (rời khỏi bench).' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let matchData = await getMatchData();
    if (!matchData) {
      matchData = {
        id: generateId(),
        bench: [],
        teams: [],
        venue: {},
        createdAt: now,
        updatedAt: now,
      };
    }

    const workingBench: Player[] = [...(matchData.bench || [])];
    const currentTeams = matchData.teams || [];
    const registeredPlayers = await getPlayers();

    // Helper: Match a player in match against a parsed candidate (ID, Handle, Name, Nickname)
    function isPlayerMatch(target: Player, candidate: ReturnType<typeof parseCandidate>): boolean {
      const exName = normalize(target.name);
      const exHandle = normalize(target.telegramHandle);
      const exId = normalize(target.playerId);

      const regConfig = registeredPlayers.find(p => {
        const regName = normalize(p.name);
        const regHandle = normalize(p.telegramHandle);
        const regId = normalize(p.id);
        const regSubs = (p.subNames || []).map(normalize);

        return (
          (regId && exId && regId === exId) ||
          (regHandle && exHandle && regHandle === exHandle) ||
          (regName && exName && regName === exName) ||
          regSubs.includes(exName)
        );
      });

      const exSubNames = (regConfig?.subNames || []).map(normalize);
      const regHandle = normalize(regConfig?.telegramHandle);
      const regId = normalize(regConfig?.id);
      const regName = normalize(regConfig?.name);

      // 1. Telegram ID match
      if (candidate.telegramId && (candidate.telegramId === exId || candidate.telegramId === regId)) {
        return true;
      }

      // 2. Telegram Handle match
      if (
        candidate.telegramHandle &&
        (candidate.telegramHandle === exHandle || candidate.telegramHandle === regHandle)
      ) {
        return true;
      }

      // 3. Name match
      if (
        candidate.name &&
        (candidate.name === exName || candidate.name === regName || exSubNames.includes(candidate.name))
      ) {
        return true;
      }

      // 4. Nicknames / SubNames match
      for (const nick of candidate.nicknames) {
        if (
          nick &&
          (nick === exName || nick === regName || nick === exHandle || nick === regHandle || exSubNames.includes(nick))
        ) {
          return true;
        }
      }

      return false;
    }

    // 1. Process playerOut (Remove players from bench)
    const removed: Player[] = [];
    if (Array.isArray(rawPlayersOut) && rawPlayersOut.length > 0) {
      for (const item of rawPlayersOut) {
        const candidate = parseCandidate(item);
        if (!candidate.name && !candidate.telegramHandle && !candidate.telegramId) continue;

        const matchIndex = workingBench.findIndex(p => isPlayerMatch(p, candidate));
        if (matchIndex !== -1) {
          const [removedPlayer] = workingBench.splice(matchIndex, 1);
          removed.push(removedPlayer);
        }
      }
    }

    // 2. Process players (Add new players to bench)
    const added: Player[] = [];
    const skipped: { player: string; reason: string }[] = [];

    const allExistingInMatch: Player[] = [
      ...workingBench,
      ...currentTeams.flatMap(t => t.players || [])
    ];

    if (Array.isArray(rawPlayers) && rawPlayers.length > 0) {
      for (const item of rawPlayers) {
        const candidate = parseCandidate(item);
        if (!candidate.name && !candidate.telegramHandle && !candidate.telegramId) continue;

        const exists = allExistingInMatch.some(p => isPlayerMatch(p, candidate));

        if (exists) {
          skipped.push({
            player: candidate.rawName,
            reason: 'Cầu thủ đã có trên bench hoặc trong đội hình',
          });
        } else {
          const newPlayer: Player = {
            name: candidate.rawName,
            telegramHandle: candidate.telegramHandle ? `@${candidate.telegramHandle}` : undefined,
            playerId: candidate.telegramId || undefined,
          };
          added.push(newPlayer);
          workingBench.push(newPlayer);
          allExistingInMatch.push(newPlayer);
        }
      }
    }

    // 3. Save if there were any changes
    if (added.length > 0 || removed.length > 0) {
      matchData.bench = workingBench;
      matchData.updatedAt = now;
      await saveMatchData(matchData);
    }

    return NextResponse.json({
      success: true,
      addedCount: added.length,
      removedCount: removed.length,
      skippedCount: skipped.length,
      added,
      removed,
      skipped,
      bench: workingBench,
    });
  } catch (error) {
    console.error('Error in bulk bench API:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
