'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { LoginModal } from '@/components/TacticalBoard/LoginModal';
import { ControlPanel } from '@/components/TacticalBoard/ControlPanel';
import { TacticalPitch } from '@/components/TacticalBoard/TacticalPitch';
import { LiveChat, ChatMessage } from '@/components/TacticalBoard/LiveChat';
import { TacticsList } from '@/components/TacticalBoard/TacticsList';
import { TacticCreator } from '@/components/TacticalBoard/TacticCreator';
import { TacticPlayerModal } from '@/components/TacticalBoard/TacticPlayerModal';
import { TacticalBoardState, PitchType, UserRole, TacticalArrow, SavedTactic } from '@/components/TacticalBoard/types';
import { generateDefaultPlayers, FORMATION_PRESETS } from '@/components/TacticalBoard/formations';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, LayoutGrid, ShieldAlert, LogOut, Radio, List, Plus, Shield, Eye } from 'lucide-react';

const LOCAL_ROLE_KEY = 'chamhet_tactical_role';

const INITIAL_BOARD_STATE: TacticalBoardState = {
  pitchType: 5,
  teamAColor: '#ef4444', // Red (Trắng/Đen/Đỏ)
  teamBColor: '#ffffff', // White
  gkColor: '#f59e0b',    // Yellow/Gold
  teamAName: 'Đội Đỏ (Team A)',
  teamBName: 'Đội Trắng (Team B)',
  formationA: '1-2-1',
  formationB: '1-2-1',
  players: generateDefaultPlayers(5, '1-2-1', '1-2-1'),
  ball: { x: 50, y: 50 },
  arrows: [],
  arrowColor: '#ef4444',
};

export default function TacticalBoardPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isDisabledByAdmin, setIsDisabledByAdmin] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // View Mode: 'live' = Option 1 (Live realtime board), 'list' = Option 2 (Tactics List), 'create' = Tactic Creator
  const [viewMode, setViewMode] = useState<'live' | 'list' | 'create'>('live');
  const [editingTactic, setEditingTactic] = useState<SavedTactic | null>(null);
  const [sharedTactic, setSharedTactic] = useState<SavedTactic | null>(null);

  // Check for shared tactic link query param ?tacticId=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const sharedId = searchParams.get('tacticId');

    if (sharedId) {
      fetch('/api/tactical-board/tactics', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.tactics)) {
            const found = data.tactics.find((t: SavedTactic) => t.id === sharedId);
            if (found) {
              setSharedTactic(found);
              toast.success(`Đang mở chiến thuật được chia sẻ: "${found.name}" 🔗`, { duration: 4000 });
            } else {
              toast.error('Chiến thuật được chia sẻ không tồn tại hoặc đã bị xóa.');
            }
          }
        })
        .catch((err) => console.error('Error loading shared tactic:', err));
    }
  }, []);

  // Board State
  const [boardState, setBoardState] = useState<TacticalBoardState>(INITIAL_BOARD_STATE);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Live Chat State (max 40 messages in-memory, resets on reload)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Client ID to ignore self broadcasts
  const clientIdRef = useRef<string>(`client_${Math.random().toString(36).substring(2, 9)}`);
  const channelRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle Send Chat Message (Max 40 messages preserved in session)
  const handleSendMessage = useCallback((text: string, senderName: string) => {
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderRole: role || 'player',
      senderName: role === 'hlv' ? 'HLV' : senderName.replace(/\s+/g, '').slice(0, 10),
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev.slice(-39), newMsg]);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat_sync',
        payload: {
          senderId: clientIdRef.current,
          message: newMsg,
        },
      });
    }
  }, [role]);

  // Check config and saved session on mount
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch('/api/tactical-board/config', { cache: 'no-store' });
        const data = await res.json();
        if (data.enabled === false) {
          setIsDisabledByAdmin(true);
        }

        // Restore role if saved in localStorage
        const savedRole = localStorage.getItem(LOCAL_ROLE_KEY) as UserRole | null;
        if (savedRole === 'hlv' || savedRole === 'player') {
          setRole(savedRole);
        }
      } catch (err) {
        console.error('Error fetching tactical board config:', err);
      } finally {
        setPageLoading(false);
      }
    };

    checkConfig();
  }, []);

  // Fetch initial board state from API
  useEffect(() => {
    const loadState = async () => {
      try {
        const res = await fetch('/api/tactical-board/state', { cache: 'no-store' });
        const data = await res.json();
        if (data && data.state && data.state.players && data.state.players.length > 0) {
          setBoardState(data.state);
        }
      } catch (err) {
        console.error('Error loading tactical board state:', err);
      }
    };

    loadState();
  }, []);

  // Debounced DB Save function
  const saveStateToDb = useCallback((stateToSave: TacticalBoardState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/tactical-board/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: stateToSave }),
        });
      } catch (err) {
        console.error('Failed to save tactical state to DB:', err);
      }
    }, 400);
  }, []);

  // Broadcast state to Supabase Realtime Channel
  const broadcastState = useCallback((newState: TacticalBoardState) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'board_sync',
        payload: {
          senderId: clientIdRef.current,
          state: newState,
        },
      });
    }
  }, []);

  // Combined State Updater (Updates Local State + Broadcasts + Saves to DB)
  const updateBoardState = useCallback((updater: (prev: TacticalBoardState) => TacticalBoardState) => {
    setBoardState((prev) => {
      const updated = updater(prev);
      broadcastState(updated);
      saveStateToDb(updated);
      return updated;
    });
  }, [broadcastState, saveStateToDb]);

  // Setup Supabase Realtime Channel (Board Sync + Realtime Chat Sync)
  useEffect(() => {
    const channel = supabase.channel('tactical_board_room', {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'board_sync' }, (payload) => {
        if (payload?.payload?.state && payload.payload.senderId !== clientIdRef.current) {
          setBoardState(payload.payload.state);
        }
      })
      .on('broadcast', { event: 'chat_sync' }, (payload) => {
        if (payload?.payload?.message && payload.payload.senderId !== clientIdRef.current) {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === payload.payload.message.id)) return prev;
            return [...prev.slice(-39), payload.payload.message];
          });
        }
      })
      .on('broadcast', { event: 'board_reset' }, () => {
        setBoardState(INITIAL_BOARD_STATE);
        setChatMessages([]);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Connected to realtime
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Login handler
  const handleLoginSuccess = (userRole: UserRole) => {
    setRole(userRole);
    localStorage.setItem(LOCAL_ROLE_KEY, userRole);
  };

  // Logout handler
  const handleLogout = () => {
    setRole(null);
    localStorage.removeItem(LOCAL_ROLE_KEY);
  };

  // Action Handlers for HLV
  const handlePitchTypeChange = (newPitchType: PitchType) => {
    const defaultForm = FORMATION_PRESETS[newPitchType][0];
    updateBoardState((prev) => ({
      ...prev,
      pitchType: newPitchType,
      formationA: defaultForm,
      formationB: defaultForm,
      players: generateDefaultPlayers(newPitchType, defaultForm, defaultForm),
      ball: { x: 50, y: 50 },
      arrows: [],
    }));
  };

  const handleFormationAChange = (newForm: string) => {
    updateBoardState((prev) => ({
      ...prev,
      formationA: newForm,
      players: generateDefaultPlayers(prev.pitchType, newForm, prev.formationB),
    }));
  };

  const handleFormationBChange = (newForm: string) => {
    updateBoardState((prev) => ({
      ...prev,
      formationB: newForm,
      players: generateDefaultPlayers(prev.pitchType, prev.formationA, newForm),
    }));
  };

  const handleUpdatePlayerPos = (id: string, x: number, y: number) => {
    updateBoardState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === id ? { ...p, x, y } : p)),
    }));
  };

  const handleUpdateBallPos = (x: number, y: number) => {
    updateBoardState((prev) => ({
      ...prev,
      ball: { x, y },
    }));
  };

  const handleAddArrow = (arrow: TacticalArrow) => {
    updateBoardState((prev) => ({
      ...prev,
      arrows: [...prev.arrows, arrow],
    }));
  };

  const handleUndoLastArrow = useCallback(() => {
    updateBoardState((prev) => ({
      ...prev,
      arrows: prev.arrows.slice(0, -1),
    }));
  }, [updateBoardState]);

  const handleClearAllArrows = () => {
    updateBoardState((prev) => ({
      ...prev,
      arrows: [],
    }));
  };

  // Keyboard shortcuts for HLV (Ctrl+Z / Cmd+Z for Undo, Backspace / Delete for deleting last arrow)
  useEffect(() => {
    if (role !== 'hlv') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
      if (isUndo) {
        e.preventDefault();
        handleUndoLastArrow();
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleUndoLastArrow();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [role, handleUndoLastArrow]);

  const handleDeleteSingleArrow = (id: string) => {
    updateBoardState((prev) => ({
      ...prev,
      arrows: prev.arrows.filter((a) => a.id !== id),
    }));
  };

  const handleResetFormation = () => {
    updateBoardState((prev) => ({
      ...prev,
      players: generateDefaultPlayers(prev.pitchType, prev.formationA, prev.formationB),
      ball: { x: 50, y: 50 },
      arrows: [],
    }));
  };

  const handleUpdatePlayerDetails = (id: string, number: number | string, name: string) => {
    updateBoardState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === id ? { ...p, number, name } : p)),
    }));
  };

  if (pageLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#faf5f5',
      }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: '#e53935' }} />
        <span style={{ marginLeft: '12px', fontWeight: 700, color: '#1a1a2e' }}>Đang tải Bảng chiến thuật...</span>
      </div>
    );
  }

  // If not logged in or page is disabled by Admin, show LoginModal
  if (!role || isDisabledByAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf5f5' }}>
        <LoginModal
          isDisabledByAdmin={isDisabledByAdmin}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div style={{
      height: 'calc(100vh - 110px)',
      maxHeight: 'calc(100vh - 110px)',
      overflow: 'hidden',
      background: '#f8fafc',
      color: '#0f172a',
      padding: '6px 12px 10px 12px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      {/* Top Header Mode Switcher Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '6px 14px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        flexShrink: 0,
      }}>
        {/* Left: Home link & Role Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/" style={{
            color: '#475569',
            textDecoration: 'none',
            background: '#f1f5f9',
            padding: '5px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <ArrowLeft size={14} /> Trang chủ
          </Link>

          {role === 'hlv' ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
            }}>
              <Shield size={14} style={{ color: '#ef4444' }} /> HLV
            </div>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#f8fafc',
              color: '#334155',
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: '1px solid #e2e8f0',
            }}>
              <Eye size={14} style={{ color: '#3b82f6' }} /> Cầu Thủ
            </div>
          )}
        </div>

        {/* Center: Mode Tabs Toggle (Option 1: Live, Option 2: Danh sách chiến thuật) */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          borderRadius: '10px',
          padding: '3px',
          gap: '4px',
        }}>
          <button
            onClick={() => setViewMode('live')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'live' ? '#ef4444' : 'transparent',
              color: viewMode === 'live' ? '#ffffff' : '#475569',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: viewMode === 'live' ? '0 2px 6px rgba(239,68,68,0.3)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Radio size={14} className={viewMode === 'live' ? 'animate-pulse' : ''} /> 1. Live Chiến Thuật
          </button>

          <button
            onClick={() => {
              setEditingTactic(null);
              setViewMode('list');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'list' || viewMode === 'create' ? '#ef4444' : 'transparent',
              color: viewMode === 'list' || viewMode === 'create' ? '#ffffff' : '#475569',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: viewMode === 'list' || viewMode === 'create' ? '0 2px 6px rgba(239,68,68,0.3)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <List size={14} /> 2. Danh Sách Chiến Thuật
          </button>
        </div>

        {/* Right: Logout Button */}
        <button
          onClick={handleLogout}
          title="Đăng xuất"
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#be123c',
            padding: '5px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <LogOut size={14} /> Đăng xuất
        </button>
      </div>

      {/* Main View Area */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        gap: '12px',
        alignItems: 'stretch',
        overflow: 'hidden',
      }}>
        {/* OPTION 1: LIVE TACTICS MODE */}
        {viewMode === 'live' && (
          <>
            {/* LEFT COLUMN: Control Panel (HLV) */}
            {role === 'hlv' && (
              <div style={{ flex: '0 0 310px', width: '310px', height: '100%', overflowY: 'auto' }}>
                <ControlPanel
                  role={role}
                  pitchType={boardState.pitchType}
                  formationA={boardState.formationA}
                  formationB={boardState.formationB}
                  teamAColor={boardState.teamAColor}
                  teamBColor={boardState.teamBColor}
                  gkColor={boardState.gkColor}
                  arrowColor={boardState.arrowColor}
                  isDrawingMode={isDrawingMode}
                  arrowCount={boardState.arrows.length}
                  onChangePitchType={handlePitchTypeChange}
                  onChangeFormationA={handleFormationAChange}
                  onChangeFormationB={handleFormationBChange}
                  onChangeTeamAColor={(c) => updateBoardState((prev) => ({ ...prev, teamAColor: c }))}
                  onChangeTeamBColor={(c) => updateBoardState((prev) => ({ ...prev, teamBColor: c }))}
                  onChangeGkColor={(c) => updateBoardState((prev) => ({ ...prev, gkColor: c }))}
                  onChangeArrowColor={(c) => updateBoardState((prev) => ({ ...prev, arrowColor: c }))}
                  onToggleDrawingMode={() => setIsDrawingMode(!isDrawingMode)}
                  onUndoLastArrow={handleUndoLastArrow}
                  onClearAllArrows={handleClearAllArrows}
                  onResetFormation={handleResetFormation}
                  onLogout={handleLogout}
                />
              </div>
            )}

            {/* MIDDLE COLUMN: Tactical Pitch Canvas */}
            <div style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <TacticalPitch
                role={role}
                players={boardState.players}
                ball={boardState.ball}
                arrows={boardState.arrows}
                teamAColor={boardState.teamAColor}
                teamBColor={boardState.teamBColor}
                gkColor={boardState.gkColor}
                arrowColor={boardState.arrowColor}
                isDrawingMode={isDrawingMode}
                onUpdatePlayerPos={handleUpdatePlayerPos}
                onUpdateBallPos={handleUpdateBallPos}
                onAddArrow={handleAddArrow}
                onDeleteSingleArrow={handleDeleteSingleArrow}
                onUpdatePlayerDetails={handleUpdatePlayerDetails}
              />
            </div>

            {/* RIGHT COLUMN: Live Chat Box */}
            <div style={{ flex: '0 0 340px', width: '340px', height: '100%' }}>
              <LiveChat
                role={role || 'player'}
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                onLogout={handleLogout}
              />
            </div>
          </>
        )}

        {/* OPTION 2: TACTICS LIST MODE */}
        {viewMode === 'list' && (
          <>
            <div style={{ flex: 1, height: '100%', overflow: 'hidden', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <TacticsList
                role={role}
                onCreateNewTactic={() => {
                  setEditingTactic(null);
                  setViewMode('create');
                }}
                onEditTactic={(tactic) => {
                  setEditingTactic(tactic);
                  setViewMode('create');
                }}
              />
            </div>

            {/* RIGHT COLUMN: Live Chat Box preserved */}
            <div style={{ flex: '0 0 340px', width: '340px', height: '100%' }}>
              <LiveChat
                role={role || 'player'}
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                onLogout={handleLogout}
              />
            </div>
          </>
        )}

        {/* OPTION 2 - SUBVIEW: CREATE / EDIT TACTIC MODE */}
        {viewMode === 'create' && (
          <div style={{ flex: 1, height: '100%', overflow: 'hidden', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <TacticCreator
              role={role}
              initialTactic={editingTactic}
              onBackToList={() => {
                setEditingTactic(null);
                setViewMode('list');
              }}
              onTacticSaved={() => {
                setEditingTactic(null);
                setViewMode('list');
              }}
            />
          </div>
        )}

        {/* Modal for Shared Tactic Link View */}
        {sharedTactic && (
          <TacticPlayerModal
            tactic={sharedTactic}
            role={role || 'player'}
            isSharedView={true}
            onClose={() => setSharedTactic(null)}
          />
        )}
      </div>
    </div>
  );
}
