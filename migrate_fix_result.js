// Migration script: Fix trận 0-2-1 từ extra_win → away_win
// Chạy: node migrate_fix_result.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
);

async function main() {
  console.log('🔍 Tìm trận 0-2-1 bị ghi sai extra_win...');

  // Tìm trận có score 0-2-1 và result = extra_win
  const { data: matches, error } = await supabase
    .from('match_history')
    .select('*')
    .eq('home_score', 0)
    .eq('away_score', 2)
    .eq('extra_score', 1)
    .eq('result', 'extra_win');

  if (error) {
    console.error('❌ Lỗi query:', error);
    return;
  }

  if (!matches || matches.length === 0) {
    console.log('⚠️ Không tìm thấy trận nào cần sửa.');
    return;
  }

  for (const match of matches) {
    console.log(`\n📋 Trận ID: ${match.id}`);
    console.log(`   Score: HOME ${match.home_score} - AWAY ${match.away_score} - EXTRA ${match.extra_score}`);
    console.log(`   Result hiện tại: ${match.result}`);
    console.log(`   → Sửa thành: away_win`);

    // 1. Update match_history result
    const { error: updateErr } = await supabase
      .from('match_history')
      .update({ result: 'away_win' })
      .eq('id', match.id);

    if (updateErr) {
      console.error('❌ Lỗi update match_history:', updateErr);
      continue;
    }
    console.log('   ✅ Đã update match_history.result → away_win');

    // 2. Update player_stats: AWAY → win, HOME/EXTRA → lose
    const { data: stats } = await supabase
      .from('player_stats')
      .select('id, team_name, result')
      .eq('match_history_id', match.id);

    if (!stats) continue;

    for (const stat of stats) {
      const teamUpper = stat.team_name.toUpperCase();
      const newResult = teamUpper.includes('AWAY') ? 'win' : 'lose';

      if (stat.result !== newResult) {
        await supabase
          .from('player_stats')
          .update({ result: newResult })
          .eq('id', stat.id);
        console.log(`   ✅ ${stat.team_name} player (${stat.id}): ${stat.result} → ${newResult}`);
      }
    }
  }

  console.log('\n🎉 Migration hoàn tất!');
}

main().catch(console.error);
