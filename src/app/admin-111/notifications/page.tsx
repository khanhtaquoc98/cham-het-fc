'use client';

import { useEffect, useState } from 'react';

interface VenueInfo {
  date: string;
  time: string;
  venue: string;
  googleMapLink: string;
}

export default function NotificationsPage() {
  const [notiTitle, setNotiTitle] = useState('⚽ Chấm Hết FC');
  const [notiMessage, setNotiMessage] = useState('');
  const [notiSending, setNotiSending] = useState(false);
  const [notiStatus, setNotiStatus] = useState<string | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [autoNotifyStatus, setAutoNotifyStatus] = useState<string | null>(null);
  const [venue, setVenue] = useState<VenueInfo>({ date: '', time: '', venue: '', googleMapLink: '' });
  const [attendanceSending, setAttendanceSending] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/push/send').then(r => r.json()).then(d => setSubscriberCount(d.count || 0)).catch(() => {});
    fetch('/api/venue').then(r => r.json()).then(data => setVenue({
      date: data.date || '', time: data.time || '',
      venue: data.venue || '', googleMapLink: data.googleMapLink || '',
    })).catch(() => {});
  }, []);

  const handleSendNotification = async () => {
    if (!notiTitle || !notiMessage) return;
    setNotiSending(true);
    setNotiStatus(null);
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: notiTitle, message: notiMessage }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotiStatus(`✅ Đã gửi ${data.sent} thiết bị` + (data.failed > 0 ? ` (${data.failed} lỗi)` : ''));
        setNotiMessage('');
      } else {
        setNotiStatus('❌ Lỗi: ' + (data.error || 'Không rõ'));
      }
      setTimeout(() => setNotiStatus(null), 5000);
    } catch (err) {
      console.error(err);
      setNotiStatus('❌ Lỗi kết nối');
    } finally { setNotiSending(false); }
  };

  const handleAutoNotify = async () => {
    setAutoNotifyStatus('Đang kiểm tra...');
    try {
      const res = await fetch('/api/push/auto-notify');
      const data = await res.json();
      setAutoNotifyStatus(data.sent ? `✅ ${data.reason}` : `ℹ️ ${data.reason}`);
      setTimeout(() => setAutoNotifyStatus(null), 5000);
    } catch {
      setAutoNotifyStatus('❌ Lỗi');
    }
  };

  const handleAttendanceNotify = async () => {
    setAttendanceSending(true);
    setAttendanceStatus(null);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chamhetfc.vercel.app';
    const venueInfo = [venue.date, venue.time, venue.venue].filter(Boolean).join(' • ');
    const title = '📋 Điểm danh trận đấu';
    const pushMessage = `Anh em vào App điểm danh nhé!${venueInfo ? `\n${venueInfo}` : ''}\n\n👉 Vào App → Login → Điểm danh`;
    const telegramBody = `📋 *Thông báo điểm danh*\n\nAnh em vào App điểm danh nhé! ⚽${venueInfo ? `\n📍 ${venueInfo}` : ''}\n\n👉 Vào App → Login → Điểm danh\n🔗 Link: ${baseUrl}`;

    const results: string[] = [];

    try {
      // 1. Push notification
      const pushRes = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message: pushMessage }),
      });
      const pushData = await pushRes.json();
      if (pushData.ok) {
        results.push(`📱 Push: ${pushData.sent} thiết bị`);
      } else {
        results.push(`📱 Push: ❌ ${pushData.error || 'Lỗi'}`);
      }
    } catch {
      results.push('📱 Push: ❌ Lỗi kết nối');
    }

    try {
      // 2. Telegram notification
      const tgRes = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body: telegramBody }),
      });
      const tgData = await tgRes.json();
      if (tgData.ok) {
        results.push('💬 Telegram: ✅ Đã gửi');
      } else {
        results.push(`💬 Telegram: ❌ ${tgData.error || 'Lỗi'}`);
      }
    } catch {
      results.push('💬 Telegram: ❌ Lỗi kết nối');
    }

    setAttendanceStatus(`✅ ${results.join(' | ')}`);
    setTimeout(() => setAttendanceStatus(null), 8000);
    setAttendanceSending(false);
  };

  return (
    <div className="admin-card" style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={sectionTitleStyle}>
          🔔 Gửi thông báo ({subscriberCount} thiết bị)
        </h2>
        {notiStatus && <span style={statusStyle}>{notiStatus}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>Tiêu đề</label>
          <input style={inputStyle} placeholder="VD: ⚽ Chấm Hết FC" value={notiTitle}
            onChange={e => setNotiTitle(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Nội dung thông báo</label>
          <textarea
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' as const }}
            placeholder="VD: Nhớ đến sân lúc 19h15 nhé anh em! 🔥"
            value={notiMessage}
            onChange={e => setNotiMessage(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-noti-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          style={{
            ...btnPrimary,
            opacity: (!notiTitle || !notiMessage || notiSending) ? 0.5 : 1,
            cursor: (!notiTitle || !notiMessage || notiSending) ? 'not-allowed' : 'pointer',
          }}
          onClick={handleSendNotification}
          disabled={notiSending || !notiTitle || !notiMessage}
        >
          {notiSending ? 'Đang gửi...' : '📤 Gửi thông báo'}
        </button>

        <button
          style={{ ...btnBase, padding: '10px 24px', borderRadius: '10px', background: '#fff3e0', color: '#e65100', fontSize: '14px' }}
          onClick={handleAutoNotify}
        >
          ⏰ Kiểm tra tự động
        </button>

        <button
          style={{
            ...btnBase,
            padding: '10px 24px',
            borderRadius: '10px',
            background: attendanceSending ? '#c8e6c9' : 'linear-gradient(135deg, #43a047, #66bb6a)',
            color: 'white',
            fontSize: '14px',
            opacity: attendanceSending ? 0.7 : 1,
            cursor: attendanceSending ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(67,160,71,0.25)',
          }}
          onClick={handleAttendanceNotify}
          disabled={attendanceSending}
        >
          {attendanceSending ? 'Đang gửi...' : '📋 Thông báo điểm danh'}
        </button>
      </div>

      {attendanceStatus && (
        <div style={{ marginTop: '10px', fontSize: '13px', color: '#2e7d32', fontWeight: 600, background: 'rgba(46,125,50,0.06)', padding: '8px 12px', borderRadius: '8px' }}>
          {attendanceStatus}
        </div>
      )}

      {autoNotifyStatus && (
        <div style={{ marginTop: '10px', fontSize: '13px', color: '#4a4a6a', fontStyle: 'italic' }}>
          {autoNotifyStatus}
        </div>
      )}

      <div style={{ marginTop: '14px', padding: '12px 16px', background: 'rgba(198,40,40,0.03)', borderRadius: '10px', fontSize: '12px', color: '#8a8aaa', lineHeight: 1.7 }}>
        💡 <strong>Tự động gửi:</strong> Hệ thống sẽ gửi nhắc nhở trước giờ đá 1 tiếng nếu đã cấu hình ngày/giờ ở mục &quot;Thông tin sân bóng&quot;.
        <br />
        📋 <strong>Điểm danh:</strong> Gửi thông báo nhắc điểm danh qua cả Push Notification + Telegram, kèm hướng dẫn: Vào App → Login → Điểm danh.
      </div>
    </div>
  );
}

/* ========== STYLES ========== */

const cardStyle: React.CSSProperties = {
  background: 'white', borderRadius: '14px', padding: '20px 24px',
  border: '1px solid rgba(198,40,40,0.1)',
  boxShadow: '0 2px 8px rgba(198,40,40,0.05)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '15px', fontWeight: 700, color: '#c62828', margin: 0,
};

const statusStyle: React.CSSProperties = {
  fontSize: '12px', color: '#e53935', fontWeight: 600,
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#4a4a6a',
  display: 'block', marginBottom: '4px', textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1.5px solid rgba(198,40,40,0.15)', background: '#fffafa',
  fontSize: '14px', fontFamily: 'Chiron GoRound TC, sans-serif', outline: 'none',
  color: '#1a1a2e', transition: 'border-color 0.2s',
};

const btnBase: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', border: 'none',
  fontSize: '13px', fontWeight: 600, fontFamily: 'Chiron GoRound TC, sans-serif',
  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  padding: '10px 24px', borderRadius: '10px',
  background: 'linear-gradient(135deg, #e53935, #ef5350)',
  color: 'white', fontSize: '14px',
};
