import { NextResponse } from 'next/server';
import { getMatchData, saveMatchData, generateId, deleteMatchData } from '@/lib/storage';
import { parseTeamMessage, parseVenueMessage } from '@/lib/parser';
import { saveMatchHistory } from '@/lib/history';
import { getOrCreateMatchPayment, updateMatchPayment, parsePrice } from '@/lib/payment';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body.message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const text: string = message.text;
    const textLower = text.toLowerCase();
    const chatId = message.chat?.id;

    // Get or create match data
    let matchData = await getMatchData();
    const now = new Date().toISOString();

    if (!matchData) {
      matchData = {
        id: generateId(),
        teams: [],
        venue: {},
        createdAt: now,
        updatedAt: now,
      };
    }

    let replyText = '';

    // Handle /tiso command - record match score
    if (textLower.startsWith('/tiso')) {
      const scoreText = text.replace(/^\/tiso\s*/i, '').trim();
      const scoreParts = scoreText.split('-').map(s => parseInt(s.trim()));

      if (scoreParts.length < 2 || scoreParts.some(isNaN)) {
        replyText = '❌ Format sai! Dùng:\n/tiso 1-2 (Home-Away)\n/tiso 1-2-3 (Home-Away-Extra)';
      } else if (!matchData.teams || matchData.teams.length === 0) {
        replyText = '❌ Chưa có đội hình! Hãy dùng /team để tạo đội hình trước.';
      } else {
        const homeScore = scoreParts[0];
        const awayScore = scoreParts[1];
        const extraScore = scoreParts.length >= 3 ? scoreParts[2] : null;

        // Determine result text
        let resultText = '';
        if (extraScore !== null) {
          // 3-team: find actual winner
          const scores = [
            { name: 'HOME', emoji: '🏠', score: homeScore },
            { name: 'AWAY', emoji: '✈️', score: awayScore },
            { name: 'EXTRA', emoji: '⭐', score: extraScore },
          ];
          scores.sort((a, b) => b.score - a.score);
          const winner = scores[0].score > scores[1].score ? scores[0] : null;
          resultText = winner
            ? `⚽ ${winner.name} thắng!\n` + scores.map(s => `${s.emoji} ${s.name}: ${s.score} ${s === winner ? '✅' : '❌'}`).join('\n')
            : `⚽ Hoà!\n` + scores.map(s => `${s.emoji} ${s.name}: ${s.score} 🤝`).join('\n');
        } else if (homeScore > awayScore) {
          resultText = `⚽ HOME thắng!\n🏠 HOME: ${homeScore} ✅\n✈️ AWAY: ${awayScore} ❌`;
        } else if (awayScore > homeScore) {
          resultText = `⚽ AWAY thắng!\n🏠 HOME: ${homeScore} ❌\n✈️ AWAY: ${awayScore} ✅`;
        } else {
          resultText = `⚽ Hoà!\n🏠 HOME: ${homeScore} 🤝\n✈️ AWAY: ${awayScore} 🤝`;
        }

        // Save to history
        const saved = await saveMatchHistory(
          homeScore,
          awayScore,
          extraScore,
          matchData.teams,
          matchData.venue?.date,
          matchData.venue?.time,
          matchData.venue?.venue,
        );

        if (saved) {
          replyText = `✅ Đã lưu tỉ số!\n\n${resultText}\n\n📊 Đã cập nhật thống kê ${matchData.teams.reduce((s, t) => s + t.players.length, 0)} cầu thủ.`;
        } else {
          replyText = '❌ Lỗi khi lưu tỉ số. Vui lòng thử lại.';
        }
      }
    }

    // Handle /Team command - team lineup
    else if (textLower.startsWith('/team')) {
      const teams = parseTeamMessage(text);
      if (teams.length > 0) {
        matchData.teams = teams;
        matchData.updatedAt = now;
        matchData.rawMessage = text;
        await saveMatchData(matchData);

        const totalPlayers = teams.reduce((sum, t) => sum + t.players.length, 0);
        replyText = `✅ Đã cập nhật đội hình!\n${teams.map(t => `${t.name}: ${t.players.length} người`).join('\n')}\nTổng: ${totalPlayers} người`;
      } else {
        replyText = '❌ Không parse được đội hình. Hãy kiểm tra format.';
      }
    }

    // Handle /San command - venue info, team lineup, or field cost
    else if (textLower.startsWith('/san')) {
      const sanArg = text.replace(/^\/san\s*/i, '').trim();

      // Check if it's a price (e.g. /san 580k, /san 580000)
      const price = parsePrice(sanArg);
      if (price !== null && price > 0) {
        const mp = await getOrCreateMatchPayment(matchData.id);
        await updateMatchPayment(mp.id, { fieldCost: price });
        const formatted = new Intl.NumberFormat('vi-VN').format(price);
        replyText = `✅ Đã lưu tiền sân: ${formatted}đ`;
      }
      // Check if it contains team lineup (has 👤)
      else if (text.includes('⚪') || text.includes('⚫') || text.includes('🟠')) {
        const teams = parseTeamMessage(text);
        if (teams.length > 0) {
          matchData.teams = teams;
          matchData.updatedAt = now;
          matchData.rawMessage = text;
          await saveMatchData(matchData);

          const totalPlayers = teams.reduce((sum, t) => sum + t.players.length, 0);
          replyText = `✅ Đã cập nhật đội hình!\n${teams.map(t => `${t.name}: ${t.players.length} người`).join('\n')}\nTổng: ${totalPlayers} người`;
        } else {
          replyText = '❌ Không parse được đội hình.';
        }
      } else {
        // Parse venue info
        const venue = parseVenueMessage(text);
        if (venue.date || venue.time || venue.venue) {
          matchData.venue = { ...matchData.venue, ...venue };
          matchData.updatedAt = now;
          await saveMatchData(matchData);

          replyText = `✅ Đã cập nhật thông tin sân!\n`;
          if (venue.date) replyText += `📅 Ngày: ${venue.date}\n`;
          if (venue.time) replyText += `⏰ Giờ: ${venue.time}\n`;
          if (venue.venue) replyText += `📍 Sân: ${venue.venue}\n`;
          if (venue.googleMapLink) replyText += `🗺️ Map: ${venue.googleMapLink}\n`;
        } else {
          replyText = '❌ Không parse được thông tin sân. Format: /San 12/3 - 19h15 - Sân số 8';
        }
      }
    }

    // Handle /nuoc command - drink cost
    else if (textLower.startsWith('/nuoc')) {
      const nuocArg = text.replace(/^\/nuoc\s*/i, '').trim();
      const price = parsePrice(nuocArg);
      if (price !== null && price > 0) {
        const mp = await getOrCreateMatchPayment(matchData.id);
        await updateMatchPayment(mp.id, { drinkCost: price });
        const formatted = new Intl.NumberFormat('vi-VN').format(price);
        replyText = `✅ Đã lưu tiền nước: ${formatted}đ`;
      } else {
        replyText = '❌ Format sai! Dùng: /nuoc 160k hoặc /nuoc 160000';
      }
    }

    // Handle /reset command
    else if (text.toLowerCase().startsWith('/reset')) {
      await deleteMatchData();
      replyText = '🗑️ Đã xoá toàn bộ dữ liệu trận đấu!';
    }

    // Send reply via Telegram API
    if (replyText && chatId) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
          }),
        });
      }
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
