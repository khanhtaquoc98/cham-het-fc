import { supabase } from '@/lib/supabase';

// ==========================================
// TELEGRAM REPLY HELPER
// ==========================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(chatId: number | string, text: string, parseMode?: string): Promise<void> {
  if (!BOT_TOKEN) return;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(parseMode ? { parse_mode: parseMode } : {}),
    }),
  });
}

export async function sendTelegramPoll(
  chatId: number | string,
  question: string,
  options: string[],
  threadId?: string,
): Promise<unknown> {
  if (!BOT_TOKEN) return null;

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPoll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      question,
      options,
      is_anonymous: false,
      allows_multiple_answers: false,
      ...(threadId ? { message_thread_id: threadId } : {}),
    }),
  });

  return res.json();
}

// ==========================================
// BENCH MEMBERS (replaces in-memory members Map)
// ==========================================

export interface BenchMember {
  id: string;
  displayName: string;
  telegramUserId?: number | null;
  telegramUsername?: string | null;
  createdAt: string;
}

export async function getBenchMembers(): Promise<BenchMember[]> {
  const { data, error } = await supabase
    .from('bench_members')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    telegramUserId: row.telegram_user_id,
    telegramUsername: row.telegram_username,
    createdAt: row.created_at,
  }));
}

export async function addBenchMember(
  displayName: string,
  telegramUserId?: number,
  telegramUsername?: string,
): Promise<BenchMember | null> {
  const { data, error } = await supabase
    .from('bench_members')
    .insert({
      display_name: displayName,
      telegram_user_id: telegramUserId || null,
      telegram_username: telegramUsername || null,
    })
    .select()
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    displayName: data.display_name,
    telegramUserId: data.telegram_user_id,
    telegramUsername: data.telegram_username,
    createdAt: data.created_at,
  };
}

export async function addBenchMembers(
  names: string[],
): Promise<{ addedCount: number; invalidNames: string[] }> {
  const invalidNames: string[] = [];
  let addedCount = 0;

  const existing = await getBenchMembers();
  const existingNames = existing.map(m => m.displayName.toLowerCase().trim());

  for (const name of names) {
    if (!isValidName(name)) {
      invalidNames.push(name);
      continue;
    }
    if (existingNames.includes(name.toLowerCase().trim())) {
      continue; // skip duplicates
    }

    const result = await addBenchMember(name);
    if (result) {
      addedCount++;
      existingNames.push(name.toLowerCase().trim());
    }
  }

  return { addedCount, invalidNames };
}

export async function removeBenchMembers(ids: string[]): Promise<string[]> {
  const members = await getBenchMembers();
  const removed: string[] = [];

  for (const id of ids) {
    const member = members.find(m => m.id === id);
    if (member) {
      await supabase.from('bench_members').delete().eq('id', id);
      removed.push(member.displayName);
    }
  }

  return removed;
}

export async function clearAllBenchMembers(): Promise<void> {
  await supabase.from('bench_members').delete().neq('id', '');
}

export async function isBenchMemberDuplicate(name: string): Promise<boolean> {
  const members = await getBenchMembers();
  return members.some(m => m.displayName.toLowerCase().trim() === name.toLowerCase().trim());
}

export async function findBenchMemberByTelegramId(telegramUserId: number): Promise<BenchMember | null> {
  const { data, error } = await supabase
    .from('bench_members')
    .select('*')
    .eq('telegram_user_id', telegramUserId)
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    displayName: data.display_name,
    telegramUserId: data.telegram_user_id,
    telegramUsername: data.telegram_username,
    createdAt: data.created_at,
  };
}

// ==========================================
// TEAM ASSIGNMENTS (replaces teamA/B/team3A/B/C Maps)
// ==========================================

export interface TeamAssignment {
  id: string;
  benchMemberId: string | null;
  displayName: string;
  teamGroup: string; // 'teamA', 'teamB', 'team3A', 'team3B', 'team3C'
  createdAt: string;
}

export async function getTeamMembers(teamGroup: string): Promise<TeamAssignment[]> {
  const { data, error } = await supabase
    .from('team_assignments')
    .select('*')
    .eq('team_group', teamGroup)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    benchMemberId: row.bench_member_id,
    displayName: row.display_name,
    teamGroup: row.team_group,
    createdAt: row.created_at,
  }));
}

export async function getAllTeamMembers(groups: string[]): Promise<Map<string, TeamAssignment[]>> {
  const result = new Map<string, TeamAssignment[]>();
  for (const g of groups) {
    result.set(g, await getTeamMembers(g));
  }
  return result;
}

export async function clearTeamGroup(teamGroup: string): Promise<void> {
  await supabase.from('team_assignments').delete().eq('team_group', teamGroup);
}

export async function clearAllTeams(): Promise<void> {
  await supabase.from('team_assignments').delete().neq('id', '');
}

export async function addToTeam(
  teamGroup: string,
  members: { benchMemberId: string | null; displayName: string }[],
): Promise<void> {
  const rows = members.map(m => ({
    bench_member_id: m.benchMemberId,
    display_name: m.displayName,
    team_group: teamGroup,
  }));

  if (rows.length > 0) {
    await supabase.from('team_assignments').insert(rows);
  }
}

export async function removeTeamMembers(teamGroup: string, ids: string[]): Promise<string[]> {
  const members = await getTeamMembers(teamGroup);
  const removed: string[] = [];

  for (const id of ids) {
    const member = members.find(m => m.id === id);
    if (member) {
      await supabase.from('team_assignments').delete().eq('id', id);
      removed.push(member.displayName);
    }
  }

  return removed;
}

/**
 * Shuffle array in-place (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Split bench members into 2 teams (HOME/AWAY)
 * Saves to team_assignments with teamA/teamB groups
 */
export async function splitInto2Teams(): Promise<{
  teamA: string[];
  teamB: string[];
} | null> {
  const benchMembers = await getBenchMembers();
  if (benchMembers.length < 2) return null;

  const entries = [...benchMembers];
  shuffleArray(entries);

  const isOdd = entries.length % 2 !== 0;
  const extraToA = Math.random() < 0.5;
  const half = isOdd && !extraToA
    ? Math.floor(entries.length / 2)
    : Math.ceil(entries.length / 2);

  // Clear existing 2-team assignments
  await clearTeamGroup('teamA');
  await clearTeamGroup('teamB');

  const teamAMembers = entries.slice(0, half);
  const teamBMembers = entries.slice(half);

  await addToTeam('teamA', teamAMembers.map(m => ({ benchMemberId: m.id, displayName: m.displayName })));
  await addToTeam('teamB', teamBMembers.map(m => ({ benchMemberId: m.id, displayName: m.displayName })));

  return {
    teamA: teamAMembers.map(m => m.displayName),
    teamB: teamBMembers.map(m => m.displayName),
  };
}

/**
 * Split bench members into 3 teams (HOME/AWAY/EXTRA)
 * Saves to team_assignments with team3A/team3B/team3C groups
 */
export async function splitInto3Teams(): Promise<{
  team3A: string[];
  team3B: string[];
  team3C: string[];
} | null> {
  const benchMembers = await getBenchMembers();
  if (benchMembers.length < 3) return null;

  const entries = [...benchMembers];
  shuffleArray(entries);

  const total = entries.length;
  const base = Math.floor(total / 3);
  const rem = total % 3;

  // Randomly choose which teams receive extra player(s)
  const idxPool = [0, 1, 2];
  shuffleArray(idxPool);
  const sizes = [base, base, base];
  for (let i = 0; i < rem; i++) {
    sizes[idxPool[i]]++;
  }

  // Clear existing 3-team assignments  
  await clearTeamGroup('team3A');
  await clearTeamGroup('team3B');
  await clearTeamGroup('team3C');

  const team3AMembers = entries.slice(0, sizes[0]);
  const team3BMembers = entries.slice(sizes[0], sizes[0] + sizes[1]);
  const team3CMembers = entries.slice(sizes[0] + sizes[1]);

  await addToTeam('team3A', team3AMembers.map(m => ({ benchMemberId: m.id, displayName: m.displayName })));
  await addToTeam('team3B', team3BMembers.map(m => ({ benchMemberId: m.id, displayName: m.displayName })));
  await addToTeam('team3C', team3CMembers.map(m => ({ benchMemberId: m.id, displayName: m.displayName })));

  return {
    team3A: team3AMembers.map(m => m.displayName),
    team3B: team3BMembers.map(m => m.displayName),
    team3C: team3CMembers.map(m => m.displayName),
  };
}

// ==========================================
// MATCH STATE (tiensan, tiennuoc, san, teamthua)
// ==========================================

export interface MatchState {
  tiensan: number;
  tiennuoc: number;
  teamThua: string | null;
  san: string | null;
}

export async function getMatchState(): Promise<MatchState> {
  const { data, error } = await supabase
    .from('match_state')
    .select('*')
    .eq('id', 'singleton')
    .single();

  if (error || !data) {
    return { tiensan: 580000, tiennuoc: 60000, teamThua: null, san: null };
  }

  return {
    tiensan: data.tiensan,
    tiennuoc: data.tiennuoc,
    teamThua: data.team_thua,
    san: data.san,
  };
}

export async function updateMatchState(updates: Partial<MatchState>): Promise<void> {
  const updateObj: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.tiensan !== undefined) updateObj.tiensan = updates.tiensan;
  if (updates.tiennuoc !== undefined) updateObj.tiennuoc = updates.tiennuoc;
  if (updates.teamThua !== undefined) updateObj.team_thua = updates.teamThua;
  if (updates.san !== undefined) updateObj.san = updates.san;

  // Upsert singleton row
  await supabase
    .from('match_state')
    .upsert({ id: 'singleton', ...updateObj }, { onConflict: 'id' });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export function isValidName(name: string): boolean {
  return /^[\p{L}\s]+\d*$/u.test(name);
}

export function isDuplicateName(name: string, nameList: string[]): boolean {
  return nameList.some(n => n.trim().toLowerCase() === name.trim().toLowerCase());
}

export function formatMoney(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
