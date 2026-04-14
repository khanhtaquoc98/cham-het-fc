"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

/* ────────────────────────────────
   WEB AUDIO BEEP/BELL
   ──────────────────────────────── */
let bellInterval: NodeJS.Timeout | null = null;
let bellAudioCtx: AudioContext | null = null;

const stopBellSound = () => {
  if (bellInterval) {
    clearInterval(bellInterval);
    bellInterval = null;
  }
  if (bellAudioCtx) {
    bellAudioCtx.close().catch(() => {});
    bellAudioCtx = null;
  }
};

const playBellSound = () => {
  stopBellSound();
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    bellAudioCtx = new AudioContextClass();

    const ringOnce = () => {
      if (!bellAudioCtx) return;
      const ctx = bellAudioCtx;
      
      const createOscillator = (freq: number, type: OscillatorType, duration: number, vol: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      };

      // Chuông báo dồn dập, to hơn
      createOscillator(1046.50, 'triangle', 0.3, 1.0); // C6, louder, sharper
      createOscillator(1569.75, 'triangle', 0.3, 0.8); // G6
    };

    ringOnce();
    bellInterval = setInterval(ringOnce, 400); // Lặp lại tiếng chuông cực nhanh (0.4s)
  } catch (error) {
    console.warn("Audio playback failed", error);
  }
};

/* ───────── types ───────── */
type TeamColor = "white" | "black" | "orange";

interface TeamInfo {
  color: TeamColor;
  label: string;
  bg: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
  emoji: string;
}

const TEAMS: Record<TeamColor, TeamInfo> = {
  white: {
    color: "white",
    label: "Trắng",
    bg: "#f5f5f5",
    textColor: "#1a1a2e",
    borderColor: "#e0e0e0",
    glowColor: "rgba(255,255,255,0.5)",
    emoji: "⚪",
  },
  black: {
    color: "black",
    label: "Đen",
    bg: "#1a1a2e",
    textColor: "#ffffff",
    borderColor: "#333",
    glowColor: "rgba(0,0,0,0.5)",
    emoji: "⚫",
  },
  orange: {
    color: "orange",
    label: "Cam",
    bg: "#ef6c00",
    textColor: "#ffffff",
    borderColor: "#e65100",
    glowColor: "rgba(239,108,0,0.5)",
    emoji: "🟠",
  },
};

const ALL_COLORS: TeamColor[] = ["white", "black", "orange"];
const MATCH_DURATION = 7 * 60; // 7 minutes in seconds
const WIN_GOALS = 2;

/* ───────── helpers ───────── */
function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

import { useLiveMatch, LiveMatchState, MatchEvent } from "@/hooks/useLiveMatch";

/* ────────────────────────────────
   MAIN PAGE
   ──────────────────────────────── */
export default function MatchNowPage() {
  const { liveMatch, events, loading, updateMatch, scoreGoal, addEvent, clearEvents } = useLiveMatch();

  if (loading) {
    return (
      <div className="match-now-root">
        <header className="mn-header">
          <h1 className="mn-title">Đang đồng bộ dữ liệu...</h1>
        </header>
      </div>
    );
  }

  // Nếu DB liveMatch đang là '3-team' hoặc teams có 3 đội
  const mode = liveMatch?.mode === '3-team' ? 3 : 2;

  // Render dựa trên trạng thái (nhảy thẳng vào trận không cần chọn)
  return (
    <div className="match-now-root">
      <header className="mn-header">
        <Link href="/" className="mn-back-btn" title="Về trang chủ">
          ← Trang chủ
        </Link>
        <h1 className="mn-title">Trận Đấu {mode} Đội</h1>
      </header>

      {mode === 2 && liveMatch && (
        <TwoTeamMode
          liveMatch={liveMatch}
          events={events}
          updateMatch={updateMatch}
          scoreGoal={scoreGoal}
          addEvent={addEvent}
          clearEvents={clearEvents}
        />
      )}
      {mode === 3 && liveMatch && (
        <ThreeTeamMode
          liveMatch={liveMatch}
          events={events}
          updateMatch={updateMatch}
          scoreGoal={scoreGoal}
          addEvent={addEvent}
          clearEvents={clearEvents}
          onBack={() => {}} 
        />
      )}
    </div>
  );
}

/* ────────────────────────────────
   2-TEAM MODE
   ──────────────────────────────── */
function TwoTeamMode({
  liveMatch,
  events,
  updateMatch,
  scoreGoal,
  addEvent,
  clearEvents
}: {
  liveMatch: LiveMatchState;
  events: MatchEvent[];
  updateMatch: (updates: Partial<LiveMatchState>) => Promise<void>;
  scoreGoal: (color: string, scoreA: number, scoreB: number, t: string) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addEvent: (e: any) => Promise<void>;
  clearEvents: () => Promise<void>;
}) {
  const [localTime, setLocalTime] = useState(liveMatch.time_elapsed || 0);
  const [rippleA, setRippleA] = useState(false);
  const [rippleB, setRippleB] = useState(false);
  const [scoringA, setScoringA] = useState(false);
  const [scoringB, setScoringB] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (liveMatch.status === 'playing') {
      interval = setInterval(() => setLocalTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [liveMatch.status]);

  useEffect(() => {
    if (liveMatch.status !== 'playing') {
      setTimeout(() => setLocalTime(liveMatch.time_elapsed || 0), 0);
    }
  }, [liveMatch.time_elapsed, liveMatch.status]);

  const handleScore = async (side: "A" | "B") => {
    if (liveMatch.status !== 'playing') return;
    
    if (side === "A") {
      if (scoringA) return;
      setScoringA(true);
      setRippleA(true);
      setTimeout(() => setRippleA(false), 500);
      await scoreGoal("white", liveMatch.score_a + 1, liveMatch.score_b, formatTime(localTime));
      setTimeout(() => setScoringA(false), 600);
    } else {
      if (scoringB) return;
      setScoringB(true);
      setRippleB(true);
      setTimeout(() => setRippleB(false), 500);
      await scoreGoal("black", liveMatch.score_a, liveMatch.score_b + 1, formatTime(localTime));
      setTimeout(() => setScoringB(false), 600);
    }
  };

  const togglePlay = async () => {
    if (liveMatch.status === 'playing') {
      await updateMatch({ status: 'waiting', time_elapsed: localTime });
    } else {
      await updateMatch({ status: 'playing' });
    }
  };

  const finishMatch = async () => {
    // Lưu step lịch sử khi kết thúc trận 2 đội
    addEvent({
      event_type: 'end',
      team_color: liveMatch.score_a > liveMatch.score_b ? 'white' : liveMatch.score_b > liveMatch.score_a ? 'black' : 'draw',
      current_score_a: liveMatch.score_a,
      current_score_b: liveMatch.score_b,
      timestamp_minute: `${TEAMS.white.color}|${TEAMS.black.color}`
    });
    await updateMatch({ status: 'finished', time_elapsed: localTime });
  };

  const resetScore = async () => {
    clearEvents(); // Xóa lịch sử trên DB
    await updateMatch({ score_a: 0, score_b: 0, time_elapsed: 0, status: 'waiting' });
  };

  const resetCurrentMatch = async () => {
    if (!confirm('Reset tỉ số trận hiện tại về 0-0?')) return;
    await updateMatch({ score_a: 0, score_b: 0 });
  };

  if (liveMatch.status === 'finished') {
    const goals = events.filter(e => e.event_type === 'goal');
    return (
      <div className="two-team-container" style={{ textAlign: "center" }}>
        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '20px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--text-primary)' }}>{liveMatch.score_a}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>⚪ {TEAMS.white.label}</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-muted)' }}>-</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--text-primary)' }}>{liveMatch.score_b}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>⚫ {TEAMS.black.label}</div>
          </div>
        </div>

        {/* Goal Timeline - Home / Away */}
        <div style={{ maxWidth: 420, margin: '0 auto', background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-primary)', fontWeight: 700, width: '40%' }}>Home</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, width: '20%' }}></th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 700, width: '40%' }}>Away</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((g, idx) => {
                  const isHome = g.team_color === 'white';
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-primary)', fontWeight: isHome ? 700 : 400 }}>
                        {isHome && <span>⚽</span>}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: "'Chiron GoRound TC', monospace" }}>
                        {g.timestamp_minute}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: !isHome ? 700 : 400 }}>
                        {!isHome && <span>⚽</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {goals.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: 24, textAlign: 'center' }}>Không có bàn thắng nào.</div>
            )}
          </div>
        </div>

        <button className="mn-reset-score-btn" onClick={resetScore} style={{ marginTop: 24 }}>
          🔄 Chơi lại từ đầu
        </button>
      </div>
    );
  }

  return (
    <div className="two-team-container">
      {/* Top bar: buttons left, timer right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="mn-play-btn" onClick={togglePlay} style={{ fontSize: 13, padding: '8px 16px' }}>
            {liveMatch.status === 'playing' ? "⏸ Dừng" : "▶ Bắt Đầu"}
          </button>
          <button className="mn-reset-btn" onClick={finishMatch} style={{ background: '#d32f2f', color: 'white', border: 'none', fontSize: 12, padding: '6px 12px' }}>
             Kết thúc
          </button>
          <button className="mn-reset-btn" onClick={resetCurrentMatch} style={{ fontSize: 12, padding: '6px 12px' }}>
            ↩ Reset trận
          </button>
          <button className="mn-reset-btn" onClick={resetScore} style={{ fontSize: 12, padding: '6px 12px' }}>
            🔄
          </button>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Chiron GoRound TC', monospace", letterSpacing: 2 }}>
          {formatTime(localTime)}
        </div>
      </div>

      <div className="two-team-grid">
        <button
          className={`two-team-box two-team-white ${rippleA ? "ripple" : ""}`}
          onClick={() => handleScore("A")}
          disabled={scoringA}
        >
          <span className="two-team-box-score">{liveMatch.score_a}</span>
          <span className="two-team-box-label">⚪ {TEAMS.white.label}</span>
          {scoringA && <span style={{ position: 'absolute', top: 8, right: 12, fontSize: 18, color: '#2e7d32', fontWeight: 900, animation: 'fadeIn 0.3s' }}>✓</span>}
        </button>

        <button
          className={`two-team-box two-team-black ${rippleB ? "ripple" : ""}`}
          onClick={() => handleScore("B")}
          disabled={scoringB}
        >
          <span className="two-team-box-score">{liveMatch.score_b}</span>
          <span className="two-team-box-label">⚫ {TEAMS.black.label}</span>
          {scoringB && <span style={{ position: 'absolute', top: 8, right: 12, fontSize: 18, color: '#4caf50', fontWeight: 900, animation: 'fadeIn 0.3s' }}>✓</span>}
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────
   3-TEAM MODE
   ──────────────────────────────── */
type Phase = "pick" | "playing" | "scoring" | "confirm" | "finished";

function ThreeTeamMode({
  liveMatch,
  events,
  updateMatch,
  addEvent,
  clearEvents
}: {
  onBack: () => void;
  liveMatch: LiveMatchState;
  events: MatchEvent[];
  updateMatch: (updates: Partial<LiveMatchState>) => Promise<void>;
  scoreGoal: (color: string, scoreA: number, scoreB: number, t: string) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addEvent: (e: any) => Promise<void>;
  clearEvents: () => Promise<void>;
}) {
  const [wins, setWins] = useState<Record<TeamColor, number>>({ white: 0, black: 0, orange: 0 });
  const [losses, setLosses] = useState<Record<TeamColor, number>>({ white: 0, black: 0, orange: 0 });
  const [draws, setDraws] = useState<Record<TeamColor, number>>({ white: 0, black: 0, orange: 0 });
  const [points, setPoints] = useState<Record<TeamColor, number>>({ white: 0, black: 0, orange: 0 });

  const initialPhase = (): Phase => {
    if (liveMatch.status === 'finished') return 'finished';
    if (liveMatch.status === 'playing' && liveMatch.team_a_color && liveMatch.team_b_color) return 'playing';
    return 'pick';
  };

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [pickedTeams, setPickedTeams] = useState<TeamColor[]>([]);
  const [teamA, setTeamA] = useState<TeamColor>((liveMatch.team_a_color as TeamColor) || "white");
  const [teamB, setTeamB] = useState<TeamColor>((liveMatch.team_b_color as TeamColor) || "black");
  const [timeLeft, setTimeLeft] = useState(MATCH_DURATION);
  const [running, setRunning] = useState(false);
  const [matchNumber, setMatchNumber] = useState(1);
  const [isFirstMatch, setIsFirstMatch] = useState(true);

  // Manual point offsets (for editing points)
  const [manualOffsets, setManualOffsets] = useState<Record<TeamColor, number>>({ white: 0, black: 0, orange: 0 });
  const [editingTeam, setEditingTeam] = useState<TeamColor | null>(null);
  const [editValue, setEditValue] = useState(0);

  // Score selection
  const [selectedScore, setSelectedScore] = useState<{ a: number; b: number } | null>(null);

  // Next match teams (editable in confirm modal)
  const [nextA, setNextA] = useState<TeamColor>("white");
  const [nextB, setNextB] = useState<TeamColor>("black");

  // Track entry order for draw logic
  const [entryOrder, setEntryOrder] = useState<{ first: TeamColor; second: TeamColor } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ──── Rehydrate stats from events ────
  useEffect(() => {
    const endEvents = events.filter(e => e.event_type === 'end');
    const w: Record<TeamColor, number> = { white: 0, black: 0, orange: 0 };
    const l: Record<TeamColor, number> = { white: 0, black: 0, orange: 0 };
    const d: Record<TeamColor, number> = { white: 0, black: 0, orange: 0 };
    const p: Record<TeamColor, number> = { white: 0, black: 0, orange: 0 };

    for (const ev of endEvents) {
      const parts = (ev.timestamp_minute || '').split('|');
      const tA = parts[0] as TeamColor;
      const tB = parts[1] as TeamColor;
      if (!TEAMS[tA] || !TEAMS[tB]) continue;

      if (ev.team_color === 'draw') {
        d[tA]++; d[tB]++;
        p[tA] += 1; p[tB] += 1;
      } else {
        const winner = ev.team_color as TeamColor;
        const loser = winner === tA ? tB : tA;
        w[winner]++; l[loser]++;
        p[winner] += 3;
      }
    }
    setWins(w); setLosses(l); setDraws(d); setPoints(p);
    setMatchNumber(endEvents.length + 1);
    if (endEvents.length > 0) setIsFirstMatch(false);
  }, [events]);

  // Sync teams from liveMatch realtime
  useEffect(() => {
    if (liveMatch.team_a_color) setTeamA(liveMatch.team_a_color as TeamColor);
    if (liveMatch.team_b_color) setTeamB(liveMatch.team_b_color as TeamColor);
  }, [liveMatch.team_a_color, liveMatch.team_b_color]);

  // Sync phase from liveMatch realtime
  useEffect(() => {
    if (liveMatch.status === 'finished' && phase !== 'finished') {
      setPhase('finished'); setRunning(false);
    } else if (liveMatch.status === 'waiting' && !liveMatch.team_a_color && !liveMatch.team_b_color && phase !== 'pick') {
      setPhase('pick'); setRunning(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMatch.status, liveMatch.team_a_color, liveMatch.team_b_color]);

  // ──── Timer ────
  useEffect(() => {
    if (running && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0 && running) {
      setRunning(false);
      playBellSound();
      setPhase("scoring");
    }
   
  }, [timeLeft, running]);

  const getWaitingTeam = useCallback((): TeamColor => {
    return ALL_COLORS.find(c => c !== teamA && c !== teamB)!;
  }, [teamA, teamB]);

  const getDisplayPoints = (c: TeamColor) => points[c] + (manualOffsets[c] || 0);

  // ──── End current match manually ────
  const handleEndMatch = () => {
    stopBellSound();
    setRunning(false);
    setPhase("scoring");
  };

  // ──── Select score → compute next teams → go to confirm ────
  const handleScoreSelect = (sA: number, sB: number) => {
    setSelectedScore({ a: sA, b: sB });

    let staying: TeamColor;

    if (sA > sB) {
      staying = teamA;
    } else if (sB > sA) {
      staying = teamB;
    } else {
      // DRAW
      if (isFirstMatch) {
        staying = Math.random() < 0.5 ? teamA : teamB;
      } else {
        // Team mới vào (second) được giữ lại
        staying = entryOrder?.second === teamA ? teamA : teamB;
      }
    }

    const waiting = getWaitingTeam();
    setNextA(staying);
    setNextB(waiting);
    setPhase("confirm");
  };

  // ──── Confirm result → save event & setup next ────
  const handleConfirm = () => {
    if (!selectedScore) return;
    const { a: sA, b: sB } = selectedScore;
    const winner = sA > sB ? teamA : sB > sA ? teamB : 'draw';

    addEvent({
      event_type: 'end',
      team_color: winner,
      current_score_a: sA,
      current_score_b: sB,
      timestamp_minute: `${teamA}|${teamB}`
    });

    // Setup next match
    setTeamA(nextA);
    setTeamB(nextB);
    setTimeLeft(MATCH_DURATION);
    setRunning(false);
    setEntryOrder({ first: nextA, second: nextB });
    setMatchNumber(n => n + 1);
    setIsFirstMatch(false);
    updateMatch({ score_a: 0, score_b: 0, team_a_color: nextA, team_b_color: nextB });

    setSelectedScore(null);
    setPhase("playing");
    stopBellSound();
  };

  // ──── Pick phase ────
  const togglePick = (c: TeamColor) => {
    setPickedTeams(prev => {
      if (prev.includes(c)) return prev.filter(x => x !== c);
      if (prev.length >= 2) return prev;
      return [...prev, c];
    });
  };

  const startFirstMatch = () => {
    if (pickedTeams.length !== 2) return;
    setTeamA(pickedTeams[0]);
    setTeamB(pickedTeams[1]);
    setTimeLeft(MATCH_DURATION);
    setRunning(false);
    setEntryOrder(null);
    setIsFirstMatch(true);
    setMatchNumber(1);
    setPhase("playing");
    updateMatch({ status: 'playing', score_a: 0, score_b: 0, team_a_color: pickedTeams[0], team_b_color: pickedTeams[1] });
  };

  const resetAll = () => {
    stopBellSound();
    clearEvents();
    setPhase("pick");
    setPickedTeams([]);
    setWins({ white: 0, black: 0, orange: 0 });
    setLosses({ white: 0, black: 0, orange: 0 });
    setDraws({ white: 0, black: 0, orange: 0 });
    setPoints({ white: 0, black: 0, orange: 0 });
    setManualOffsets({ white: 0, black: 0, orange: 0 });
    setMatchNumber(1);
    setIsFirstMatch(true);
    setTimeLeft(MATCH_DURATION);
    setRunning(false);
    setEntryOrder(null);
    updateMatch({ score_a: 0, score_b: 0, status: 'waiting', team_a_color: null, team_b_color: null, time_elapsed: 0 });
  };

  // ──── Stats bar (reusable) ────
  const StatsBar = () => (
    <div className="mn-stats-bar" style={{ marginBottom: 8, marginTop: 12 }}>
      {ALL_COLORS.map(c => (
        <div key={c} className="mn-stat-chip" style={{ borderColor: TEAMS[c].bg === "#f5f5f5" ? "#ccc" : TEAMS[c].bg }}>
          <span>{TEAMS[c].emoji}</span>
          <span className="mn-stat-name">{TEAMS[c].label}</span>
          <span
            style={{ color: 'var(--text-primary)', fontWeight: 'bold', cursor: 'pointer', borderBottom: '1px dashed currentColor' }}
            onClick={() => { setEditingTeam(c); setEditValue(getDisplayPoints(c)); }}
          >
            {getDisplayPoints(c)}đ
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>| {wins[c]}W-{losses[c]}L-{draws[c]}D</span>
        </div>
      ))}
    </div>
  );

  // ──── Edit points modal ────
  const EditPointsModal = () => {
    if (!editingTeam) return null;
    return (
      <div className="mn-result-overlay" onClick={() => setEditingTeam(null)}>
        <div className="mn-result-card" onClick={e => e.stopPropagation()} style={{ padding: '28px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{TEAMS[editingTeam].emoji}</div>
          <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Sửa điểm {TEAMS[editingTeam].label}</h3>
          <input
            type="number"
            value={editValue}
            onChange={e => setEditValue(parseInt(e.target.value) || 0)}
            autoFocus
            style={{ fontSize: 32, padding: '12px 16px', textAlign: 'center', width: 100, borderRadius: 12, border: '2px solid var(--border-subtle)', marginBottom: 24, outline: 'none', fontWeight: 700 }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setEditingTeam(null)} className="mn-reset-btn" style={{ flex: 1, padding: '12px 24px', fontSize: 14, borderRadius: 12 }}>Huỷ</button>
            <button
              onClick={() => {
                setManualOffsets(prev => ({ ...prev, [editingTeam!]: editValue - points[editingTeam!] }));
                setEditingTeam(null);
              }}
              className="mn-start-btn"
              style={{ flex: 1, padding: '12px 24px', fontSize: 14, borderRadius: 12, margin: 0 }}
            >
              ✅ Lưu
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ── Render: Pick Phase ── */
  if (phase === "pick") {
    return (
      <div className="three-team-container">
        <EditPointsModal />
        <StatsBar />

        <div className="mn-pick-title">
          🏟️ Chọn 2 đội đá trận {matchNumber > 1 ? `#${matchNumber}` : "đầu tiên"}
        </div>

        <div className="mn-pick-grid">
          {ALL_COLORS.map(c => (
            <button
              key={c}
              className={`mn-pick-card ${pickedTeams.includes(c) ? "picked" : ""}`}
              style={{
                background: TEAMS[c].bg,
                color: TEAMS[c].textColor,
                borderColor: pickedTeams.includes(c) ? "#ffd700" : TEAMS[c].borderColor,
              }}
              onClick={() => togglePick(c)}
            >
              <span className="mn-pick-emoji">{TEAMS[c].emoji}</span>
              <span className="mn-pick-name">{TEAMS[c].label}</span>
              {pickedTeams.includes(c) && <span className="mn-pick-check">✓</span>}
            </button>
          ))}
        </div>

        <button className="mn-start-btn" disabled={pickedTeams.length !== 2} onClick={startFirstMatch}>
          ⚽ Bắt đầu trận đấu
        </button>
      </div>
    );
  }

  /* ── Render: Scoring Phase ── */
  if (phase === "scoring") {
    const SCORES: [number, number][] = [[0,0],[1,0],[1,1],[2,0],[2,1],[1,2],[0,1],[0,2]];
    return (
      <div className="three-team-container">
        <EditPointsModal />
        <StatsBar />

        <div className="mn-result-overlay">
          <div className="mn-result-card" style={{ padding: '28px 24px' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
              Chọn tỉ số trận #{matchNumber}
            </h2>
            <p style={{ margin: '0 0 20px 0', fontSize: 14, color: 'var(--text-muted)' }}>
              {TEAMS[teamA].emoji} {TEAMS[teamA].label} vs {TEAMS[teamB].emoji} {TEAMS[teamB].label}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {SCORES.map(([sA, sB]) => (
                <button
                  key={`${sA}-${sB}`}
                  className="mn-score-btn"
                  onClick={() => handleScoreSelect(sA, sB)}
                >
                  {sA} - {sB}
                </button>
              ))}
            </div>

            <button className="mn-reset-btn" onClick={() => setPhase("playing")} style={{ marginTop: 16, width: '100%', padding: '12px', borderRadius: 12, fontSize: 14 }}>
              ← Quay lại trận đấu
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render: Confirm Phase ── */
  if (phase === "confirm" && selectedScore) {
    const { a: sA, b: sB } = selectedScore;
    const isDraw = sA === sB;
    const resultText = isDraw
      ? "Hoà"
      : sA > sB
        ? `${TEAMS[teamA].emoji} ${TEAMS[teamA].label} Thắng`
        : `${TEAMS[teamB].emoji} ${TEAMS[teamB].label} Thắng`;

    return (
      <div className="three-team-container">
        <EditPointsModal />

        <div className="mn-result-overlay">
          <div className="mn-result-card" onClick={e => e.stopPropagation()} style={{ padding: '28px 24px' }}>
            <h2 style={{ marginTop: 0, marginBottom: 20, textAlign: 'center', fontSize: 17, fontWeight: 800 }}>Xác nhận kết quả</h2>

            {/* Score display */}
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: isDraw ? 'linear-gradient(135deg, #f5f5f5, #eeeeee)' : sA > sB ? `linear-gradient(135deg, ${TEAMS[teamA].bg}15, ${TEAMS[teamA].bg}08)` : `linear-gradient(135deg, ${TEAMS[teamB].bg}08, ${TEAMS[teamB].bg}15)`, padding: '20px 16px', borderRadius: 16, marginBottom: 12, border: '1px solid var(--border-subtle)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32 }}>{TEAMS[teamA].emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{TEAMS[teamA].label}</div>
              </div>
              <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 6, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {sA} - {sB}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32 }}>{TEAMS[teamB].emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{TEAMS[teamB].label}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 800, color: isDraw ? '#f57c00' : '#2e7d32', marginBottom: 20, padding: '6px 16px', borderRadius: 20, background: isDraw ? 'rgba(245,124,0,0.08)' : 'rgba(46,125,50,0.08)', display: 'inline-block' }}>
              {isDraw ? '🤝 ' : '🏆 '}{resultText}
            </div>

            {/* Next match editor */}
            <div style={{ background: 'rgba(0,0,0,0.03)', padding: '14px 16px', borderRadius: 14, marginBottom: 24, border: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Trận tiếp theo #{matchNumber + 1}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select
                  value={nextA}
                  onChange={e => setNextA(e.target.value as TeamColor)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', fontSize: 14, background: 'white', fontWeight: 600 }}
                >
                  {ALL_COLORS.map(c => <option key={c} value={c}>{TEAMS[c].emoji} {TEAMS[c].label}</option>)}
                </select>
                <span style={{ fontWeight: 800, color: '#bbb', fontSize: 12 }}>VS</span>
                <select
                  value={nextB}
                  onChange={e => setNextB(e.target.value as TeamColor)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', fontSize: 14, background: 'white', fontWeight: 600 }}
                >
                  {ALL_COLORS.map(c => <option key={c} value={c}>{TEAMS[c].emoji} {TEAMS[c].label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setSelectedScore(null); setPhase("scoring"); }} className="mn-reset-btn" style={{ flex: 1, padding: '14px', borderRadius: 12, fontSize: 14 }}>
                Quay lại
              </button>
              <button onClick={handleConfirm} className="mn-start-btn" style={{ flex: 1, padding: '14px', borderRadius: 12, fontSize: 14, margin: 0 }}>
                ✅ Xác nhận
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render: Finished Phase ── */
  if (phase === "finished") {
    return (
      <div className="three-team-container" style={{ textAlign: "center" }}>
        <EditPointsModal />
        <StatsBar />

        <div style={{ marginTop: 20, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto', background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          <div style={{ maxHeight: '66vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Trận</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Tỉ số</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {events.filter(e => e.event_type === 'end').map((ev, i) => {
                  const parts = (ev.timestamp_minute || '').split('|');
                  const tA = parts[0] as TeamColor;
                  const tB = parts[1] as TeamColor;
                  const isDraw = ev.team_color === 'draw';
                  const winnerLabel = isDraw ? 'Hoà' : `${TEAMS[ev.team_color as TeamColor]?.label} Thắng`;
                  const matchLabel = (TEAMS[tA] && TEAMS[tB])
                    ? `${TEAMS[tA].label} - ${TEAMS[tB].label}`
                    : '---';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>#{i + 1}:</span> {matchLabel}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {ev.current_score_a} - {ev.current_score_b}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: isDraw ? 'var(--text-muted)' : '#2e7d32' }}>
                        {!isDraw && TEAMS[ev.team_color as TeamColor]?.emoji} {winnerLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {events.filter(e => e.event_type === 'end').length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: 16, textAlign: 'center' }}>Chưa có trận đấu nào.</div>
            )}
          </div>
        </div>

        <button className="mn-reset-score-btn" onClick={resetAll} style={{ marginTop: 24 }}>
          🔄 Chơi lại từ đầu
        </button>
      </div>
    );
  }

  /* ── Render: Playing Phase ── */
  const waiting = getWaitingTeam();
  const timerPercent = (timeLeft / MATCH_DURATION) * 100;
  const isUrgent = timeLeft <= 60;

  return (
    <div className="three-team-container">
      <EditPointsModal />

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', flexWrap: 'wrap' }}>
        <button className="mn-reset-btn" onClick={() => { stopBellSound(); setRunning(false); updateMatch({ status: 'waiting' }); setPhase("pick"); }}>
          ← Quay lại
        </button>
        <button className="mn-reset-btn" onClick={handleEndMatch} style={{ background: '#d32f2f', color: '#fff', border: 'none' }}>
          ⏹ Kết thúc trận
        </button>
        <button className="mn-reset-btn" onClick={() => {
          stopBellSound(); setRunning(false);
          if (timeLeft < MATCH_DURATION) {
            addEvent({ event_type: 'end', team_color: 'draw', current_score_a: 0, current_score_b: 0, timestamp_minute: `${teamA}|${teamB}` });
          }
          updateMatch({ status: 'finished' }); setPhase("finished");
        }} style={{ background: 'rgba(255,152,0,0.15)', color: '#e65100', border: '1px solid rgba(255,152,0,0.3)' }}>
          🏁 Kết thúc giải
        </button>
      </div>

      <StatsBar />

      {/* Match info */}
      <div className="mn-match-info" style={{ marginBottom: '8px' }}>
        <span>Trận #{matchNumber}</span>
        <span className="mn-waiting-badge">
          {TEAMS[waiting].emoji} {TEAMS[waiting].label} đang chờ
        </span>
      </div>

      {/* Timer bar */}
      <div className="mn-timer-bar" style={{ marginBottom: '16px' }}>
        <div className="mn-timer-fill" style={{ width: `${timerPercent}%` }} />
      </div>

      {/* Main grid: Team A | Timer + Controls | Team B */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gap: '12px', flex: 1, minHeight: 0 }}>
        {/* Team A */}
        <div
          className="two-team-box"
          style={{ background: TEAMS[teamA].bg, color: TEAMS[teamA].textColor, borderColor: TEAMS[teamA].borderColor, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}
        >
          <span className="two-team-box-label" style={{ textAlign: 'center', lineHeight: 1.4 }}>
            <span style={{ fontSize: 36 }}>{TEAMS[teamA].emoji}</span><br/>
            {TEAMS[teamA].label}
          </span>
        </div>

        {/* Center: Timer + Play */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '0 8px' }}>
          <span className={`mn-timer-text ${isUrgent ? "urgent" : ""}`} style={{ fontSize: 'min(40px, 8vw)', padding: 0 }}>
            {formatTime(timeLeft)}
          </span>
          <button
            className="mn-play-round-btn"
            onClick={() => { const next = !running; setRunning(next); updateMatch({ status: next ? 'playing' : 'waiting' }); }}
            style={{
              background: running ? 'linear-gradient(135deg, #c62828, #e53935)' : 'linear-gradient(135deg, #2e7d32, #4caf50)',
              boxShadow: running ? '0 4px 12px rgba(229, 57, 53, 0.4)' : '0 4px 12px rgba(76, 175, 80, 0.4)'
            }}
          >
            {running ? "⏸ Tạm dừng" : "▶ Bắt đầu"}
          </button>
        </div>

        {/* Team B */}
        <div
          className="two-team-box"
          style={{ background: TEAMS[teamB].bg, color: TEAMS[teamB].textColor, borderColor: TEAMS[teamB].borderColor, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}
        >
          <span className="two-team-box-label" style={{ textAlign: 'center', lineHeight: 1.4 }}>
            <span style={{ fontSize: 36 }}>{TEAMS[teamB].emoji}</span><br/>
            {TEAMS[teamB].label}
          </span>
        </div>
      </div>
    </div>
  );
}


