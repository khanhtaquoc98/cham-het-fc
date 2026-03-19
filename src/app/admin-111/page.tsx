'use client';

import { useEffect, useState } from 'react';

interface VenueInfo {
  date: string;
  time: string;
  venue: string;
  googleMapLink: string;
}

export default function VenuePage() {
  const [venue, setVenue] = useState<VenueInfo>({ date: '', time: '', venue: '', googleMapLink: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/venue')
      .then(r => r.json())
      .then(data => setVenue({
        date: data.date || '', time: data.time || '',
        venue: data.venue || '', googleMapLink: data.googleMapLink || '',
      }))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/venue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(venue),
      });
      if (res.ok) {
        setStatus('Đã lưu!');
        setTimeout(() => setStatus(null), 2000);
      }
    } catch (err) {
      console.error(err);
      setStatus('Lỗi khi lưu');
    } finally { setSaving(false); }
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={sectionTitleStyle}>Thông tin sân bóng</h2>
        {status && <span style={statusStyle}>{status}</span>}
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#8a8aaa' }}>Đang tải...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Ngày thi đấu</label>
              <input style={inputStyle} placeholder="VD: 12/3, 25/12" value={venue.date}
                onChange={e => setVenue(v => ({ ...v, date: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Giờ thi đấu</label>
              <input style={inputStyle} placeholder="VD: 19h15, 20h00" value={venue.time}
                onChange={e => setVenue(v => ({ ...v, time: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Tên sân</label>
              <input style={inputStyle} placeholder="VD: Sân số 8" value={venue.venue}
                onChange={e => setVenue(v => ({ ...v, venue: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Link Google Maps</label>
              <input style={inputStyle} placeholder="https://maps.google.com/..." value={venue.googleMapLink}
                onChange={e => setVenue(v => ({ ...v, googleMapLink: e.target.value }))} />
            </div>
          </div>
          <button style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thông tin sân'}
          </button>
        </>
      )}
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
  fontSize: '14px', fontFamily: 'Outfit, sans-serif', outline: 'none',
  color: '#1a1a2e', transition: 'border-color 0.2s',
};

const btnBase: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', border: 'none',
  fontSize: '13px', fontWeight: 600, fontFamily: 'Outfit, sans-serif',
  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  padding: '10px 24px', borderRadius: '10px',
  background: 'linear-gradient(135deg, #e53935, #ef5350)',
  color: 'white', fontSize: '14px',
};
