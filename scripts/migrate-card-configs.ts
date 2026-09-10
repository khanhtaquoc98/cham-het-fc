import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env
const envContent = fs.readFileSync('.env', 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const url = env.NEXT_PUBLIC_SUPABASE_URL || 'https://udlhudfxwuwbecjqvvhv.supabase.co';
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(url, key);

const POPULAR_TEMPLATES = ['toty', 'tots', 'champions_red', 'dynasties', 'centurions', 'rare_gold', 'futties'];
const PLAYSTYLES = ['technical', 'finesse_shot', 'rapid', 'power_shot', 'dead_ball', 'relentless', 'trickster', 'quick_step'];

async function runMigration() {
  console.log('🚀 Starting FUT Card Config Migration for all players...');

  // 1. Fetch all players
  const { data: players, error: pErr } = await sb.from('players').select('*');
  if (pErr || !players) {
    console.error('Failed to fetch players:', pErr);
    process.exit(1);
  }
  console.log(`✅ Loaded ${players.length} players from Supabase.`);

  // 2. Fetch storage files in 'players' bucket
  const { data: files } = await sb.storage.from('players').list('', { limit: 100 });
  const fileNames = new Set((files || []).map(f => f.name.toLowerCase()));
  console.log(`✅ Loaded ${fileNames.size} avatar files in storage:`, Array.from(fileNames));

  // 3. Fetch injury-prone players set
  const { data: injuryData } = await sb.from('app_settings').select('value').eq('key', 'injury_prone_players').single();
  let injuryProneSet = new Set<string>();
  if (injuryData?.value) {
    try {
      const arr = JSON.parse(injuryData.value);
      if (Array.isArray(arr)) injuryProneSet = new Set(arr);
    } catch {}
  }

  // 4. Fetch player_stats to calculate actual statistics
  const { data: statsRows } = await sb.from('player_stats').select('player_name, player_id, result');
  const statsMap = new Map<string, { wins: number; draws: number; losses: number; total: number; winRate: number }>();

  (statsRows || []).forEach(row => {
    const keyById = row.player_id ? `id:${row.player_id}` : null;
    const keyByName = row.player_name ? `name:${row.player_name.trim().toLowerCase()}` : null;

    [keyById, keyByName].forEach(k => {
      if (!k) return;
      let cur = statsMap.get(k);
      if (!cur) {
        cur = { wins: 0, draws: 0, losses: 0, total: 0, winRate: 0 };
        statsMap.set(k, cur);
      }
      if (row.result === 'win') cur.wins++;
      else if (row.result === 'draw') cur.draws++;
      else if (row.result === 'lose') cur.losses++;
      cur.total++;
    });
  });

  // Calculate win rates
  statsMap.forEach(v => {
    v.winRate = v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0;
  });

  // 5. Build card config for every player
  const currentYear = 2026;
  const cardConfigs: Record<string, any> = {};

  let index = 0;
  for (const player of players) {
    // Determine avatar URL
    let avatarUrl = '';
    const jerseyFilename = player.jersey_number != null ? `${player.jersey_number}.webp` : null;
    const idFilename = `${player.id}.webp`;

    if (jerseyFilename && fileNames.has(jerseyFilename.toLowerCase())) {
      avatarUrl = `${url}/storage/v1/object/public/players/${jerseyFilename}`;
    } else if (fileNames.has(idFilename.toLowerCase())) {
      avatarUrl = `${url}/storage/v1/object/public/players/${idFilename}`;
    } else if (fileNames.has('10.webp')) {
      avatarUrl = `${url}/storage/v1/object/public/players/10.webp`;
    }

    // Match stats
    const stat = statsMap.get(`id:${player.id}`) || statsMap.get(`name:${player.name.trim().toLowerCase()}`) || {
      wins: 0,
      draws: 0,
      losses: 0,
      total: 0,
      winRate: 0,
    };

    // Calculate birth year & YO
    let birthYear = 1998;
    const teleHandle = player.telegram_handle || '';
    const match2Digits = teleHandle.match(/(\d{2})$/);
    if (match2Digits) {
      const yr = parseInt(match2Digits[1], 10);
      birthYear = yr >= 70 ? 1900 + yr : 2000 + yr;
    }
    const yo = Math.max(16, currentYear - birthYear);

    // Position inference
    const isGk = player.name.toLowerCase().includes('gk') || (player.sub_names || []).some((s: string) => s.toLowerCase().includes('gk'));
    let position = 'RW';
    if (isGk) position = 'GK';
    else if (player.name.toLowerCase().includes('cao') || player.name.toLowerCase().includes('hồ')) position = 'CB';
    else if (player.name.toLowerCase().includes('thầy') || player.name.toLowerCase().includes('khánh')) position = 'CAM';
    else if (player.name.toLowerCase().includes('nghĩa') || player.name.toLowerCase().includes('tùng')) position = 'ST';
    else if (index % 3 === 0) position = 'ST';
    else if (index % 3 === 1) position = 'CAM';
    else position = 'RW';

    // Rating (OVR)
    let ovr = 75;
    if (stat.winRate >= 70) ovr = 90;
    else if (stat.winRate >= 55) ovr = 85;
    else if (stat.winRate >= 45) ovr = 82;
    else if (stat.winRate >= 35) ovr = 78;
    else ovr = 74;

    if (stat.total >= 40) ovr += 4;
    else if (stat.total >= 20) ovr += 3;
    else if (stat.total >= 10) ovr += 2;
    ovr = Math.min(99, Math.max(68, ovr));

    const ratingScore = parseFloat((ovr - 2.5 + (stat.winRate / 25)).toFixed(1));

    // Template selection
    let templateId = 'rare_gold';
    if (ovr >= 90 || stat.winRate >= 70) templateId = index % 2 === 0 ? 'toty' : 'tots';
    else if (ovr >= 85) templateId = index % 2 === 0 ? 'champions_red' : 'dynasties';
    else if (ovr >= 80) templateId = 'centurions';
    else templateId = 'rare_gold';

    const isInjuryProne = injuryProneSet.has(player.id) || Boolean(player.is_injury_prone);

    cardConfigs[player.id] = {
      templateId,
      rating: ovr,
      position,
      roleIntensity: (ovr >= 85 ? '++' : '+') as '' | '+' | '++',
      altPositions: position === 'GK' ? [] : ['CAM', 'ST'],
      playerName: player.name.toUpperCase(),
      jerseyNumber: player.jersey_number ?? 10,
      isInjuryProne,
      avatarUrl,
      scale: 1.05,
      offsetX: 0,
      offsetY: 0,
      faceStats: {
        wr: stat.winRate,
        w: stat.wins,
        d: stat.draws,
        l: stat.losses,
        p: stat.total,
        yo,
        birthYear,
      },
      skills: ovr >= 85 ? 5 : 4,
      weakFoot: ovr >= 80 ? 4 : 3,
      preferredFoot: index % 4 === 0 ? 'L' : 'R',
      ratingScore,
      nationId: 'vietnam',
      clubId: 'cham_het',
      leagueId: 'cham_het_league',
      playStylePlusId: PLAYSTYLES[index % PLAYSTYLES.length],
      showClub: false,
      showNation: true,
      showLeague: false,
      showStats: true,
      showPlayStyle: true,
      showAltPositions: true,
    };

    index++;
  }

  console.log(`📦 Prepared ${Object.keys(cardConfigs).length} card configs.`);

  // 6. Save to app_settings
  const { error: upsertErr } = await sb.from('app_settings').upsert({
    key: 'player_card_configs',
    value: JSON.stringify(cardConfigs),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });

  if (upsertErr) {
    console.error('❌ Failed to save card configs to app_settings:', upsertErr);
    process.exit(1);
  }

  console.log('🎉 Successfully migrated and saved all player card configs to database (app_settings: player_card_configs)!');
}

runMigration();
