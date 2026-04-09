import { supabase } from '@/lib/supabase';
import { MatchPayment, PlayerPayment, LosingTeam, PaymentSummary } from '@/types/payment';
import { getMatchData } from '@/lib/storage';
import { getPlayers } from '@/lib/players';

// ==========================================
// MATCH PAYMENT CRUD
// ==========================================

export async function getOrCreateMatchPayment(matchDataId: string): Promise<MatchPayment> {
  // Try to find existing
  const { data } = await supabase
    .from('match_payments')
    .select('*')
    .eq('match_data_id', matchDataId)
    .single();

  if (data) {
    return mapRow(data);
  }

  // Create new
  const { data: created, error } = await supabase
    .from('match_payments')
    .insert({ match_data_id: matchDataId })
    .select()
    .single();

  if (error || !created) {
    throw new Error('Failed to create match payment: ' + error?.message);
  }

  return mapRow(created);
}

export async function getMatchPaymentByMatchId(matchDataId: string): Promise<MatchPayment | null> {
  const { data } = await supabase
    .from('match_payments')
    .select('*')
    .eq('match_data_id', matchDataId)
    .single();

  return data ? mapRow(data) : null;
}

export async function updateMatchPayment(
  id: string,
  updates: { fieldCost?: number; drinkCost?: number; losingTeams?: LosingTeam[] }
): Promise<MatchPayment | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.fieldCost !== undefined) row.field_cost = updates.fieldCost;
  if (updates.drinkCost !== undefined) row.drink_cost = updates.drinkCost;
  if (updates.losingTeams !== undefined) row.losing_teams = updates.losingTeams;

  const { data, error } = await supabase
    .from('match_payments')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

// ==========================================
// PLAYER PAYMENTS
// ==========================================

export async function getPlayerPayments(matchPaymentId: string): Promise<PlayerPayment[]> {
  const { data } = await supabase
    .from('player_payments')
    .select('*')
    .eq('match_payment_id', matchPaymentId)
    .order('team_name', { ascending: true });

  return (data || []).map(mapPlayerRow);
}

export async function markPlayerPaid(
  paymentId: string,
  method: 'manual' | 'cash' | 'payos' = 'manual'
): Promise<boolean> {
  const { error } = await supabase
    .from('player_payments')
    .update({
      is_paid: true,
      paid_at: new Date().toISOString(),
      payment_method: method,
    })
    .eq('id', paymentId);

  return !error;
}

export async function markPlayerUnpaid(paymentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('player_payments')
    .update({
      is_paid: false,
      paid_at: null,
      payment_method: 'unpaid',
    })
    .eq('id', paymentId);

  return !error;
}

// ==========================================
// CALCULATE & GENERATE PLAYER PAYMENTS
// ==========================================

export async function resetPaymentsForMatch(matchDataId: string): Promise<boolean> {
  const mp = await getMatchPaymentByMatchId(matchDataId);
  if (!mp) return false;

  await updateMatchPayment(mp.id, { fieldCost: 0, drinkCost: 0, losingTeams: [] });
  
  await supabase
    .from('player_payments')
    .delete()
    .eq('match_payment_id', mp.id);

  return true;
}

/**
 * Tính toán tiền thanh toán cho từng cầu thủ và lưu vào DB.
 * Chỉ gọi khi đã có đủ thông tin (fieldCost, losingTeams).
 */
export async function calculateAndSavePlayerPayments(matchPaymentId: string): Promise<PlayerPayment[]> {
  const { data: mp } = await supabase
    .from('match_payments')
    .select('*')
    .eq('id', matchPaymentId)
    .single();

  if (!mp) return [];

  const matchPayment = mapRow(mp);
  const matchData = await getMatchData();
  if (!matchData || !matchData.teams || matchData.teams.length === 0) return [];

  const allPlayers = await getPlayers();
  const totalPlayers = matchData.teams.reduce((s, t) => s + t.players.length, 0);
  if (totalPlayers === 0) return [];

  // Tiền sân mỗi người
  const fieldPerPerson = Math.ceil(matchPayment.fieldCost / totalPlayers);

  // Build losing teams map: teamName -> drinkPercent
  const losingMap = new Map<string, number>();
  for (const lt of matchPayment.losingTeams) {
    losingMap.set(lt.teamName.toUpperCase(), lt.drinkPercent);
  }

  // Xóa player_payments cũ
  await supabase
    .from('player_payments')
    .delete()
    .eq('match_payment_id', matchPaymentId);

  // Tạo player_payments mới
  const rows: Array<{
    match_payment_id: string;
    player_name: string;
    player_id: string | null;
    team_name: string;
    field_amount: number;
    drink_amount: number;
    total_amount: number;
  }> = [];

  for (const team of matchData.teams) {
    const teamNameUpper = team.name.toUpperCase();
    const drinkPercent = losingMap.get(teamNameUpper) || 0;
    const teamPlayerCount = team.players.length;
    const drinkPerPerson = drinkPercent > 0 && teamPlayerCount > 0
      ? Math.ceil((matchPayment.drinkCost * drinkPercent / 100) / teamPlayerCount)
      : 0;

    for (const player of team.players) {
      // Tìm player_id từ danh sách registered players
      const matched = findRegisteredPlayer(player.name, player.telegramHandle, allPlayers);

      rows.push({
        match_payment_id: matchPaymentId,
        player_name: player.name,
        player_id: matched?.id || null,
        team_name: team.name,
        field_amount: fieldPerPerson,
        drink_amount: drinkPerPerson,
        total_amount: fieldPerPerson + drinkPerPerson,
      });
    }
  }

  if (rows.length > 0) {
    await supabase.from('player_payments').insert(rows);
  }

  return getPlayerPayments(matchPaymentId);
}

// ==========================================
// PAYMENT SUMMARY (for frontend)
// ==========================================

export async function getPaymentSummary(): Promise<PaymentSummary> {
  const matchData = await getMatchData();
  if (!matchData) {
    return { matchPayment: null, playerPayments: [], totalPlayers: 0, fieldPerPerson: 0, isReady: false };
  }

  const matchPayment = await getMatchPaymentByMatchId(matchData.id);
  if (!matchPayment) {
    return { matchPayment: null, playerPayments: [], totalPlayers: 0, fieldPerPerson: 0, isReady: false };
  }

  const playerPayments = await getPlayerPayments(matchPayment.id);
  const totalPlayers = matchData.teams.reduce((s, t) => s + t.players.length, 0);
  const fieldPerPerson = totalPlayers > 0 ? Math.ceil(matchPayment.fieldCost / totalPlayers) : 0;

  const isReady = matchPayment.fieldCost > 0
    && matchPayment.losingTeams.length > 0
    && playerPayments.length > 0;

  return { matchPayment, playerPayments, totalPlayers, fieldPerPerson, isReady };
}

// ==========================================
// PRICE PARSER
// ==========================================

/**
 * Parse price text: "580k" → 580000, "160000" → 160000, "1.2m" → 1200000
 */
export function parsePrice(text: string): number | null {
  const cleaned = text.trim().toLowerCase().replace(/[,\.]/g, '');
  const matchK = cleaned.match(/^(\d+)k$/);
  if (matchK) return parseInt(matchK[1]) * 1000;

  const matchM = cleaned.match(/^(\d+)m$/);
  if (matchM) return parseInt(matchM[1]) * 1000000;

  const matchNum = cleaned.match(/^(\d+)$/);
  if (matchNum) return parseInt(matchNum[1]);

  return null;
}

// ==========================================
// HELPERS
// ==========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MatchPayment {
  return {
    id: row.id,
    matchDataId: row.match_data_id,
    fieldCost: row.field_cost || 0,
    drinkCost: row.drink_cost || 0,
    losingTeams: row.losing_teams || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlayerRow(row: any): PlayerPayment {
  return {
    id: row.id,
    matchPaymentId: row.match_payment_id,
    playerName: row.player_name,
    playerId: row.player_id,
    teamName: row.team_name,
    fieldAmount: row.field_amount || 0,
    drinkAmount: row.drink_amount || 0,
    totalAmount: row.total_amount || 0,
    isPaid: row.is_paid || false,
    paidAt: row.paid_at,
    paymentMethod: row.payment_method || 'unpaid',
    createdAt: row.created_at,
  };
}

function findRegisteredPlayer(
  playerName: string,
  telegramHandle: string | undefined,
  players: Array<{ id: string; name: string; subNames: string[]; telegramHandle: string }>,
): { id: string } | null {
  if (telegramHandle) {
    const nh = telegramHandle.trim().toLowerCase().replace(/^@/, '');
    for (const p of players) {
      if (p.telegramHandle) {
        const ch = p.telegramHandle.trim().toLowerCase().replace(/^@/, '');
        if (ch === nh) return { id: p.id };
      }
    }
  }

  const normalized = playerName.trim().toLowerCase();
  for (const p of players) {
    for (const sub of p.subNames) {
      if (sub.trim().toLowerCase() === normalized) return { id: p.id };
    }
  }
  return null;
}
