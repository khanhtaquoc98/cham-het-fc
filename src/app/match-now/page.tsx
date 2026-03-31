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
type TeamColor = "white" | "black" | "red";

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
  red: {
    color: "red",
    label: "Cam",
    bg: "#ef6c00",
    textColor: "#ffffff",
    borderColor: "#e65100",
    glowColor: "rgba(239,108,0,0.5)",
    emoji: "🟠",
  },
};

const ALL_COLORS: TeamColor[] = ["white", "black", "red"];
const MATCH_DURATION = 7 * 60; // 7 minutes in seconds
const WIN_GOALS = 2;

/* ───────── helpers ───────── */
function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ────────────────────────────────
   MAIN PAGE
   ──────────────────────────────── */
export default function MatchNowPage() {
  const [mode, setMode] = useState<2 | 3 | null>(null);

  return (
    <div className="match-now-root">
      {/* Header */}
      <header className="mn-header">
        <Link href="/" className="mn-back-btn" title="Về trang chủ">
          ← Trang chủ
        </Link>
        <h1 className="mn-title">Trận Đấu</h1>
        <p className="mn-subtitle">Chọn số đội để bắt đầu</p>
      </header>

      {!mode && (
        <div className="mn-mode-select">
          <button className="mn-mode-btn" onClick={() => setMode(2)}>
            <span className="mn-mode-icon">⚔️</span>
            <span className="mn-mode-label">2 Đội</span>
            <span className="mn-mode-desc">Trắng vs Đen</span>
          </button>
          <button className="mn-mode-btn" onClick={() => setMode(3)}>
            <span className="mn-mode-icon">🔥</span>
            <span className="mn-mode-label">3 Đội</span>
            <span className="mn-mode-desc">Trắng / Đen / Cam</span>
          </button>
        </div>
      )}

      {mode === 2 && <TwoTeamMode onBack={() => setMode(null)} />}
      {mode === 3 && <ThreeTeamMode onBack={() => setMode(null)} />}
    </div>
  );
}

/* ────────────────────────────────
   2-TEAM MODE
   ──────────────────────────────── */
function TwoTeamMode({ onBack }: { onBack: () => void }) {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [rippleA, setRippleA] = useState(false);
  const [rippleB, setRippleB] = useState(false);

  const handleScore = (team: "A" | "B") => {
    if (team === "A") {
      setScoreA((p) => p + 1);
      setRippleA(true);
      setTimeout(() => setRippleA(false), 500);
    } else {
      setScoreB((p) => p + 1);
      setRippleB(true);
      setTimeout(() => setRippleB(false), 500);
    }
  };

  return (
    <div className="two-team-container">
      <button className="mn-reset-btn" onClick={onBack}>
        ← Chọn lại
      </button>

      <div className="two-team-grid">
        <button
          className={`two-team-box two-team-white ${rippleA ? "ripple" : ""}`}
          onClick={() => handleScore("A")}
        >
          <span className="two-team-box-score">{scoreA}</span>
          <span className="two-team-box-label">⚪ {TEAMS.white.label}</span>
          <span className="two-team-tap-hint">Chạm để ghi bàn</span>
        </button>

        <button
          className={`two-team-box two-team-black ${rippleB ? "ripple" : ""}`}
          onClick={() => handleScore("B")}
        >
          <span className="two-team-box-score">{scoreB}</span>
          <span className="two-team-box-label">⚫ {TEAMS.black.label}</span>
          <span className="two-team-tap-hint">Chạm để ghi bàn</span>
        </button>
      </div>

      <button
        className="mn-reset-score-btn"
        onClick={() => {
          setScoreA(0);
          setScoreB(0);
        }}
      >
        🔄 Reset tỉ số
      </button>
    </div>
  );
}

/* ────────────────────────────────
   3-TEAM MODE
   ──────────────────────────────── */
type Phase = "pick" | "playing" | "result";

interface MatchRecord {
  team1: TeamColor;
  team2: TeamColor;
  score1: number;
  score2: number;
  winner: TeamColor | "draw";
  matchNumber: number;
}

function ThreeTeamMode({ onBack }: { onBack: () => void }) {
  const [wins, setWins] = useState<Record<TeamColor, number>>({
    white: 0,
    black: 0,
    red: 0,
  });
  const [losses, setLosses] = useState<Record<TeamColor, number>>({
    white: 0,
    black: 0,
    red: 0,
  });

  const [phase, setPhase] = useState<Phase>("pick");

  // Picking
  const [pickedTeams, setPickedTeams] = useState<TeamColor[]>([]);

  // Playing
  const [teamA, setTeamA] = useState<TeamColor>("white");
  const [teamB, setTeamB] = useState<TeamColor>("black");
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MATCH_DURATION);
  const [running, setRunning] = useState(false);
  const [rippleA, setRippleA] = useState(false);
  const [rippleB, setRippleB] = useState(false);

  // Track entry order: the team that entered later (replacement) stays on draw
  // "first" = was already on field; "second" = just entered
  const [entryOrder, setEntryOrder] = useState<{
    first: TeamColor;
    second: TeamColor;
  } | null>(null);

  const [matchNumber, setMatchNumber] = useState(1);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [isFirstMatch, setIsFirstMatch] = useState(true);

  // Result overlay
  const [resultMsg, setResultMsg] = useState("");
  const [resultEmoji, setResultEmoji] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Timer */
  useEffect(() => {
    if (running && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, timeLeft]);

  /* Time up detection */
  useEffect(() => {
    if (timeLeft <= 0 && running) {
      setRunning(false);
      handleTimeUp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, running]);

  const getWaitingTeam = useCallback((): TeamColor => {
    return ALL_COLORS.find((c) => c !== teamA && c !== teamB)!;
  }, [teamA, teamB]);

  /* Handle scoring */
  const handleGoal = (side: "A" | "B") => {
    if (!running) return;

    if (side === "A") {
      const newScore = scoreA + 1;
      setScoreA(newScore);
      setRippleA(true);
      setTimeout(() => setRippleA(false), 500);

      if (newScore >= WIN_GOALS) {
        setRunning(false);
        finishMatch(teamA, teamB, newScore, scoreB);
      }
    } else {
      const newScore = scoreB + 1;
      setScoreB(newScore);
      setRippleB(true);
      setTimeout(() => setRippleB(false), 500);

      if (newScore >= WIN_GOALS) {
        setRunning(false);
        finishMatch(teamA, teamB, scoreA, newScore);
      }
    }
  };

  /* Time up logic */
  const handleTimeUp = () => {
    playBellSound();
    
    if (scoreA === scoreB) {
      // Draw
      if (isFirstMatch) {
        // First match draw → random team exits, not counted as loss
        const randomSide = Math.random() < 0.5 ? "A" : "B";
        const stayTeam = randomSide === "A" ? teamB : teamA;
        const leaveTeam = randomSide === "A" ? teamA : teamB;
        const waiting = getWaitingTeam();

        addMatchRecord(teamA, teamB, scoreA, scoreB, "draw");

        setResultEmoji("🎲");
        setResultMsg(
          `Hoà ${scoreA}-${scoreB}!\n Trận đầu tiên → Random: ${TEAMS[leaveTeam].emoji} ${TEAMS[leaveTeam].label} ra. ${TEAMS[waiting].emoji} ${TEAMS[waiting].label} vào thay.`
        );
        setPhase("result");

        // Next match: stayTeam vs waiting
        setTimeout(() => {
          setupNextMatch(stayTeam, waiting, stayTeam);
        }, 100);
      } else {
        // Not first match → team that entered earlier (first) loses
        const first = entryOrder?.first;
        const second = entryOrder?.second;
        if (first && second) {
          const waiting = getWaitingTeam();

          // first team loses
          setLosses((prev) => ({ ...prev, [first]: prev[first] + 1 }));
          setWins((prev) => ({ ...prev, [second]: prev[second] + 1 }));
          addMatchRecord(teamA, teamB, scoreA, scoreB, second);

          setResultEmoji("⏱️");
          setResultMsg(
            `Hết giờ! Hoà ${scoreA}-${scoreB}.\n ${TEAMS[first].emoji} ${TEAMS[first].label} vào trước → thua. ${TEAMS[waiting].emoji} ${TEAMS[waiting].label} vào thay.`
          );
          setPhase("result");

          setTimeout(() => {
            setupNextMatch(second, waiting, second);
          }, 100);
        }
      }
    } else {
      // Someone won on time
      const winner = scoreA > scoreB ? teamA : teamB;
      const loser = scoreA > scoreB ? teamB : teamA;
      const waiting = getWaitingTeam();

      setWins((prev) => ({ ...prev, [winner]: prev[winner] + 1 }));
      setLosses((prev) => ({ ...prev, [loser]: prev[loser] + 1 }));
      addMatchRecord(
        teamA,
        teamB,
        scoreA,
        scoreB,
        winner
      );

      setResultEmoji("🏆");
      setResultMsg(
        `Hết giờ! ${TEAMS[winner].emoji} ${TEAMS[winner].label} thắng ${scoreA > scoreB ? scoreA : scoreB}-${scoreA > scoreB ? scoreB : scoreA}.\n ${TEAMS[waiting].emoji} ${TEAMS[waiting].label} vào thay ${TEAMS[loser].emoji} ${TEAMS[loser].label}.`
      );
      setPhase("result");

      setTimeout(() => {
        setupNextMatch(winner, waiting, winner);
      }, 100);
    }
  };

  /* Finish match when someone scores 2 goals */
  const finishMatch = (
    tA: TeamColor,
    tB: TeamColor,
    sA: number,
    sB: number
  ) => {
    const winner = sA >= WIN_GOALS ? tA : tB;
    const loser = sA >= WIN_GOALS ? tB : tA;
    const waiting = getWaitingTeam();

    setWins((prev) => ({ ...prev, [winner]: prev[winner] + 1 }));
    setLosses((prev) => ({ ...prev, [loser]: prev[loser] + 1 }));
    addMatchRecord(tA, tB, sA, sB, winner);

    setResultEmoji("⚽");
    setResultMsg(
      `${TEAMS[winner].emoji} ${TEAMS[winner].label} ghi ${WIN_GOALS} bàn trước!\n Thắng ${sA >= WIN_GOALS ? sA : sB}-${sA >= WIN_GOALS ? sB : sA}. ${TEAMS[waiting].emoji} ${TEAMS[waiting].label} vào thay ${TEAMS[loser].emoji} ${TEAMS[loser].label}.`
    );
    setPhase("result");

    setTimeout(() => {
      setupNextMatch(winner, waiting, winner);
    }, 100);
  };

  const addMatchRecord = (
    t1: TeamColor,
    t2: TeamColor,
    s1: number,
    s2: number,
    winner: TeamColor | "draw"
  ) => {
    setMatchHistory((prev) => [
      ...prev,
      { team1: t1, team2: t2, score1: s1, score2: s2, winner, matchNumber },
    ]);
  };

  const setupNextMatch = (
    staying: TeamColor,
    incoming: TeamColor,
    firstTeam: TeamColor
  ) => {
    setTeamA(staying);
    setTeamB(incoming);
    setScoreA(0);
    setScoreB(0);
    setTimeLeft(MATCH_DURATION);
    setRunning(false);
    setEntryOrder({ first: firstTeam, second: incoming });
    setMatchNumber((n) => n + 1);
    setIsFirstMatch(false);
  };

  /* Handle picking teams */
  const togglePick = (c: TeamColor) => {
    setPickedTeams((prev) => {
      if (prev.includes(c)) return prev.filter((x) => x !== c);
      if (prev.length >= 2) return prev;
      return [...prev, c];
    });
  };

  const startFirstMatch = () => {
    if (pickedTeams.length !== 2) return;
    setTeamA(pickedTeams[0]);
    setTeamB(pickedTeams[1]);
    setScoreA(0);
    setScoreB(0);
    setTimeLeft(MATCH_DURATION);
    setRunning(false);
    setEntryOrder(null);
    setIsFirstMatch(true);
    setMatchNumber(1);
    setPhase("playing");
  };

  const continueToNextMatch = () => {
    stopBellSound();
    setPhase("playing");
  };

  const resetAll = () => {
    stopBellSound();
    setPhase("pick");
    setPickedTeams([]);
    setWins({ white: 0, black: 0, red: 0 });
    setLosses({ white: 0, black: 0, red: 0 });
    setMatchHistory([]);
    setMatchNumber(1);
    setIsFirstMatch(true);
    setScoreA(0);
    setScoreB(0);
    setTimeLeft(MATCH_DURATION);
    setRunning(false);
    setEntryOrder(null);
  };

  /* ── Render: Pick Phase ── */
  if (phase === "pick") {
    return (
      <div className="three-team-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', flexWrap: 'wrap', gap: 8 }}>
          <button className="mn-reset-btn" onClick={() => { stopBellSound(); onBack(); }}>
            ← Chọn lại
          </button>
          <div className="mn-stats-bar">
            {ALL_COLORS.map((c) => (
              <div key={c} className="mn-stat-chip" style={{ borderColor: TEAMS[c].bg === "#f5f5f5" ? "#ccc" : TEAMS[c].bg }}>
                <span>{TEAMS[c].emoji}</span>
                <span className="mn-stat-name">{TEAMS[c].label}</span>
                <span className="mn-stat-wins">🏆{wins[c]}</span>
                <span className="mn-stat-losses">❌{losses[c]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mn-pick-title">
          🏟️ Chọn 2 đội đá trận {matchNumber > 1 ? `#${matchNumber}` : "đầu tiên"}
        </div>

        <div className="mn-pick-grid">
          {ALL_COLORS.map((c) => (
            <button
              key={c}
              className={`mn-pick-card ${pickedTeams.includes(c) ? "picked" : ""}`}
              style={{
                background: TEAMS[c].bg,
                color: TEAMS[c].textColor,
                borderColor: pickedTeams.includes(c)
                  ? "#ffd700"
                  : TEAMS[c].borderColor,
              }}
              onClick={() => togglePick(c)}
            >
              <span className="mn-pick-emoji">{TEAMS[c].emoji}</span>
              <span className="mn-pick-name">{TEAMS[c].label}</span>
              {pickedTeams.includes(c) && (
                <span className="mn-pick-check">✓</span>
              )}
            </button>
          ))}
        </div>

        <button
          className="mn-start-btn"
          disabled={pickedTeams.length !== 2}
          onClick={startFirstMatch}
        >
          ⚽ Bắt đầu trận đấu
        </button>


      </div>
    );
  }

  /* ── Render: Result Phase ── */
  if (phase === "result") {
    return (
      <div className="three-team-container">
        <div className="mn-result-overlay">
          <div className="mn-result-card">
            <span className="mn-result-emoji">{resultEmoji}</span>
            <p className="mn-result-msg">{resultMsg}</p>

            <div className="mn-stats-bar" style={{ marginTop: 20 }}>
              {ALL_COLORS.map((c) => (
                <div key={c} className="mn-stat-chip" style={{ borderColor: TEAMS[c].bg === "#f5f5f5" ? "#ccc" : TEAMS[c].bg }}>
                  <span>{TEAMS[c].emoji}</span>
                  <span className="mn-stat-name">{TEAMS[c].label}</span>
                  <span className="mn-stat-wins">🏆 {wins[c]}</span>
                  <span className="mn-stat-losses">❌ {losses[c]}</span>
                </div>
              ))}
            </div>

            <button className="mn-start-btn" onClick={continueToNextMatch}>
              ▶ Trận tiếp theo #{matchNumber}
            </button>

            <button
              className="mn-reset-btn"
              style={{ marginTop: 10 }}
              onClick={resetAll}
            >
              🔄 Reset tất cả
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render: Playing Phase ── */
  const waiting = getWaitingTeam();
  const timerPercent = (timeLeft / MATCH_DURATION) * 100;
  const isUrgent = timeLeft <= 60;

  return (
    <div className="three-team-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', flexWrap: 'wrap' }}>
        <button className="mn-reset-btn" onClick={() => { stopBellSound(); setRunning(false); setPhase("pick"); }}>
          ← Quay lại
        </button>
        <div className="mn-stats-bar">
          {ALL_COLORS.map((c) => (
            <div key={c} className="mn-stat-chip" style={{ borderColor: TEAMS[c].bg === "#f5f5f5" ? "#ccc" : TEAMS[c].bg }}>
              <span>{TEAMS[c].emoji}</span>
              <span className="mn-stat-name">{TEAMS[c].label}</span>
              <span className="mn-stat-wins">🏆{wins[c]}</span>
              <span className="mn-stat-losses">❌{losses[c]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Match info and Progress */}
      <div className="mn-match-info" style={{ marginBottom: '8px' }}>
        <span>Trận #{matchNumber}</span>
        <span className="mn-waiting-badge">
          {TEAMS[waiting].emoji} {TEAMS[waiting].label} đang chờ
        </span>
      </div>
      <div className="mn-timer-bar" style={{ marginBottom: '16px' }}>
        <div
          className="mn-timer-fill"
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Main Grid: 3 Parts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gap: '12px', flex: 1, minHeight: 0 }}>
        
        {/* Team A */}
        <button
          className={`two-team-box ${rippleA ? "ripple" : ""}`}
          style={{
            background: TEAMS[teamA].bg,
            color: TEAMS[teamA].textColor,
            borderColor: TEAMS[teamA].borderColor,
            height: '100%'
          }}
          onClick={() => handleGoal("A")}
          disabled={!running}
        >
          <span className="two-team-box-score">{scoreA}</span>
          <span className="two-team-box-label">
            {TEAMS[teamA].emoji} {TEAMS[teamA].label}
          </span>
          <span className="two-team-tap-hint">
            {running ? "Chạm để ghi bàn" : "Nhấn Play để bắt đầu"}
          </span>
        </button>

        {/* Middle Column: Timer + Play btn */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '0 8px' }}>
          <span className={`mn-timer-text ${isUrgent ? "urgent" : ""}`} style={{ fontSize: 'min(40px, 8vw)', padding: 0 }}>
            {formatTime(timeLeft)}
          </span>
          <button
            className="mn-play-round-btn"
            onClick={() => setRunning(!running)}
            style={{
               background: running ? 'linear-gradient(135deg, #c62828, #e53935)' : 'linear-gradient(135deg, #2e7d32, #4caf50)',
               boxShadow: running ? '0 4px 12px rgba(229, 57, 53, 0.4)' : '0 4px 12px rgba(76, 175, 80, 0.4)'
            }}
          >
            {running ? "⏸ Tạm dừng" : "▶ Bắt đầu"}
          </button>
        </div>

        {/* Team B */}
        <button
          className={`two-team-box ${rippleB ? "ripple" : ""}`}
          style={{
            background: TEAMS[teamB].bg,
            color: TEAMS[teamB].textColor,
            borderColor: TEAMS[teamB].borderColor,
            height: '100%'
          }}
          onClick={() => handleGoal("B")}
          disabled={!running}
        >
          <span className="two-team-box-score">{scoreB}</span>
          <span className="two-team-box-label">
            {TEAMS[teamB].emoji} {TEAMS[teamB].label}
          </span>
          <span className="two-team-tap-hint">
            {running ? "Chạm để ghi bàn" : "Nhấn Play để bắt đầu"}
          </span>
        </button>

      </div>
    </div>
  );
}
