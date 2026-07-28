'use client';

import React, { useEffect, useState, DragEvent, useRef } from 'react';
import { Player, Team, MatchData, TeleVoteConfig } from '@/types/match';
import { toast } from 'react-hot-toast';
import { Wand2, Dices, ClipboardCopy, Armchair, Trash2, GripVertical, Palette, Vote, RefreshCw } from 'lucide-react';

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
  const [siteTheme, setSiteTheme] = useState('default');
  const [themeSaving, setThemeSaving] = useState(false);

  // Traffic camera state
  const [cameraUrl, setCameraUrl] = useState('');
  const [cameraSaving, setCameraSaving] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string | null>(null);

  // Tele vote config state
  const [voteConfig, setVoteConfig] = useState<TeleVoteConfig>({
    chat_id: "-1001505319885",
    is_anonymous: false,
    message_id: 218583,
    options: ["0", "+1", "+2", "+3", "+4"],
    poll_id: "542318491024",
    thread_id: "61897",
    title: "16/7 - 19h30 - Deadline 12h 14/7",
    show_vote: true,
    provider: 'internal'
  });

  const [voteConfigSaving, setVoteConfigSaving] = useState(false);
  const [voteCreating, setVoteCreating] = useState(false);
  const [liveVotersNames, setLiveVotersNames] = useState<string[]>([]);
  const [loadingVotersList, setLoadingVotersList] = useState(false);
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editingTagValue, setEditingTagValue] = useState<string>('');


  const loadLiveVoters = async (overrideProvider?: string) => {
    setLoadingVotersList(true);
    try {
      const p = overrideProvider || voteConfig.provider || 'internal';
      const res = await fetch(`/api/tele-vote-config?action=voters&provider=${p}&t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      const votersList = data.voters || [];
      const names: string[] = [];
      votersList.forEach((v: { user_name: string; option_ids: number[] | string }) => {
        let optionIds: number[] = [];
        if (Array.isArray(v.option_ids)) optionIds = v.option_ids;
        else if (typeof v.option_ids === 'string') {
          try { optionIds = JSON.parse(v.option_ids); } catch (e) {}
        }
        const mainOptIndex = optionIds[0] ?? 1;
        if (mainOptIndex === 0) return;
        const count = mainOptIndex > 0 ? mainOptIndex : 1;
        for (let i = 0; i < count; i++) {
          names.push(i === 0 ? v.user_name : `${v.user_name} ${i}`);
        }
      });
      setLiveVotersNames(names);
    } catch (err) {
      console.error('Error loading live voters list:', err);
    } finally {
      setLoadingVotersList(false);
    }
  };


  
  // Players from DB for Modal
  const [allPlayers, setAllPlayers] = useState<{id: string; name: string; subNames?: string[]; telegramHandle?: string}[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

  // Sync Vote to Bench Modal state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncingVoters, setSyncingVoters] = useState(false);
  const [votedCandidates, setVotedCandidates] = useState<{
    id: string;
    originalVotedName: string;
    optionText: string;
    mappedPlayerId: string;
    customName: string;
  }[]>([]);
  const [rememberSubNames, setRememberSubNames] = useState(true);
  const [rawVoteTextInput, setRawVoteTextInput] = useState('');
  const [showRawTextInput, setShowRawTextInput] = useState(false);

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

    // Fetch site theme
    fetch('/api/theme')
      .then(r => r.json())
      .then(data => setSiteTheme(data.theme || 'default'))
      .catch(() => {});

    // Fetch tele vote config
    fetch('/api/tele-vote-config?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          setVoteConfig(res.data);
          loadLiveVoters(res.data.provider);
        }
      })
      .catch(err => console.error('Error fetching tele vote config:', err));

    // Fetch traffic camera url
    fetch('/api/traffic-camera?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setCameraUrl(d.url || ''))
      .catch(err => console.error('Error fetching traffic camera url:', err));

  }, []);

  const handleSaveCamera = async () => {
    setCameraSaving(true);
    setCameraStatus(null);
    try {
      const res = await fetch('/api/traffic-camera', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cameraUrl.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setCameraStatus('✅ Đã lưu URL Camera Giao Thông!');
        toast.success('Đã lưu cấu hình Camera Giao Thông!');
      } else {
        setCameraStatus('❌ Lỗi: ' + (data.error || 'Không rõ'));
        toast.error('Lỗi khi lưu URL Camera');
      }
      setTimeout(() => setCameraStatus(null), 4000);
    } catch {
      setCameraStatus('❌ Lỗi kết nối');
      toast.error('Lỗi kết nối');
    } finally {
      setCameraSaving(false);
    }
  };

  const handleClearCamera = async () => {
    setCameraUrl('');
    setCameraSaving(true);
    try {
      const res = await fetch('/api/traffic-camera', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '' }),
      });
      const data = await res.json();
      if (data.ok) {
        setCameraStatus('✅ Đã xóa & ẩn Camera!');
        toast.success('Đã xóa Camera khỏi Trang Chủ!');
      }
      setTimeout(() => setCameraStatus(null), 4000);
    } catch {
      setCameraStatus('❌ Lỗi kết nối');
    } finally {
      setCameraSaving(false);
    }
  };

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

  const handleSaveVoteConfig = async (overrideConfig?: unknown) => {
    const isOverride = overrideConfig && typeof overrideConfig === 'object' && 'chat_id' in (overrideConfig as Record<string, unknown>);
    const targetConfig = isOverride ? (overrideConfig as TeleVoteConfig) : voteConfig;
    if (isOverride) setVoteConfig(overrideConfig as TeleVoteConfig);
    setVoteConfigSaving(true);
    try {
      const res = await fetch('/api/tele-vote-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: targetConfig }),
      });
      const result = await res.json();
      if (result.ok) {
        toast.success('Đã lưu config vote tele!');
        if (result.data) setVoteConfig(result.data);
      } else {
        toast.error('Lỗi khi lưu config vote tele');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu config vote tele');
    } finally {
      setVoteConfigSaving(false);
    }
  };

  const handleSelectProvider = async (provider: 'internal' | 'third_party') => {
    const updated = { ...voteConfig, provider };
    setVoteConfig(updated);
    setVoteConfigSaving(true);
    try {
      const res = await fetch('/api/tele-vote-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updated }),
      });
      if (res.ok) {
        toast.success(provider === 'third_party' ? 'Đã chuyển sang Thư viện bên thứ 3!' : 'Đã chuyển sang Internal!');
        const freshRes = await fetch('/api/tele-vote-config?t=' + Date.now(), { cache: 'no-store' });
        if (freshRes.ok) {
          const freshData = await freshRes.json();
          if (freshData.data) setVoteConfig(freshData.data);
          loadLiveVoters(provider);
        }

      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi đổi nguồn vote');
    } finally {
      setVoteConfigSaving(false);
    }
  };




  const handleCreateVote = async () => {
    setVoteCreating(true);
    try {
      const res = await fetch('/api/tele-vote-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', config: voteConfig }),
      });
      const result = await res.json();
      if (result.ok) {
        if (result.data) setVoteConfig(result.data);
        if (result.telegramSent) {
          toast.success('Tạo vote Telegram thành công!');
        } else if (result.telegramError) {
          toast.success('Đã lưu config vote tele (lỗi Telegram: ' + result.telegramError + ')');
        } else {
          toast.success('Đã tạo & lưu config vote tele!');
        }
      } else {
        toast.error('Lỗi khi tạo vote');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối khi tạo vote');
    } finally {
      setVoteCreating(false);
    }
  };

  const parseRawTextToCandidates = (text: string) => {
    const lines = text.split('\n');
    const items: typeof votedCandidates = [];
    let idCounter = 1;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const matchPlus = trimmed.match(/^[\d\.\-\s]*([^(\+]+)\s*(?:\(\+?(\d+)\)|\+?(\d+))?/i);
      if (matchPlus) {
        const name = matchPlus[1].trim();
        const count = parseInt(matchPlus[2] || matchPlus[3] || '1') || 1;

        for (let i = 0; i < count; i++) {
          const cName = i === 0 ? name : `${name} ${i}`;
          const matched = allPlayers.find(p => {
            const normV = cName.trim().toLowerCase().replace(/^@/, '');
            const normP = p.name.trim().toLowerCase();
            const normSub = (p.subNames || []).map(s => s.trim().toLowerCase());
            const normH = (p.telegramHandle || '').trim().toLowerCase().replace(/^@/, '');
            return normV === normP || normSub.includes(normV) || (normH && normH === normV);
          });

          items.push({
            id: `cand-${idCounter++}`,
            originalVotedName: cName,
            optionText: `+${count}`,
            mappedPlayerId: matched ? matched.id : '',
            customName: matched ? matched.name : cName,
          });
        }
      }
    });

    return items;
  };

  const handleOpenSyncModal = async () => {
    setSyncingVoters(true);
    try {
      const playersRes = await fetch('/api/players');
      let currentAllPlayers = allPlayers;
      if (playersRes.ok) {
        const pData = await playersRes.json();
        if (Array.isArray(pData)) {
          setAllPlayers(pData);
          currentAllPlayers = pData;
        }
      }

      const pollId = voteConfig.poll_id || '';
      const res = await fetch(`/api/tele-vote-config?action=voters&poll_id=${pollId}`);
      const data = await res.json();
      const votersList = data.voters || [];

      const candidates: typeof votedCandidates = [];
      let idCounter = 1;

      if (votersList.length > 0) {
        votersList.forEach((v: { user_name: string; option_ids: number[] | string }) => {
          let optionIds: number[] = [];
          if (Array.isArray(v.option_ids)) optionIds = v.option_ids;
          else if (typeof v.option_ids === 'string') {
            try { optionIds = JSON.parse(v.option_ids); } catch (e) {}
          }

          const mainOptIndex = optionIds[0] ?? 1;
          if (mainOptIndex === 0) return;

          const count = mainOptIndex > 0 ? mainOptIndex : 1;
          const optionLabel = `+${count}`;

          for (let i = 0; i < count; i++) {
            const vName = i === 0 ? v.user_name : `${v.user_name} ${i}`;

            const matched = currentAllPlayers.find(p => {
              const normV = vName.trim().toLowerCase().replace(/^@/, '');
              const normP = p.name.trim().toLowerCase();
              const normSub = (p.subNames || []).map(s => s.trim().toLowerCase());
              const normH = (p.telegramHandle || '').trim().toLowerCase().replace(/^@/, '');
              return normV === normP || normSub.includes(normV) || (normH && normH === normV);
            });

            candidates.push({
              id: `cand-${idCounter++}`,
              originalVotedName: vName,
              optionText: optionLabel,
              mappedPlayerId: matched ? matched.id : '',
              customName: matched ? matched.name : vName,
            });
          }
        });
      }

      setVotedCandidates(candidates);
      setShowRawTextInput(candidates.length === 0);
      setIsSyncModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách vote');
    } finally {
      setSyncingVoters(false);
    }
  };

  const handleConfirmSyncToBench = async () => {
    if (votedCandidates.length === 0) {
      toast.error('Danh sách vote trống!');
      return;
    }

    try {
      const newBenchPlayers: Player[] = votedCandidates.map(c => {
        const officialPlayer = allPlayers.find(p => p.id === c.mappedPlayerId);
        return {
          name: officialPlayer ? officialPlayer.name : c.customName || c.originalVotedName,
          playerId: officialPlayer ? officialPlayer.id : undefined,
          telegramHandle: officialPlayer?.telegramHandle || undefined,
        };
      });

      setBench(newBenchPlayers);
      await fetch('/api/match/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bench: newBenchPlayers }),
      });

      if (rememberSubNames) {
        for (const c of votedCandidates) {
          if (c.mappedPlayerId) {
            const player = allPlayers.find(p => p.id === c.mappedPlayerId);
            if (player) {
              const normV = c.originalVotedName.trim();
              const currentSubs = player.subNames || [];
              if (
                normV.toLowerCase() !== player.name.toLowerCase() &&
                !currentSubs.map(s => s.toLowerCase()).includes(normV.toLowerCase())
              ) {
                const updatedSubs = [...currentSubs, normV];
                await fetch('/api/players', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: player.id, subNames: updatedSubs }),
                });
                player.subNames = updatedSubs;
              }
            }
          }
        }
      }

      toast.success(`🎉 Đã đồng bộ ${newBenchPlayers.length} cầu thủ lên Bench!`);
      setIsSyncModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi đồng bộ lên Bench');
    }
  };

  const handleCreateTeams = async () => {
    // When click "Tạo Team", initialize empty teams based on config and ensure bench exists if null
    const newTeams: Team[] = [];
    const teamNames = venue.teamConfig === 3 ? ['Home', 'Away', 'Extra'] : venue.teamConfig === 1 ? ['Home'] : ['Home', 'Away'];
    
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
    const teamNames = venue.teamConfig === 3 ? ['Home', 'Away', 'Extra'] : venue.teamConfig === 1 ? ['Home'] : ['Home', 'Away'];
    
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

  /* ----- Drag and Drop Logic (Desktop) ----- */
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
    executeDrop(draggedPlayer, targetId);
  };

  /* ----- Touch Drag and Drop (Mobile / iOS) ----- */
  // Use refs for state that native event listeners need (avoids stale closures)
  const [touchGhost, setTouchGhost] = useState<{ x: number; y: number; name: string } | null>(null);
  const [touchOverTarget, setTouchOverTarget] = useState<string | null>(null);
  const touchDragRef = useRef<{ player: Player; sourceId: string; index: number } | null>(null);
  const touchGhostRef = useRef<{ x: number; y: number; name: string } | null>(null);
  const touchOverRef = useRef<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const onTouchStart = (player: Player, sourceId: string, index: number) => (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchDragRef.current = { player, sourceId, index };
    setDraggedPlayer({ player, sourceId, index });
    const ghost = { x: touch.clientX, y: touch.clientY, name: player.name };
    touchGhostRef.current = ghost;
    setTouchGhost(ghost);
  };

  // Attach non-passive touchmove/touchend on the dashboard container
  // This is REQUIRED for iOS Safari — React synthetic events are passive and ignore preventDefault()
  useEffect(() => {
    const container = dashboardRef.current;
    if (!container) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchDragRef.current) return;
      e.preventDefault(); // NOW this actually works because { passive: false }
      const touch = e.touches[0];
      const ghost = { x: touch.clientX, y: touch.clientY, name: touchDragRef.current.player.name };
      touchGhostRef.current = ghost;
      setTouchGhost(ghost);

      // Hit-test: find which drop zone the finger is over
      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      if (elem) {
        const dropZone = (elem as HTMLElement).closest('[data-dropzone-id]') as HTMLElement | null;
        const target = dropZone?.dataset.dropzoneId || null;
        touchOverRef.current = target;
        setTouchOverTarget(target);
      } else {
        touchOverRef.current = null;
        setTouchOverTarget(null);
      }
    };

    const handleTouchEnd = () => {
      if (!touchDragRef.current) return;
      const dragged = touchDragRef.current;
      const target = touchOverRef.current;

      if (target && target !== dragged.sourceId) {
        // Use setTimeout to batch state updates after cleanup
        const dragData = { ...dragged };
        const targetId = target;
        setTimeout(() => executeDrop(dragData, targetId), 0);
      }

      // Cleanup
      touchDragRef.current = null;
      touchGhostRef.current = null;
      touchOverRef.current = null;
      setTouchGhost(null);
      setTouchOverTarget(null);
      setDraggedPlayer(null);
    };

    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bench, teams]); // Re-attach when data changes so executeDrop has fresh state

  /* ----- Shared Drop Logic ----- */
  const executeDrop = (dragged: { player: Player; sourceId: string; index: number }, targetId: string) => {
    const { player, sourceId, index } = dragged;
    if (sourceId === targetId) {
      setDraggedPlayer(null);
      return;
    }

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
      // Just remove, don't add anywhere
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

  const handleSaveTheme = async (newTheme: string) => {
    setThemeSaving(true);
    try {
      const res = await fetch('/api/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
      if (res.ok) {
        setSiteTheme(newTheme);
        toast.success(`Đã đổi theme: ${newTheme === 'worldcup2026' ? 'World Cup 2026' : 'Mặc định'}`);
      } else {
        toast.error('Lỗi khi lưu theme');
      }
    } catch {
      toast.error('Lỗi khi lưu theme');
    } finally {
      setThemeSaving(false);
    }
  };

  return (
    <>
    {/* Site Theme Config */}
    <div className="admin-card" style={{ ...cardStyle, marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 className="admin-section-title" style={sectionTitleStyle}>
          <Palette size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> Theme Trang Chủ
        </h2>
        {themeSaving && <span style={{ fontSize: '12px', color: '#e53935', fontWeight: 600 }}>Đang lưu...</span>}
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => handleSaveTheme('default')}
          disabled={themeSaving}
          style={{
            ...btnBase,
            padding: '10px 20px',
            background: siteTheme === 'default'
              ? 'linear-gradient(135deg, #c62828, #e53935)'
              : 'var(--bg-secondary)',
            color: siteTheme === 'default' ? 'white' : 'var(--text-primary)',
            border: siteTheme === 'default'
              ? '2px solid #c62828'
              : '2px solid var(--border-subtle)',
            fontWeight: 700,
            borderRadius: '12px',
            cursor: themeSaving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          🔴 Mặc định (Đỏ)
        </button>
        <button
          onClick={() => handleSaveTheme('worldcup2026')}
          disabled={themeSaving}
          style={{
            ...btnBase,
            padding: '10px 20px',
            background: siteTheme === 'worldcup2026'
              ? 'linear-gradient(135deg, #00695C, #26A69A)'
              : 'var(--bg-secondary)',
            color: siteTheme === 'worldcup2026' ? 'white' : 'var(--text-primary)',
            border: siteTheme === 'worldcup2026'
              ? '2px solid #00897B'
              : '2px solid var(--border-subtle)',
            fontWeight: 700,
            borderRadius: '12px',
            cursor: themeSaving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          ⚽ World Cup 2026
        </button>
      </div>
      <p style={{ fontSize: '12px', color: '#8a8aaa', marginTop: '8px' }}>
        Thay đổi sẽ áp dụng cho tất cả người dùng trên trang chủ.
      </p>
    </div>

    {/* Traffic Camera Config */}
    <div className="admin-card" style={{ ...cardStyle, marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 className="admin-section-title" style={sectionTitleStyle}>
          📹 Camera Giao Thông Realtime (Trang Chủ)
        </h2>
        {cameraStatus && (
          <span style={{ fontSize: '12px', color: cameraStatus.startsWith('✅') ? '#2e7d32' : '#e53935', fontWeight: 600 }}>
            {cameraStatus}
          </span>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>URL Camera (Handler / Stream image)</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            style={{ ...inputStyle, flex: 1, minWidth: '240px' }}
            placeholder="VD: https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=6623e7f06f998a001b25244a&bg=black"
            value={cameraUrl}
            onChange={(e) => setCameraUrl(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setCameraUrl('https://giaothong.hochiminhcity.gov.vn:8007/Render/CameraHandler.ashx?id=6623e7f06f998a001b25244a&bg=black')}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(198,40,40,0.2)',
              background: '#fff5f5',
              fontSize: '12px',
              fontWeight: 600,
              color: '#c62828',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            📌 Thử link mẫu TP.HCM
          </button>
        </div>
        <p style={{ fontSize: '11px', color: '#8a8aaa', marginTop: '6px' }}>
          Nhập đường dẫn camera để hiển thị trực tiếp trên Trang chủ với cơ chế tự động refetch 1 phút/lần. Để trống để ẩn camera.
        </p>
      </div>

      {cameraUrl && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: '#8a8aaa', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>
            Xem trước (Live Preview trong Admin):
          </div>
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #eee', background: '#000', maxHeight: '200px', display: 'flex', justifyContent: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/traffic-camera/proxy?url=${encodeURIComponent(cameraUrl)}&_t=${Date.now()}`}
              alt="Camera Preview"
              style={{ maxHeight: '200px', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          style={{ ...btnPrimary, opacity: cameraSaving ? 0.6 : 1, cursor: cameraSaving ? 'not-allowed' : 'pointer' }}
          onClick={handleSaveCamera}
          disabled={cameraSaving}
        >
          {cameraSaving ? 'Đang lưu...' : '💾 Lưu URL Camera'}
        </button>
        {cameraUrl && (
          <button
            style={{ ...btnBase, padding: '10px 24px', borderRadius: '10px', background: '#ffebee', color: '#c62828', fontSize: '14px' }}
            onClick={handleClearCamera}
            disabled={cameraSaving}
          >
            🗑️ Xóa & Ẩn Camera
          </button>
        )}
      </div>
    </div>

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
              <option value={1}>1 Đội (Home)</option>
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

          {/* CONFIG VOTE TELE SECTION */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 className="admin-section-title" style={sectionTitleStyle}>
              Config Vote Tele
            </h2>
            {voteConfigSaving && <span style={statusStyle}>Đang lưu...</span>}
          </div>

          {/* VOTE DISPLAY SETTINGS & PROVIDER CONTROL */}
          <div style={{
            background: 'var(--bg-card, rgba(255, 255, 255, 0.05))',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Toggle Show/Hide Vote */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>
                  Hiển thị Nút Vote (Show Vote Widget)
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                  Bật/tắt widget bình chọn điểm danh hiển thị ở trang chủ
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextShow = !(voteConfig.show_vote ?? true);
                  handleSaveVoteConfig({ ...voteConfig, show_vote: nextShow });
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: (voteConfig.show_vote ?? true) ? '#2e7d32' : '#c62828',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                {(voteConfig.show_vote ?? true) ? '🟢 ON (Đang Hiện Vote)' : '🔴 OFF (Đang Ẩn Vote)'}
              </button>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))', margin: 0 }} />

            {/* Select Vote Source Option */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
                Nguồn Dữ Liệu Vote (Vote Provider)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {/* Option 1: Internal */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: voteConfig.provider === 'third_party' ? '1px solid var(--border-subtle)' : '2px solid #0088cc',
                    background: voteConfig.provider === 'third_party' ? 'transparent' : 'rgba(0, 136, 204, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="vote_provider"
                    value="internal"
                    checked={voteConfig.provider !== 'third_party'}
                    onChange={() => handleSelectProvider('internal')}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Option 1: Internal</div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>Dùng cách hiện tại (Database nội bộ)</div>
                  </div>
                </label>

                {/* Option 2: Third Party Library */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: voteConfig.provider === 'third_party' ? '2px solid #9c27b0' : '1px solid var(--border-subtle)',
                    background: voteConfig.provider === 'third_party' ? 'rgba(156, 39, 176, 0.1)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="vote_provider"
                    value="third_party"
                    checked={voteConfig.provider === 'third_party'}
                    onChange={() => handleSelectProvider('third_party')}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Option 2: Thư viện bên thứ 3</div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>Dùng API bot-storage (chiateam)</div>
                  </div>
                </label>

              </div>
            </div>

          </div>

          {/* LIVE VOTERS LIST DISPLAY WITH INLINE EDIT & ADD/DELETE */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary, #1e293b)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚽ Danh sách cầu thủ đi đá ({liveVotersNames.length} suất)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLiveVotersNames(names => [...names, `Cầu thủ ${names.length + 1}`]);
                    setEditingTagIndex(liveVotersNames.length);
                    setEditingTagValue(`Cầu thủ ${liveVotersNames.length + 1}`);
                  }}
                  style={{ background: 'rgba(0, 136, 204, 0.08)', border: '1px solid rgba(0, 136, 204, 0.25)', color: '#0088cc', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  ➕ Thêm người
                </button>
                <button
                  type="button"
                  onClick={() => loadLiveVoters()}
                  style={{ background: 'transparent', border: 'none', color: '#0088cc', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                >

                  {loadingVotersList ? '⏳ Đang tải...' : '🔄 Tải lại từ API'}
                </button>
              </div>
            </div>
            
            {liveVotersNames.length === 0 ? (
              <div style={{ fontSize: '12px', opacity: 0.6, fontStyle: 'italic', padding: '8px 0' }}>Chưa có cầu thủ đăng ký hoặc không tìm thấy vote.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {liveVotersNames.map((name, i) => {
                  const isEditing = editingTagIndex === i;
                  return (
                    <span
                      key={i}
                      style={{
                        background: '#e8f5e9',
                        border: '1px solid #a5d6a7',
                        borderRadius: '20px',
                        padding: '4px 10px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: '#1b5e20',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ color: '#2e7d32', fontSize: '10px' }}>●</span>
                      
                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingTagValue}
                          onChange={(e) => setEditingTagValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const updated = [...liveVotersNames];
                              if (editingTagValue.trim()) {
                                updated[i] = editingTagValue.trim();
                              }
                              setLiveVotersNames(updated);
                              setEditingTagIndex(null);
                            } else if (e.key === 'Escape') {
                              setEditingTagIndex(null);
                            }
                          }}
                          onBlur={() => {
                            const updated = [...liveVotersNames];
                            if (editingTagValue.trim()) {
                              updated[i] = editingTagValue.trim();
                            }
                            setLiveVotersNames(updated);
                            setEditingTagIndex(null);
                          }}
                          style={{
                            border: '1px solid #2e7d32',
                            borderRadius: '12px',
                            padding: '1px 6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#1b5e20',
                            background: '#ffffff',
                            outline: 'none',
                            width: '90px'
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingTagIndex(i);
                            setEditingTagValue(name);
                          }}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          title="Bấm để sửa tên"
                        >
                          {name}
                        </span>
                      )}

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTagIndex(i);
                            setEditingTagValue(name);
                          }}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center' }}
                          title="Sửa tên"
                        >
                          ✏️
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setLiveVotersNames(names => names.filter((_, idx) => idx !== i));
                          if (editingTagIndex === i) setEditingTagIndex(null);
                        }}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#c62828', fontSize: '13px', fontWeight: 800, marginLeft: '2px', display: 'flex', alignItems: 'center' }}
                        title="Xóa suất này"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>


          <div className="admin-form-grid-2" style={{ marginBottom: '12px' }}>

            <div>
              <label style={labelStyle}>Tiêu đề (Title)</label>
              <input 
                style={inputStyle} 
                placeholder="16/7 - 19h30 - Deadline 12h 14/7" 
                value={voteConfig.title || ''}
                onChange={e => setVoteConfig(c => ({ ...c, title: e.target.value }))} 
              />
            </div>
            <div>
              <label style={labelStyle}>Chat ID</label>
              <input 
                style={inputStyle} 
                placeholder="-1001505319885" 
                value={voteConfig.chat_id || ''}
                onChange={e => setVoteConfig(c => ({ ...c, chat_id: e.target.value }))} 
              />
            </div>
          </div>

          <div className="admin-form-grid-2" style={{ marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Thread ID (Topic ID)</label>
              <input 
                style={inputStyle} 
                placeholder="61897" 
                value={voteConfig.thread_id || ''}
                onChange={e => setVoteConfig(c => ({ ...c, thread_id: e.target.value }))} 
              />
            </div>
            <div>
              <label style={labelStyle}>Poll ID</label>
              <input 
                style={inputStyle} 
                placeholder="542318491024" 
                value={voteConfig.poll_id || ''}
                onChange={e => setVoteConfig(c => ({ ...c, poll_id: e.target.value }))} 
              />
            </div>
          </div>

          <div className="admin-form-grid-2" style={{ marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Message ID</label>
              <input 
                style={inputStyle} 
                type="number"
                placeholder="218583" 
                value={voteConfig.message_id || ''}
                onChange={e => setVoteConfig(c => ({ ...c, message_id: parseInt(e.target.value) || 0 }))} 
              />
            </div>
            <div>
              <label style={labelStyle}>Lựa chọn (Options - Phân cách bởi dấu phẩy)</label>
              <input 
                style={inputStyle} 
                placeholder="0, +1, +2, +3, +4" 
                value={(voteConfig.options || []).join(', ')}
                onChange={e => {
                  const opts = e.target.value.split(',').map(s => s.trim());
                  setVoteConfig(c => ({ ...c, options: opts }));
                }} 
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'none' }}>
              <input 
                type="checkbox"
                checked={voteConfig.is_anonymous || false}
                onChange={e => setVoteConfig(c => ({ ...c, is_anonymous: e.target.checked }))}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>Vote ẩn danh (is_anonymous)</span>
            </label>
          </div>

          <div className="admin-save-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              style={{ ...btnPrimary, background: 'linear-gradient(135deg, #0088cc, #00a8ff)', opacity: voteCreating ? 0.6 : 1 }} 
              onClick={handleCreateVote} 
              disabled={voteCreating}
            >
              <Vote size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              {voteCreating ? 'Đang tạo vote...' : 'Tạo vote'}
            </button>
            <button 
              style={{ ...btnBase, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', opacity: voteConfigSaving ? 0.6 : 1 }} 
              onClick={() => handleSaveVoteConfig()} 
              disabled={voteConfigSaving}
            >

              {voteConfigSaving ? 'Đang lưu...' : 'Lưu config vote tele'}
            </button>
            <button 
              style={{ ...btnBase, background: '#4CAF50', color: 'white', opacity: syncingVoters ? 0.6 : 1 }} 
              onClick={handleOpenSyncModal} 
              disabled={syncingVoters}
            >
              <RefreshCw size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} className={syncingVoters ? 'spin' : ''} />
              {syncingVoters ? 'Đang tải vote...' : 'Sync Vote lên Bench'}
            </button>
          </div>
          
          <hr style={{ margin: '32px 0', borderTop: '1px solid var(--border-subtle)' }} />

          {/* TEAM MANAGEMENT */}
          <h2 className="admin-section-title" style={sectionTitleStyle}>2. Dashboard Chia Team (Kéo & Thả)</h2>
          <div className="admin-action-row">
            <button style={{ ...btnBase, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} onClick={handleCreateTeams}>
              <Wand2 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Khởi tạo Team
            </button>
            <button style={{ ...btnBase, background: 'var(--field-accent-light)', color: 'white' }} onClick={handleAutoSplitTeams}>
              <Dices size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Auto Chia Đều
            </button>
            <button style={{ ...btnBase, background: '#0088cc', color: 'white' }} onClick={handleCopyTelegramCommand} title="Copy để paste vào nhóm chat">
              <ClipboardCopy size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Copy Telegram
            </button>
          </div>

          <div className="admin-dashboard-grid" ref={dashboardRef}>
            {/* BENCH COLUMN */}
            <div 
              data-dropzone-id="bench"
              style={{ background: touchOverTarget === 'bench' ? 'rgba(25,118,210,0.1)' : 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', minHeight: '300px', transition: 'background 0.15s' }}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, 'bench')}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', textAlign: 'center', color: 'var(--text-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <Armchair size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> BENCH DỰ BỊ ({bench.length})
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
                    onTouchStart={onTouchStart(player, 'bench', idx)}
                    style={{
                      background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', cursor: 'grab',
                      border: '1px solid var(--border-subtle)', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
                      touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
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
                    data-dropzone-id={team.name}
                    style={{ background: touchOverTarget === team.name ? 'rgba(25,118,210,0.1)' : 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', minHeight: '300px', transition: 'background 0.15s' }}
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
                          onTouchStart={onTouchStart(player, team.name, idx)}
                          style={{
                            background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', cursor: 'grab',
                            border: '1px solid var(--border-subtle)', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
                            touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
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
            data-dropzone-id="trash"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, 'trash')}
            style={{
              marginTop: '24px',
              border: `2px dashed ${touchOverTarget === 'trash' ? '#b71c1c' : '#e53935'}`,
              background: (draggedPlayer || touchOverTarget === 'trash') ? 'rgba(229,57,53,0.15)' : 'transparent',
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
            <Trash2 size={24} /> Kéo thả vào đây để XÓA cầu khỏi bench or team
          </div>

          {/* Touch Drag Ghost (floating element following finger) */}
          {touchGhost && (
            <div style={{
              position: 'fixed',
              left: touchGhost.x - 60,
              top: touchGhost.y - 20,
              background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              pointerEvents: 'none',
              zIndex: 9999,
              transform: 'scale(1.05)',
              whiteSpace: 'nowrap',
            }}>
              ≡ {touchGhost.name}
            </div>
          )}
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

      {/* SYNC VOTE & MAPPING MODAL */}
      {isSyncModalOpen && (
        <div className="install-modal-overlay" onClick={() => setIsSyncModalOpen(false)}>
          <div
            className="install-modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '92%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 className="install-modal-title" style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔄 Đồng bộ Vote lên Ghế dự bị (Bench)
              </h3>
              <button onClick={() => setIsSyncModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)' }}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
              Khớp tên vote trên Telegram với danh sách Cầu thủ chính thức. Ví dụ: <strong style={{ color: 'var(--accent)' }}>Kane 1</strong> chọn thành <strong style={{ color: 'var(--accent)' }}>Đạt</strong>.
            </p>

            {/* Manual Raw Text List Input Toggle */}
            {showRawTextInput ? (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  📝 Dán hoặc nhập danh sách vote (Ví dụ: 1. Kane (+2), 2. Son (+1), 3. Đạt):
                </label>
                <textarea
                  rows={5}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontFamily: 'inherit', fontSize: '13px' }}
                  placeholder={"Kane (+2)\nSon (+1)\nĐạt"}
                  value={rawVoteTextInput}
                  onChange={e => setRawVoteTextInput(e.target.value)}
                />
                <button
                  onClick={() => {
                    const parsed = parseRawTextToCandidates(rawVoteTextInput);
                    if (parsed.length === 0) {
                      toast.error('Không tìm thấy cầu thủ hợp lệ trong danh sách dán!');
                      return;
                    }
                    setVotedCandidates(parsed);
                    setShowRawTextInput(false);
                  }}
                  style={{ marginTop: '8px', padding: '8px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  🔍 Phân tích danh sách ({parseRawTextToCandidates(rawVoteTextInput).length} người)
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                  Danh sách vote ({votedCandidates.length} suất)
                </span>
                <button
                  onClick={() => setShowRawTextInput(true)}
                  style={{ background: 'none', border: 'none', color: '#0088cc', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  ✏️ Dán / Nhập danh sách bằng tay
                </button>
              </div>
            )}

            {/* Candidate Mapping List */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '4px', marginBottom: '16px' }}>
              {votedCandidates.length === 0 ? (
                <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
                  Chưa có dữ liệu vote từ Telegram. Bạn có thể bấm vào <strong style={{ color: '#0088cc', cursor: 'pointer' }} onClick={() => setShowRawTextInput(true)}>"✏️ Dán / Nhập danh sách bằng tay"</strong> ở góc phải để phân tích nhanh!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {votedCandidates.map((cand, idx) => (
                    <div
                      key={cand.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        background: 'var(--bg-secondary, #f8f9fa)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle, #eee)',
                      }}
                    >
                      <div style={{ width: '28px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                        #{idx + 1}
                      </div>

                      {/* Original Voted Name */}
                      <div style={{ flex: '1 1 120px', minWidth: '110px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {cand.originalVotedName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Suất: {cand.optionText}
                        </div>
                      </div>

                      <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>➡️</div>

                      {/* Official Player Select Dropdown */}
                      <div style={{ flex: '2 1 220px' }}>
                        <select
                          value={cand.mappedPlayerId}
                          onChange={e => {
                            const selId = e.target.value;
                            const official = allPlayers.find(p => p.id === selId);
                            setVotedCandidates(prev =>
                              prev.map(c =>
                                c.id === cand.id
                                  ? {
                                      ...c,
                                      mappedPlayerId: selId,
                                      customName: official ? official.name : c.originalVotedName,
                                    }
                                  : c
                              )
                            );
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '13px',
                            fontWeight: cand.mappedPlayerId ? 700 : 400,
                            color: cand.mappedPlayerId ? 'var(--accent)' : 'var(--text-primary)',
                            background: 'white',
                          }}
                        >
                          <option value="">-- Tên tự do ({cand.originalVotedName}) --</option>
                          {allPlayers.map(p => (
                            <option key={p.id} value={p.id}>
                              👤 {p.name} {p.subNames && p.subNames.length > 0 ? `(${p.subNames.join(', ')})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => {
                          setVotedCandidates(prev => prev.filter(c => c.id !== cand.id));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#e53935',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '6px',
                        }}
                        title="Xóa khỏi danh sách"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subnames checkbox option */}
            <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(0,136,204,0.06)', borderRadius: '10px', border: '1px solid rgba(0,136,204,0.15)' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberSubNames}
                  onChange={e => setRememberSubNames(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Tự động nhớ biệt danh (Lưu tên vote vào subNames để tự động nhận diện lần sau)</span>
              </label>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsSyncModalOpen(false)}
                style={{ padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmSyncToBench}
                disabled={votedCandidates.length === 0}
                style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', opacity: votedCandidates.length === 0 ? 0.5 : 1 }}
              >
                ✅ Đưa {votedCandidates.length} cầu thủ lên Bench
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
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
