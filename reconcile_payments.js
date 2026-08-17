/**
 * Script đối soát thanh toán: check tất cả đơn pending trên DB với PayOS API
 * 
 * Chạy: node reconcile_payments.js
 * 
 * Cần set env vars (hoặc sửa trực tiếp trong file):
 *   PAYOS_CLIENT_ID, PAYOS_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udlhudfxwuwbecjqvvhv.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_eLgVND4pQytOwY9UYoKB2A_HusWxTKM';

// ⚠️ PASTE PAYOS KEYS TỪ VERCEL ENV VÀO ĐÂY:
const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || '';
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || '';

const PAYOS_API_BASE = 'https://api-merchant.payos.vn/v2';

// Telegram notification endpoint
const NOTIFY_URL = 'https://summary-bot-sepia.vercel.app/api/notify-payment';

async function supabaseQuery(table, method, options = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'PATCH' ? 'return=representation' : undefined,
  };

  if (options.filters) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(options.filters)) {
      params.append(key, val);
    }
    url += '?' + params.toString();
  }

  if (options.select) {
    const sep = url.includes('?') ? '&' : '?';
    url += `${sep}select=${options.select}`;
  }

  const fetchOpts = { method: method || 'GET', headers: Object.fromEntries(Object.entries(headers).filter(([,v]) => v)) };
  if (options.body) fetchOpts.body = JSON.stringify(options.body);

  const res = await fetch(url, fetchOpts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${table} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function checkPayOS(orderCode) {
  const res = await fetch(`${PAYOS_API_BASE}/payment-requests/${orderCode}`, {
    headers: {
      'x-client-id': PAYOS_CLIENT_ID,
      'x-api-key': PAYOS_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayOS API error: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.data || json;
}

async function sendNotification(playerNames, amount, senderName) {
  const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  let bodyText = `Đã nhận thanh toán của ${playerNames} với số tiền ${formattedAmount}`;
  if (senderName) {
    bodyText = `${senderName} đã thanh toán ${formattedAmount} cho ${playerNames}`;
  }

  try {
    await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Thanh toán thành công', body: bodyText }),
    });
    console.log(`  📱 Đã gửi noti Telegram`);
  } catch (err) {
    console.error(`  ⚠️ Gửi noti thất bại:`, err.message);
  }
}

async function main() {
  console.log('🔍 Bắt đầu đối soát thanh toán...\n');

  if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY) {
    console.error('❌ Thiếu PAYOS_CLIENT_ID hoặc PAYOS_API_KEY!');
    console.error('   Hãy set env vars hoặc paste trực tiếp vào file script.');
    process.exit(1);
  }

  // 1. Lấy tất cả đơn pending từ DB
  const pendingOrders = await supabaseQuery('payment_orders', 'GET', {
    filters: { 'status': 'in.(pending,processing)', 'order': 'created_at.desc' },
    select: '*',
  });

  console.log(`📋 Tìm thấy ${pendingOrders.length} đơn pending/processing\n`);

  if (pendingOrders.length === 0) {
    console.log('✅ Không có đơn nào cần đối soát!');
    return;
  }

  let paidCount = 0;
  let cancelledCount = 0;
  let errorCount = 0;

  for (const order of pendingOrders) {
    console.log(`--- Order #${order.order_code} (ID: ${order.id}) ---`);
    console.log(`  DB status: ${order.status}, Amount: ${order.amount}`);

    try {
      const payosInfo = await checkPayOS(order.order_code);
      console.log(`  PayOS status: ${payosInfo.status}`);

      if (payosInfo.status === 'PAID') {
        // Update payment_orders
        const nowIso = new Date().toISOString();
        await supabaseQuery('payment_orders', 'PATCH', {
          filters: { 'id': `eq.${order.id}` },
          body: { status: 'paid', paid_at: nowIso },
        });

        // Update player_payments
        const playerPaymentIds = order.player_payment_ids || [];
        let playerNames = '';

        if (playerPaymentIds.length > 0) {
          // Update each player payment
          for (const ppId of playerPaymentIds) {
            await supabaseQuery('player_payments', 'PATCH', {
              filters: { 'id': `eq.${ppId}` },
              body: { is_paid: true, paid_at: nowIso, payment_method: 'payos' },
            });
          }

          // Get player names
          const players = await supabaseQuery('player_payments', 'GET', {
            filters: { 'id': `in.(${playerPaymentIds.join(',')})` },
            select: 'player_name',
          });
          playerNames = players.map(p => p.player_name).join(', ');
        }

        // Send Telegram notification
        const senderName = payosInfo.transactions?.[0]?.counterAccountName;
        if (playerNames) {
          await sendNotification(playerNames, order.amount, senderName);
        }

        console.log(`  ✅ Đã cập nhật: PAID | Players: ${playerNames}`);
        paidCount++;

      } else if (payosInfo.status === 'CANCELLED') {
        await supabaseQuery('payment_orders', 'PATCH', {
          filters: { 'id': `eq.${order.id}` },
          body: { status: 'cancelled' },
        });
        console.log(`  ❌ Đã cập nhật: CANCELLED`);
        cancelledCount++;

      } else {
        console.log(`  ⏳ Giữ nguyên (PayOS: ${payosInfo.status})`);
      }
    } catch (err) {
      console.error(`  ⚠️ Lỗi: ${err.message}`);
      errorCount++;
    }
    console.log('');
  }

  console.log('========================================');
  console.log(`📊 Kết quả đối soát:`);
  console.log(`   ✅ Đã paid: ${paidCount}`);
  console.log(`   ❌ Cancelled: ${cancelledCount}`);
  console.log(`   ⚠️ Lỗi: ${errorCount}`);
  console.log(`   ⏳ Giữ nguyên: ${pendingOrders.length - paidCount - cancelledCount - errorCount}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
