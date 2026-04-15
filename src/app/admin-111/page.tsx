'use client';

import { useEffect, useState, DragEvent } from 'react';
import { Player, Team, MatchData } from '@/types/match';
import { toast } from 'react-hot-toast';

interface VenueInfo {
  date: string;
  time: string;
  venue: string;
  googleMapLink: string;
  teamConfig: number;
}

export default function VenuePage() {
  const [venue, setVenue] = useState<VenueInfo>({ date: '', time: '', venue: '', googleMapLink: '', teamConfig: 2 });
  const [bench, setBench] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  
  // Players from DB for Modal
  const [allPlayers, setAllPlayers] = useState<{id: string; name: string; telegramHandle?: string}[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [draggedPlayer, setDraggedPlayer] = useState<{player: Player, sourceId: string, index: number} | null>(null);

  useEffect(() => {
    fetch('/api/match')
      .then(r => r.json())
      .then(res => {
        const data: MatchData = res.matchData;
        if (data) {
          setVenue({
            date: data.venue?.date || '', 
            time: data.venue?.time || '',
            venue: data.venue?.venue || '', 
            googleMapLink: data.venue?.googleMapLink || '',
            teamConfig: data.venue?.teamConfig || 2
          });
          setBench(data.bench || []);
          setTeams(data.teams || []);
        }
        if (res.players) {
          setAllPlayers(res.players);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveVenue = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/match/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue }),
      });
      if (res.ok) {
        toast.success('Đã lưu thông tin sân!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu thông tin sân');
    } finally { setSaving(false); }
  };

  const handleCreateTeams = async () => {
    // When click "Tạo Team", initialize empty teams based on config and ensure bench exists if null
    const newTeams: Team[] = [];
    const teamNames = venue.teamConfig === 3 ? ['Home', 'Away', 'Extra'] : ['Home', 'Away'];
    
    for (const name of teamNames) {
      newTeams.push({ name, players: [] });
    }
    
    setTeams(newTeams);
    if (!bench) setBench([]);

    setSaving(true);
    await fetch('/api/match/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams: newTeams, bench: bench || [] }),
    });
    setSaving(false);
    toast.success('Khởi tạo Team thành công');
  };

  const handleAutoSplitTeams = async () => {
    if (bench.length === 0) {
      toast.error('Bench đang trống, không có ai để chia team!');
      return;
    }
    
    // Copy the bench array to shuffle it
    const shuffledBench = [...bench].sort(() => Math.random() - 0.5);
    let currentTeams = JSON.parse(JSON.stringify(teams)) as Team[];
    const teamNames = venue.teamConfig === 3 ? ['Home', 'Away', 'Extra'] : ['Home', 'Away'];
    
    for (const name of teamNames) {
      if (!currentTeams.find(t => t.name.toLowerCase() === name.toLowerCase())) {
        currentTeams.push({ name, players: [] });
      }
    }
    // Only keep valid team configs
    currentTeams = currentTeams.filter(t => teamNames.some(tn => tn.toLowerCase() === t.name.toLowerCase()));
    
    // Deal players to the team with the least amount of existing players
    shuffledBench.forEach((p) => {
      let minTeam = currentTeams[0];
      for (const team of currentTeams) {
        if (team.players.length < minTeam.players.length) {
          minTeam = team;
        }
      }
      minTeam.players.push(p);
    });

    setTeams(currentTeams);
    setBench([]); // Bench is empty now

    setSaving(true);
    await fetch('/api/match/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams: currentTeams, bench: [] }),
    });
    setSaving(false);
    toast.success('Đã chia team thành công!');
  };

  const handleOpenAddModal = () => {
    setSelectedPlayerIds(new Set());
    setIsAddModalOpen(true);
  };

  const togglePlayerSelection = (id: string) => {
    const newPaths = new Set(selectedPlayerIds);
    if (newPaths.has(id)) {
      newPaths.delete(id);
    } else {
      newPaths.add(id);
    }
    setSelectedPlayerIds(newPaths);
  };

  const handleAddSelectedToBench = () => {
    const selectedPlayers = allPlayers.filter(p => selectedPlayerIds.has(p.id));
    const newBenchPlayers = selectedPlayers.map(p => ({
      name: p.name,
      telegramHandle: p.telegramHandle || '',
      playerId: p.id
    }));

    // Filter out those already in bench or teams
    const currentAllNames = new Set([
      ...bench.map(p => p.name),
      ...teams.flatMap(t => t.players.map(p => p.name))
    ]);

    const actuallyAdded = newBenchPlayers.filter(p => !currentAllNames.has(p.name));
    
    if (actuallyAdded.length === 0) {
      toast.error('Các cầu thủ này đã có trong danh sách!');
      return;
    }

    const currentBench = [...bench, ...actuallyAdded];
    setBench(currentBench);
    handleSaveTeamsAndBench(currentBench, teams);
    setIsAddModalOpen(false);
    toast.success(`Đã thêm ${actuallyAdded.length} cầu thủ vào Bench!`);
  };

  const handleCopyTelegramCommand = () => {
    if (bench.length === 0) {
      toast.error('Bench đang trống!');
      return;
    }
    const names = bench.map(p => p.name).join(', ');
    const command = `/add ${names}`;
    navigator.clipboard.writeText(command);
    toast.success('Đã copy: ' + command);
  };

  const handleSaveTeamsAndBench = async (newBench: Player[], newTeams: Team[]) => {
    setSaving(true);
    try {
      await fetch('/api/match/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: newTeams, bench: newBench }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  /* ----- Drag and Drop Logic ----- */
  const onDragStart = (e: DragEvent<HTMLDivElement>, player: Player, sourceId: string, index: number) => {
    setDraggedPlayer({ player, sourceId, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedPlayer) return;
    
    const { player, sourceId, index } = draggedPlayer;
    if (sourceId === targetId) return; // Dropped in same place

    const currentBench = [...bench];
    const currentTeams = JSON.parse(JSON.stringify(teams)) as Team[];

    // Remove from source
    if (sourceId === 'bench') {
      currentBench.splice(index, 1);
    } else {
      const sourceTeam = currentTeams.find(t => t.name === sourceId);
      if (sourceTeam) sourceTeam.players.splice(index, 1);
    }

    // Add to target
    if (targetId === 'trash') {
      // Do nothing! They are just removed from source
    } else if (targetId === 'bench') {
      currentBench.push(player);
    } else {
      const targetTeam = currentTeams.find(t => t.name === targetId);
      if (targetTeam) targetTeam.players.push(player);
    }

    setBench(currentBench);
    setTeams(currentTeams);
    setDraggedPlayer(null);

    // Auto save
    handleSaveTeamsAndBench(currentBench, currentTeams);
  };

  return (
    <div className="admin-card" style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 className="admin-section-title" style={sectionTitleStyle}>1. Thông tin sân bóng</h2>
        {status && <span style={statusStyle}>{status}</span>}
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#8a8aaa' }}>Đang tải...</div>
      ) : (
        <>
          <div className="admin-form-grid-2" style={{ marginBottom: '12px' }}>
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
          <div className="admin-form-grid-2" style={{ marginBottom: '16px' }}>
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
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Số Đội Hình (Cấu hình Team)</label>
            <select 
              style={inputStyle} 
              value={venue.teamConfig} 
              onChange={e => setVenue(v => ({ ...v, teamConfig: parseInt(e.target.value) }))}
            >
              <option value={2}>2 Đội (Home - Away)</option>
              <option value={3}>3 Đội (Home - Away - Extra)</option>
            </select>
          </div>
          
          <div className="admin-save-row">
            <button style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleSaveVenue} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thông tin sân'}
            </button>
          </div>
          
          <hr style={{ margin: '32px 0', borderTop: '1px solid var(--border-subtle)' }} />

          {/* TEAM MANAGEMENT */}
          <h2 className="admin-section-title" style={sectionTitleStyle}>2. Dashboard Chia Team (Kéo & Thả)</h2>
          <div className="admin-action-row">
            <button style={{ ...btnBase, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} onClick={handleCreateTeams}>
              🪄 Khởi tạo Team
            </button>
            <button style={{ ...btnBase, background: 'var(--field-accent-light)', color: 'white' }} onClick={handleAutoSplitTeams}>
              🎲 Auto Chia Đều
            </button>
            <button style={{ ...btnBase, background: '#0088cc', color: 'white' }} onClick={handleCopyTelegramCommand} title="Copy để paste vào nhóm chat">
              📋 Copy Telegram
            </button>
          </div>

          <div className="admin-dashboard-grid">
            {/* BENCH COLUMN */}
            <div 
              style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', minHeight: '300px' }}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, 'bench')}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', textAlign: 'center', color: 'var(--text-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                🪑 BENCH DỰ BỊ ({bench.length})
                <button 
                  onClick={handleOpenAddModal}
                  style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
                >
                  +
                </button>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bench.map((player, idx) => (
                  <div
                    key={`bench-${idx}`}
                    draggable
                    onDragStart={(e) => onDragStart(e, player, 'bench', idx)}
                    style={{
                      background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', cursor: 'grab',
                      border: '1px solid var(--border-subtle)', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                    <span style={{ cursor: 'grab' }}>≡</span> {player.name}
                  </div>
                ))}
                {bench.length === 0 && (
                  <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>
                    Kéo thả cầu thủ vào đây...
                  </div>
                )}
              </div>
            </div>

            {/* TEAMS COLUMN */}
            <div className="admin-teams-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${teams.length || 1}, 1fr)`, gap: '16px' }}>
              {teams.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', paddingTop: '40px' }}>
                  Chưa có khung Team nào. Ấn &quot;Khởi tạo Khung Team&quot; ở trên.
                </div>
              ) : (
                teams.map((team) => (
                  <div 
                    key={team.name}
                    style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', minHeight: '300px' }}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, team.name)}
                  >
                    <h3 style={{ 
                      fontSize: '14px', fontWeight: 800, marginBottom: '16px', textAlign: 'center', 
                      color: team.name === 'Home' ? '#2196F3' : team.name === 'Away' ? '#e91e63' : '#FF9800'
                    }}>
                      {team.name.toUpperCase()} ({team.players.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {team.players.map((player, idx) => (
                        <div
                          key={`team-${team.name}-${idx}`}
                          draggable
                          onDragStart={(e) => onDragStart(e, player, team.name, idx)}
                          style={{
                            background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', cursor: 'grab',
                            border: '1px solid var(--border-subtle)', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
                          }}
                        >
                          <span style={{ cursor: 'grab' }}>≡</span> {player.name}
                        </div>
                      ))}
                      {team.players.length === 0 && (
                        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>
                          Kéo thả vào đây...
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, 'trash')}
            style={{
              marginTop: '24px',
              border: '2px dashed #e53935',
              background: draggedPlayer ? 'rgba(229,57,53,0.1)' : 'transparent',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              color: '#e53935',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              opacity: draggedPlayer ? 1 : 0.6
            }}
          >
            <span style={{ fontSize: '24px' }}>🗑️</span> Kéo thả vào đây để XÓA cầu khỏi bench or team
          </div>
        </>
      )}
      {/* Add From Player DB Modal */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', width: '100%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Thêm cầu thủ vào Bench</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ padding: '12px 20px', flex: 1, overflowY: 'auto' }}>
              {allPlayers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Chưa có danh sách cầu thủ.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allPlayers.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', cursor: 'pointer', border: selectedPlayerIds.has(p.id) ? '1px solid var(--accent)' : '1px solid transparent' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedPlayerIds.has(p.id)}
                        onChange={() => togglePlayerSelection(p.id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{p.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                Hủy
              </button>
              <button 
                onClick={handleAddSelectedToBench}
                disabled={selectedPlayerIds.size === 0}
                style={{ flex: 1, padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: 'white', opacity: selectedPlayerIds.size === 0 ? 0.5 : 1 }}
              >
                Thêm ({selectedPlayerIds.size})
              </button>
            </div>
          </div>
        </div>
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
  fontSize: '16px', fontWeight: 800, color: '#c62828', margin: 0,
};

const statusStyle: React.CSSProperties = {
  fontSize: '12px', color: '#e53935', fontWeight: 800,
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#4a4a6a',
  display: 'block', marginBottom: '4px', textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1.5px solid rgba(198,40,40,0.15)', background: '#fffafa',
  fontSize: '14px', fontFamily: 'inherit', outline: 'none',
  color: '#1a1a2e', transition: 'border-color 0.2s',
};

const btnBase: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', border: 'none',
  fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  padding: '10px 24px', borderRadius: '10px',
  background: 'linear-gradient(135deg, var(--field-accent-dark), var(--field-accent-light))',
  color: 'white', fontSize: '14px',
};
