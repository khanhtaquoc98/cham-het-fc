'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { LoginModal } from '@/components/TacticalBoard/LoginModal';
import { ControlPanel } from '@/components/TacticalBoard/ControlPanel';
import { TacticalPitch } from '@/components/TacticalBoard/TacticalPitch';
import { LiveChat, ChatMessage } from '@/components/TacticalBoard/LiveChat';
import { TacticalBoardState, PitchType, UserRole, TacticalArrow } from '@/components/TacticalBoard/types';
import { generateDefaultPlayers, FORMATION_PRESETS } from '@/components/TacticalBoard/formations';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, LayoutGrid, ShieldAlert, LogOut } from 'lucide-react';

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

  const handleUndoLastArrow = () => {
    updateBoardState((prev) => ({
      ...prev,
      arrows: prev.arrows.slice(0, -1),
    }));
  };

  const handleClearAllArrows = () => {
    updateBoardState((prev) => ({
      ...prev,
      arrows: [],
    }));
  };

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
      gap: '12px',
      alignItems: 'stretch',
    }}>
      {/* LEFT COLUMN: Control Panel (Only for HLV) */}
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
      <div style={{ flex: '0 0 360px', width: '360px', height: '100%' }}>
        <LiveChat
          role={role || 'player'}
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}
