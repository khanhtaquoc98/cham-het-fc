import { NextResponse } from 'next/server';
import { getMatchData, saveMatchData, generateId, deleteMatchData } from '@/lib/storage';
import { parseTeamMessage, parseVenueMessage } from '@/lib/parser';
import { saveMatchHistory } from '@/lib/history';
import { handlePollAnswer, handleVoteCommand } from '@/lib/weekly-vote';
import {
  sendTelegramMessage,
  getBenchMembers,
  addBenchMember,
  addBenchMembers,
  removeBenchMembers,
  clearAllBenchMembers,
  isBenchMemberDuplicate,
  findBenchMemberByTelegramId,
  getTeamMembers,
  clearTeamGroup,
  clearAllTeams,
  addToTeam,
  removeTeamMembers,
  splitInto2Teams,
  splitInto3Teams,
  getMatchState,
  updateMatchState,
  isValidName,
  formatMoney,
  MessageType,
} from '@/lib/bot';

// ==========================================
// Telegram Message types
// ==========================================
interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  from?: TelegramUser;
  text?: string;
}

interface TelegramPollAnswer {
  poll_id: string;
  user: {
    id: number;
    first_name?: string;
    username?: string;
  };
  option_ids: number[];
}

// ==========================================
// WEBHOOK POST HANDLER
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── Handle poll_answer (vote tracking) ──────────────────────
    const pollAnswer: TelegramPollAnswer | undefined = body.poll_answer;
    if (pollAnswer) {
      await handlePollAnswer(pollAnswer);
      return NextResponse.json({ ok: true });
    }

    const message: TelegramMessage | undefined = body.message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const text: string = message.text;
    const textLower = text.toLowerCase().trim();
    const chatId = message.chat?.id;
    const user = message.from;

    // Helper to send reply (with thread routing)
    const reply = async (msg: string, parseMode?: string, type?: MessageType) => {
      if (chatId) {
        await sendTelegramMessage(chatId, msg, parseMode, type);
      }
    };

    // ====================
    // /start - Help
    // ====================
    if (textLower === '/start') {
      await reply(
        // Send to MAIN thread
        `👋 *DANH SÁCH LỆNH HƯỚNG DẪN*

📝 *Quản lý danh sách:*
• \`/addme\` - Tự add vào bench
• \`/add\` - Add hộ vào bench
• \`/bench\` - Xem bench
• \`/clearbench\` - Xóa member khỏi bench

⚽ *Quản lý team:*
• \`/chiateam\` - Chia 2 team (HOME / AWAY)
• \`/chiateam 3\` - Chia 3 team (HOME / AWAY / EXTRA)
• \`/team\` - Xem team hiện tại
• \`/addtoteam HOME|AWAY|EXTRA\` - Thêm vào team
• \`/clearteam\` - Xóa member khỏi team

📅 *Trận đấu:*
• \`/san\` - Thông tin sân / đội hình

💰 *Tiền sân:*
• \`/tiensan\` - Xem/đặt tiền sân (mặc định 580K)
• \`/tiennuoc\` - Xem/đặt tiền nước (mặc định 60K)
• \`/tiso\` - Lưu tỉ số
• \`/chiatien\` - Chia tiền

🗑️ *Khác:*
• \`/reset\` - Xoá dữ liệu trận
• \`/clearsan\` - Xoá sân

💡 Dùng sai cú pháp = ngu!`,
        'Markdown',
        'MAIN'
      );
    }

    // ====================
    // /addme - Tự add vào bench
    // ====================
    else if (textLower === '/addme') {
      if (!user) {
        await reply('⚠️ Không xác định được người dùng.');
        return NextResponse.json({ ok: true });
      }

      const name = user.first_name
        ? user.first_name + (user.username ? ` (@${user.username})` : '')
        : user.username || 'Unknown';

      if (!isValidName(user.first_name || '')) {
        await reply('⚠️ Tên không hợp lệ.');
        return NextResponse.json({ ok: true });
      }

      // Check duplicate by telegram user id
      const existing = await findBenchMemberByTelegramId(user.id);
      if (existing) {
        await reply(`⚠️ Đã có tên ${existing.displayName} trong bench.`);
        return NextResponse.json({ ok: true });
      }

      // Also check by name
      if (await isBenchMemberDuplicate(user.first_name || name)) {
        await reply(`⚠️ Đã có tên ${user.first_name || name} trong bench.`);
        return NextResponse.json({ ok: true });
      }

      await addBenchMember(name, user.id, user.username);
      await reply(`✅ ${name} lên bench!`);
    }

    // ====================
    // /add name1, name2 - Add nhiều người
    // ====================
    else if (textLower === '/add') {
      await reply(
        `📋 *Cách sử dụng /add:*
• \`/add name 1, name 2, name 3, ...\` - Thêm nhiều member vào bench cùng lúc

Ví dụ: \`/add Nghia, Nghia 1, Nghia 2\``,
        'Markdown'
      );
    } else if (textLower.startsWith('/add ')) {
      const rawNames = text.replace(/^\/add\s+/i, '');
      const namesToAdd = rawNames.split(',').map(n => n.trim()).filter(n => n);

      if (namesToAdd.length === 0) {
        await reply('⚠️ Nhập tên member để thêm vào bench. Ví dụ:\n`/add Nghia, Nghia 1, Nghia 2`', 'Markdown');
        return NextResponse.json({ ok: true });
      }

      // Don't intercept /addme or /addtoteam
      if (textLower.startsWith('/addme') || textLower.startsWith('/addtoteam')) {
        // handled by other blocks
      } else {
        const { addedCount, invalidNames } = await addBenchMembers(namesToAdd);

        if (invalidNames.length > 0) {
          await reply(`⚠️ Các tên không hợp lệ (bị bỏ qua): ${invalidNames.join(', ')}`);
        } else if (addedCount === 0) {
          await reply('⚠️ Không có member mới được thêm. Tất cả member đã có trong /bench');
        } else {
          await reply(`✅ Đã thêm ${addedCount} member(s) vào /bench`);
        }
      }
    }

    // ====================
    // /bench - Xem bench
    // ====================
    else if (textLower === '/bench') {
      const members = await getBenchMembers();
      if (members.length === 0) {
        await reply('⚠️ Bench trống.');
      } else {
        const names = members.map((m, i) => `${i + 1}. ${m.displayName}`);
        await reply(`👥 Danh sách hiện tại (${members.length}):\n${names.join('\n')}`);
      }
    }

    // ====================
    // /clearbench - Xóa khỏi bench
    // ====================
    else if (textLower === '/clearbench') {
      const members = await getBenchMembers();
      if (members.length === 0) {
        await reply('⚠️ Bench trống.');
      } else {
        const numberedList = members.map((m, i) => `${i + 1}. ${m.displayName}`).join('\n');
        await reply(
          `📋 *Bench hiện tại:*\n\n${numberedList}\n\n💡 *Cách sử dụng:*\n• \`/clearbench 1,3,5\` - Xóa member số 1, 3, 5\n• \`/clearbench 1-3\` - Xóa member từ 1 đến 3\n• \`/clearbench all\` - Xóa tất cả`,
          'Markdown'
        );
      }
    } else if (textLower.startsWith('/clearbench ')) {
      const selection = text.replace(/^\/clearbench\s+/i, '').trim();
      const members = await getBenchMembers();

      if (members.length === 0) {
        await reply('⚠️ Bench trống.');
        return NextResponse.json({ ok: true });
      }

      if (selection.toLowerCase() === 'all') {
        await clearAllBenchMembers();
        await reply('✅ Đã xóa toàn bộ member khỏi bench.');
        return NextResponse.json({ ok: true });
      }

      const selectedIds = parseSelectionIndices(selection, members.length);
      if (selectedIds.length === 0) {
        await reply('⚠️ Không có lựa chọn hợp lệ. Ví dụ:\n`/clearbench 1,3,5` hoặc `/clearbench 1-3` hoặc `/clearbench all`', 'Markdown');
        return NextResponse.json({ ok: true });
      }

      const idsToRemove = selectedIds.map(i => members[i].id);
      const removedNames = await removeBenchMembers(idsToRemove);

      if (removedNames.length === 0) {
        await reply('⚠️ Không có member nào bị xóa.');
      } else {
        await reply(`✅ Đã xóa ${removedNames.length} member(s):\n${removedNames.join('\n')}`, 'Markdown');
      }
    }

    // ====================
    // /chiateam [3] - Chia team (mặc định 2, thêm 3 = chia 3 team)
    // Tự lưu vào match_data.teams
    // ====================
    else if (textLower === '/chiateam' || textLower === '/chiateam 3') {
      const is3Team = textLower === '/chiateam 3';

      if (is3Team) {
        const result = await splitInto3Teams();
        if (!result) {
          await reply('❗ Cần ít nhất 3 người để chia 3 team');
        } else {
          // Save to match_data
          const teams = [
            { name: 'HOME', players: result.team3A.map(n => ({ name: n })) },
            { name: 'AWAY', players: result.team3B.map(n => ({ name: n })) },
            { name: 'EXTRA', players: result.team3C.map(n => ({ name: n })) },
          ];
          let matchData = await getMatchData();
          const now = new Date().toISOString();
          if (!matchData) {
            matchData = { id: generateId(), teams: [], venue: {}, createdAt: now, updatedAt: now };
          }
          matchData.teams = teams;
          matchData.updatedAt = now;
          await saveMatchData(matchData);

          await reply(
            `🎲 *Chia 3 team* 🎲\n\n👤 *HOME:*\n${result.team3A.join('\n')}\n\n👤 *AWAY:*\n${result.team3B.join('\n')}\n\n👤 *EXTRA:*\n${result.team3C.join('\n')}`,
            'Markdown',
            'ANNOUNCEMENT'
          );
        }
      } else {
        const result = await splitInto2Teams();
        if (!result) {
          await reply('❗ Không đủ người để chia (cần ít nhất 2 người trong bench)');
        } else {
          // Save to match_data
          const teams = [
            { name: 'HOME', players: result.teamA.map(n => ({ name: n })) },
            { name: 'AWAY', players: result.teamB.map(n => ({ name: n })) },
          ];
          let matchData = await getMatchData();
          const now = new Date().toISOString();
          if (!matchData) {
            matchData = { id: generateId(), teams: [], venue: {}, createdAt: now, updatedAt: now };
          }
          matchData.teams = teams;
          matchData.updatedAt = now;
          await saveMatchData(matchData);

          await reply(
            `🎲 *Chia team* 🎲\n\n👤 *HOME:*\n${result.teamA.join('\n')}\n\n👤 *AWAY:*\n${result.teamB.join('\n')}`,
            'Markdown',
            'ANNOUNCEMENT'
          );
        }
      }
    }

    // ====================
    // /team - Xem team từ match_data
    // ====================
    else if (textLower === '/team' && !textLower.startsWith('/teamthua')) {
      const matchData = await getMatchData();
      const teams = matchData?.teams;

      if (!teams || teams.length === 0) {
        await reply('⚠️ Chưa có team nào được chia. Dùng /chiateam trước');
      } else {
        const lines = teams.map(t =>
          `👤 *${t.name}:*\n${t.players.map((p: { name: string }) => p.name).join('\n')}`
        ).join('\n\n');
        await reply(`🎲 *Team hiện tại* 🎲\n\n${lines}`, 'Markdown');
      }
    }

    // ====================
    // /addtoteam HOME|AWAY|EXTRA [selection]
    // ====================
    else if (textLower.startsWith('/addtoteam')) {
      const match = text.match(/^\/addtoteam\s+(HOME|AWAY|EXTRA)(?:\s+(.+))?$/i);
      if (!match) {
        await reply(
          '📋 *Cách sử dụng:*\n• `/addtoteam HOME` - Xem bench & hướng dẫn\n• `/addtoteam HOME 1,3,5` - Thêm member vào HOME\n• `/addtoteam AWAY all` - Thêm tất cả vào AWAY\n\n_Team: HOME | AWAY | EXTRA_',
          'Markdown'
        );
        return NextResponse.json({ ok: true });
      }

      const teamType = match[1].toUpperCase();
      const selection = match[2]?.trim();
      const teamGroup = teamType === 'HOME' ? 'teamA' : teamType === 'AWAY' ? 'teamB' : 'team3C';
      const benchMembers = await getBenchMembers();

      if (benchMembers.length === 0) {
        await reply('⚠️ Bench trống. Thêm member trước.');
        return NextResponse.json({ ok: true });
      }

      if (!selection) {
        // Show bench list with instructions
        const numberedList = benchMembers.map((m, i) => `${i + 1}. ${m.displayName}`).join('\n');
        await reply(
          `📋 *Bench hiện tại:*\n\n${numberedList}\n\n💡 *Cách sử dụng:*\n• \`/addtoteam ${teamType} 1,3,5\` - Chọn member\n• \`/addtoteam ${teamType} 1-3\` - Chọn range\n• \`/addtoteam ${teamType} all\` - Chọn tất cả`,
          'Markdown'
        );
        return NextResponse.json({ ok: true });
      }

      let selectedIndices: number[];
      if (selection.toLowerCase() === 'all') {
        selectedIndices = benchMembers.map((_, i) => i);
      } else {
        selectedIndices = parseSelectionIndices(selection, benchMembers.length);
      }

      if (selectedIndices.length === 0) {
        await reply(`⚠️ Không có lựa chọn hợp lệ.`);
        return NextResponse.json({ ok: true });
      }

      const selectedMembers = selectedIndices.map(i => benchMembers[i]);
      await addToTeam(
        teamGroup,
        selectedMembers.map(m => ({ benchMemberId: m.id, displayName: m.displayName })),
      );

      const teamMembers = await getTeamMembers(teamGroup);
      const selectedNames = selectedMembers.map(m => m.displayName);

      // Sync matchData
      let matchData = await getMatchData();
      if (!matchData) {
        matchData = { id: generateId(), teams: [], venue: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      }
      if (!matchData.teams) matchData.teams = [];
      const tIndex = matchData.teams.findIndex(t => t.name === teamType);
      if (tIndex === -1) {
        matchData.teams.push({ name: teamType, players: teamMembers.map(m => ({name: m.displayName})) });
      } else {
        matchData.teams[tIndex].players = teamMembers.map(m => ({name: m.displayName}));
      }
      matchData.updatedAt = new Date().toISOString();
      await saveMatchData(matchData);

      await reply(
        `✅ Đã thêm ${selectedNames.length} member(s) vào ${teamType}:\n${selectedNames.join('\n')}\n\n👤 *${teamType} hiện tại:*\n${teamMembers.map(m => m.displayName).join('\n')}`,
        'Markdown'
      );
    }

    // ====================
    // /clearteam [HOME|AWAY|EXTRA] [selection]
    // ====================
    else if (textLower.startsWith('/clearteam')) {
      const match = text.match(/^\/clearteam(?:\s+(HOME|AWAY|EXTRA))?(?:\s+(.+))?$/i);

      if (!match || !match[1]) {
        // /clearteam - clear all teams
        if (textLower === '/clearteam') {
          const teamA = await getTeamMembers('teamA');
          const teamB = await getTeamMembers('teamB');
          const team3A = await getTeamMembers('team3A');
          const team3B = await getTeamMembers('team3B');
          const team3C = await getTeamMembers('team3C');
          const matchData = await getMatchData();
          const hasMatchDataTeams = matchData && matchData.teams && matchData.teams.length > 0;

          if (teamA.length === 0 && teamB.length === 0 && team3A.length === 0 && team3B.length === 0 && team3C.length === 0 && !hasMatchDataTeams) {
            await reply('⚠️ Chưa chia team.');
          } else {
            if (teamA.length > 0 || teamB.length > 0 || team3A.length > 0 || team3B.length > 0 || team3C.length > 0) {
              await clearAllTeams();
            }
            await reply('✅ Đã xóa toàn bộ team.');

            // Sync matchData
            if (matchData && hasMatchDataTeams) {
              matchData.teams = [];
              matchData.updatedAt = new Date().toISOString();
              await saveMatchData(matchData);
            }
          }
        }
        return NextResponse.json({ ok: true });
      }

      const teamType = match[1].toUpperCase();
      const selection = match[2]?.trim();
      const teamGroup = teamType === 'HOME' ? 'teamA' : teamType === 'AWAY' ? 'teamB' : 'team3C';
      const teamMembers = await getTeamMembers(teamGroup);

      let matchData = await getMatchData();
      let hasMatchDataTeam = false;
      let tIndex = -1;
      if (matchData && matchData.teams) {
        tIndex = matchData.teams.findIndex(t => t.name === teamType);
        if (tIndex >= 0 && matchData.teams[tIndex].players.length > 0) {
          hasMatchDataTeam = true;
        }
      }

      if (teamMembers.length === 0 && !hasMatchDataTeam) {
        await reply(`⚠️ ${teamType} trống.`);
        return NextResponse.json({ ok: true });
      }

      if (!selection) {
        // Show team roster for selective clear
        const numberedList = teamMembers.map((m, i) => `${i + 1}. ${m.displayName}`).join('\n');
        await reply(
          `👤 *${teamType} hiện tại:*\n\n${numberedList}\n\n💡 *Cách sử dụng:*\n• \`/clearteam ${teamType} 1,3,5\` - Xóa member\n• \`/clearteam ${teamType} 1-3\` - Xóa range\n• \`/clearteam ${teamType} all\` - Xóa tất cả`,
          'Markdown'
        );
        return NextResponse.json({ ok: true });
      }

      if (selection.toLowerCase() === 'all') {
        await clearTeamGroup(teamGroup);
        await reply(`✅ Đã xóa toàn bộ ${teamType}.`);

        // Sync matchData
        matchData = await getMatchData();
        if (matchData && matchData.teams) {
          tIndex = matchData.teams.findIndex(t => t.name === teamType);
          if (tIndex >= 0) {
            matchData.teams[tIndex].players = [];
            matchData.updatedAt = new Date().toISOString();
            await saveMatchData(matchData);
          }
        }

        return NextResponse.json({ ok: true });
      }

      const selectedIndices = parseSelectionIndices(selection, teamMembers.length);
      if (selectedIndices.length === 0) {
        await reply(`⚠️ Không có lựa chọn hợp lệ.`);
        return NextResponse.json({ ok: true });
      }

      const idsToRemove = selectedIndices.map(i => teamMembers[i].id);
      const removedNames = await removeTeamMembers(teamGroup, idsToRemove);

      // Sync matchData
      matchData = await getMatchData();
      if (matchData && matchData.teams) {
        tIndex = matchData.teams.findIndex(t => t.name === teamType);
        if (tIndex >= 0) {
          const updatedTeamMembers = await getTeamMembers(teamGroup);
          matchData.teams[tIndex].players = updatedTeamMembers.map(m => ({name: m.displayName}));
          matchData.updatedAt = new Date().toISOString();
          await saveMatchData(matchData);
        }
      }

      await reply(
        `✅ Đã xóa ${removedNames.length} member(s) khỏi ${teamType}:\n${removedNames.join('\n')}`,
        'Markdown'
      );
    }

    // ====================
    // /tiensan [amount] - Tiền sân
    // ====================
    else if (textLower === '/tiensan') {
      const state = await getMatchState();
      await reply(`✅ Tiền sân hiện tại: ${formatMoney(state.tiensan)} VND`);
    } else if (textLower.startsWith('/tiensan ')) {
      const input = text.replace(/^\/tiensan\s+/i, '').replace(/[^\d]/g, '');
      if (!input || isNaN(Number(input))) {
        await reply('⚠️ Vui lòng nhập số tiền hợp lệ. Ví dụ: /tiensan 1000000');
      } else {
        const value = Number(input);
        await updateMatchState({ tiensan: value });
        await reply(`✅ Đã cập nhật tiền sân: ${formatMoney(value)} VND`);
      }
    }

    // ====================
    // /tiennuoc [amount] - Tiền nước
    // ====================
    else if (textLower === '/tiennuoc') {
      const state = await getMatchState();
      await reply(`🧊 Tiền nước hiện tại: ${formatMoney(state.tiennuoc)} VND`);
    } else if (textLower.startsWith('/tiennuoc ')) {
      const input = text.replace(/^\/tiennuoc\s+/i, '').replace(/[^\d]/g, '');
      if (!input || isNaN(Number(input))) {
        await reply('⚠️ Vui lòng nhập số tiền hợp lệ. Ví dụ: /tiennuoc 60000');
      } else {
        const value = Number(input);
        await updateMatchState({ tiennuoc: value });
        await reply(`✅ Đã cập nhật tiền nước: ${formatMoney(value)} VND`);
      }
    }

    // ====================
    // /chiatien - Chia tiền (dựa trên tỉ số từ /tiso)
    // ====================
    else if (textLower === '/chiatien') {
      const state = await getMatchState();
      if (!state.tiensan) {
        await reply('💸 Bạn chưa thêm tiền sân. Dùng /tiensan [số tiền] trước.');
        return NextResponse.json({ ok: true });
      }

      const matchData = await getMatchData();
      const teams = matchData?.teams;
      if (!teams || teams.length === 0) {
        await reply('⚠️ Chưa có team. Dùng /chiateam trước.');
        return NextResponse.json({ ok: true });
      }

      const msg = buildChiaTienMessage(state.tiensan, state.tiennuoc, state.teamThua, teams);
      await reply(msg, 'Markdown', 'ANNOUNCEMENT');
    }

    // ====================
    // /san [text] - Lưu/xem sân
    // ====================
    else if (textLower === '/san') {
      // Show saved venue info
      const matchData = await getMatchData();
      const venue = matchData?.venue;
      if (venue && (venue.date || venue.time || venue.venue)) {
        let msg = `📍 *Thông tin sân:*\n`;
        if (venue.date) msg += `📅 Ngày: ${venue.date}\n`;
        if (venue.time) msg += `⏰ Giờ: ${venue.time}\n`;
        if (venue.venue) msg += `📍 Sân: ${venue.venue}\n`;
        if (venue.googleMapLink) msg += `🗺️ Map: ${venue.googleMapLink}\n`;
        await reply(msg, 'Markdown');
      } else {
        await reply('⚠️ Chưa lưu sân nào. Dùng /san [ngày - giờ - sân - map] để lưu.\nVí dụ: `/san 26/03/2026 - 19h30 - Sân số 8 - https://maps.app.goo.gl/...`', 'Markdown');
      }
    } else if (textLower.startsWith('/san ')) {
      // Parse and save venue info
      const venue = parseVenueMessage(text);

      let matchData = await getMatchData();
      const now = new Date().toISOString();
      if (!matchData) {
        matchData = { id: generateId(), teams: [], venue: {}, createdAt: now, updatedAt: now };
      }
      matchData.venue = { ...matchData.venue, ...venue };
      matchData.updatedAt = now;
      await saveMatchData(matchData);

      // If parser didn't extract structured fields, save raw text as venue name
      if (!venue.date && !venue.time && !venue.venue) {
        const sanName = text.replace(/^\/san\s+/i, '').trim();
        matchData.venue = { ...matchData.venue, venue: sanName };
        await saveMatchData(matchData);
        await reply(`✅ Đã lưu sân: ${sanName}`);
      } else {
        let replyText = `✅ Đã cập nhật thông tin sân!\n`;
        if (venue.date) replyText += `📅 Ngày: ${venue.date}\n`;
        if (venue.time) replyText += `⏰ Giờ: ${venue.time}\n`;
        if (venue.venue) replyText += `📍 Sân: ${venue.venue}\n`;
        if (venue.googleMapLink) replyText += `🗺️ Map: ${venue.googleMapLink}\n`;
        await reply(replyText);
      }
    }

    // ====================
    // /clearsan - Xoá sân
    // ====================
    else if (textLower === '/clearsan') {
      await updateMatchState({ san: null });
      await reply('✅ Đã xóa sân.');
    }

    // ====================
    // /tiso - Lưu tỉ số (improved from original)
    // ====================
    else if (textLower.startsWith('/tiso')) {
      const scoreText = text.replace(/^\/tiso\s*/i, '').trim();
      const scoreParts = scoreText.split('-').map(s => parseInt(s.trim()));

      if (scoreParts.length < 2 || scoreParts.some(isNaN)) {
        await reply('❌ Format sai! Dùng:\n/tiso 1-2 (Home-Away)\n/tiso 1-2-3 (Home-Away-Extra)');
      } else {
        let matchData = await getMatchData();
        if (!matchData || !matchData.teams || matchData.teams.length === 0) {
          // Try to build teams from team_assignments
          const teamA = await getTeamMembers('teamA');
          const teamB = await getTeamMembers('teamB');
          const team3C = await getTeamMembers('team3C');

          if (teamA.length === 0 && teamB.length === 0) {
            await reply('❌ Chưa có đội hình! Hãy dùng /chiateam hoặc /team để tạo đội hình trước.');
            return NextResponse.json({ ok: true });
          }

          // Build teams from assignments
          const now = new Date().toISOString();
          const teams = [
            { name: 'HOME', players: teamA.map(m => ({ name: m.displayName })) },
            { name: 'AWAY', players: teamB.map(m => ({ name: m.displayName })) },
          ];
          if (team3C.length > 0) {
            teams.push({ name: 'EXTRA', players: team3C.map(m => ({ name: m.displayName })) });
          }

          if (!matchData) {
            matchData = { id: generateId(), teams: [], venue: {}, createdAt: now, updatedAt: now };
          }
          matchData.teams = teams;
          matchData.updatedAt = now;
          await saveMatchData(matchData);
        }

        const homeScore = scoreParts[0];
        const awayScore = scoreParts[1];
        const extraScore = scoreParts.length >= 3 ? scoreParts[2] : null;

        // Save to history
        const state = await getMatchState();
        const saved = await saveMatchHistory(
          homeScore,
          awayScore,
          extraScore,
          matchData!.teams,
          matchData!.venue?.date,
          matchData!.venue?.time,
          matchData!.venue?.venue || state.san || undefined,
        );

        if (saved) {
          // Auto-determine team thua from score
          let teamThua: string | null = null;
          if (extraScore !== null) {
            // 3 teams - find min score team
            const scores = [
              { name: 'HOME', score: homeScore },
              { name: 'AWAY', score: awayScore },
              { name: 'EXTRA', score: extraScore },
            ];
            const minScore = Math.min(homeScore, awayScore, extraScore);
            const losers = scores.filter(s => s.score === minScore);
            if (losers.length === 1) teamThua = losers[0].name;
          } else if (homeScore < awayScore) {
            teamThua = 'HOME';
          } else if (awayScore < homeScore) {
            teamThua = 'AWAY';
          }
          // Save teamThua to match_state
          await updateMatchState({ teamThua });

          let resultText = '';
          if (extraScore !== null) {
            const scores = [
              { name: 'HOME', score: homeScore },
              { name: 'AWAY', score: awayScore },
              { name: 'EXTRA', score: extraScore },
            ];
            const maxScore = Math.max(homeScore, awayScore, extraScore);
            resultText = scores.map(s =>
              `${s.name === 'HOME' ? '🏠' : s.name === 'AWAY' ? '✈️' : '⭐'} ${s.name}: ${s.score} ${s.score === maxScore ? '✅' : '❌'}`
            ).join('\n');
          } else if (homeScore > awayScore) {
            resultText = `⚽ HOME thắng!\n🏠 HOME: ${homeScore} ✅\n✈️ AWAY: ${awayScore} ❌`;
          } else if (awayScore > homeScore) {
            resultText = `⚽ AWAY thắng!\n🏠 HOME: ${homeScore} ❌\n✈️ AWAY: ${awayScore} ✅`;
          } else {
            resultText = `⚽ Hoà!\n🏠 HOME: ${homeScore} 🤝\n✈️ AWAY: ${awayScore} 🤝`;
          }

          const totalPlayers = matchData!.teams.reduce((s, t) => s + t.players.length, 0);
          await reply(`✅ Đã lưu tỉ số!\n\n${resultText}\n\n📊 Đã cập nhật thống kê ${totalPlayers} cầu thủ.`);
        } else {
          await reply('❌ Lỗi khi lưu tỉ số. Vui lòng thử lại.');
        }
      }
    }

    // ====================
    // /team (with lineup text) - Parse team lineup
    // ====================
    else if (textLower.startsWith('/team') && text.includes('👤')) {
      const teams = parseTeamMessage(text);
      if (teams.length > 0) {
        let matchData = await getMatchData();
        const now = new Date().toISOString();
        if (!matchData) {
          matchData = { id: generateId(), teams: [], venue: {}, createdAt: now, updatedAt: now };
        }
        matchData.teams = teams;
        matchData.updatedAt = now;
        matchData.rawMessage = text;
        await saveMatchData(matchData);

        const totalPlayers = teams.reduce((sum, t) => sum + t.players.length, 0);
        await reply(`✅ Đã cập nhật đội hình!\n${teams.map(t => `${t.name}: ${t.players.length} người`).join('\n')}\nTổng: ${totalPlayers} người`);
      } else {
        await reply('❌ Không parse được đội hình. Hãy kiểm tra format.');
      }
    }

    // ====================
    // /reset - Xoá dữ liệu trận
    // ====================
    else if (textLower === '/reset') {
      await deleteMatchData();
      await clearAllTeams();
      await updateMatchState({ san: null, teamThua: null });
      await reply('🗑️ Đã xoá toàn bộ dữ liệu trận đấu!');
    }

    // ====================
    // Weekly Vote commands
    // /autopoll, /setschedule, /setautopoll, /setautoremind,
    // /testcron, /checkremind, /createpoll, /votestatus
    // ====================
    else {
      await handleVoteCommand(chatId, text, reply);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Bot webhook is running' });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Parse selection string like "1,3,5" or "1-3" or "all" into 0-indexed indices.
 */
function parseSelectionIndices(selection: string, maxLength: number): number[] {
  const selectedIndices: number[] = [];
  const parts = selection.split(',').map(part => part.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [startRaw, endRaw] = part.split('-');
      const start = parseInt(startRaw.trim());
      const end = parseInt(endRaw.trim());
      if (!isNaN(start) && !isNaN(end) && start > 0 && end <= maxLength && start <= end) {
        for (let i = start - 1; i < end; i++) {
          if (!selectedIndices.includes(i)) {
            selectedIndices.push(i);
          }
        }
      }
    } else {
      const num = parseInt(part);
      if (!isNaN(num) && num > 0 && num <= maxLength) {
        const index = num - 1;
        if (!selectedIndices.includes(index)) {
          selectedIndices.push(index);
        }
      }
    }
  }

  return selectedIndices;
}

/**
 * Build chia tien message with winner/loser split
 */
interface TeamData {
  name: string;
  players: { name: string }[];
}

function buildChiaTienMessage(
  tiensan: number,
  tiennuoc: number,
  teamThua: string | null,
  teams: TeamData[],
): string {
  const totalMembers = teams.reduce((sum, t) => sum + t.players.length, 0);
  if (totalMembers === 0) return '⚠️ Không có thành viên nào trong team.';
  const perMember = Math.ceil(tiensan / totalMembers);

  if (!teamThua) {
    return `💸 Tổng tiền: ${formatMoney(tiensan)} VND\n👥 Số người: ${totalMembers}\n\nMỗi người phải trả: ${formatMoney(perMember)} VND\n\n⚠️ Chưa có tỉ số. Dùng /tiso để xác định team thua.`;
  }

  const loserTeam = teams.find(t => t.name === teamThua);
  const winnerTeams = teams.filter(t => t.name !== teamThua);

  if (!loserTeam) {
    return `💸 Tổng tiền: ${formatMoney(tiensan)} VND\n👥 Số người: ${totalMembers}\n\nMỗi người phải trả: ${formatMoney(perMember)} VND`;
  }

  const loserCount = loserTeam.players.length;
  const waterPerLoser = loserCount > 0 ? Math.ceil(tiennuoc / loserCount) : 0;
  const loserTotal = perMember + waterPerLoser;

  const loserMembers = loserTeam.players.map(p => p.name).join('\n');
  const winnerLines = winnerTeams.map(t =>
    `*${t.name}:*\n${t.players.map(p => p.name).join('\n')}`
  ).join('\n\n');

  return (
    `💸 *Tổng tiền: ${formatMoney(tiensan)} VND*\n` +
    `👥 Số người: ${totalMembers}\n\n` +
    `Mỗi người phải trả: ${formatMoney(perMember)} VND\n` +
    `Tiền nước: ${formatMoney(tiennuoc)}/${loserCount}=${formatMoney(waterPerLoser)}\n\n` +
    `${winnerLines}\n\n` +
    `*${teamThua} (thua):*\n${loserMembers}\n\n` +
    `=> \n` +
    winnerTeams.map(t => `*${t.name}:* ${formatMoney(perMember)}`).join('\n') + '\n' +
    `*${teamThua}:* ${formatMoney(perMember)} + ${formatMoney(waterPerLoser)} = ${formatMoney(loserTotal)}\n\n` +
    `0905889885 Momo, zalopay, shopeefood, lazada, tiki, ...\n` +
    `8888220198 Techcombank`
  );
}
