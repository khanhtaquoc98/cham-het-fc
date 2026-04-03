import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MatchData } from '@/types/match';

export type LiveMatchStatus = 'waiting' | 'playing' | 'finished';

export interface LiveMatchState {
  id: string;
  match_data_id: string;
  mode: string;
  status: LiveMatchStatus;
  team_a_color: string | null;
  team_b_color: string | null;
  score_a: number;
  score_b: number;
  time_elapsed: number;
  winner: string | null;
}

export interface MatchEvent {
  id: string;
  live_match_id: string;
  event_type: 'goal' | 'start' | 'pause' | 'end';
  team_color: string | null;
  current_score_a: number;
  current_score_b: number;
  timestamp_minute: string;
  created_at: string;
}

export function useLiveMatch() {
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [liveMatch, setLiveMatch] = useState<LiveMatchState | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  // Bump to force full re-initialization (e.g. when match_data changes)
  const [initKey, setInitKey] = useState(0);

  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const matchDataIdRef = useRef<string | null>(null);
  const liveMatchIdRef = useRef<string | null>(null);

  const cleanupChannels = useCallback(() => {
    for (const ch of channelsRef.current) {
      supabase.removeChannel(ch);
    }
    channelsRef.current = [];
  }, []);

  // ── Main init ──
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);

      const res = await fetch('/api/match');
      const data = await res.json();
      const currentMatchData: MatchData = data.matchData;

      if (!currentMatchData || !currentMatchData.teams || currentMatchData.teams.length < 2) {
        setLoading(false);
        return;
      }
      if (cancelled) return;

      setMatchData(currentMatchData);
      matchDataIdRef.current = currentMatchData.id;

      const mode = currentMatchData.teams.length === 2 ? '2-team' : '3-team';

      // Load or create live_match
      let { data: liveData } = await supabase
        .from('live_matches')
        .select('*')
        .eq('match_data_id', currentMatchData.id)
        .single();

      if (liveData && liveData.mode !== mode) {
        console.log(`Mode mismatch: DB=${liveData.mode}, current=${mode}. Re-syncing...`);
        await supabase.from('match_events').delete().eq('live_match_id', liveData.id);
        await supabase.from('live_matches').delete().eq('id', liveData.id);
        liveData = null;
      }

      if (!liveData) {
        const { data: newLive, error } = await supabase
          .from('live_matches')
          .insert({ match_data_id: currentMatchData.id, mode, status: 'waiting' })
          .select()
          .single();
        if (error) console.error('Create live_match error:', error);
        liveData = newLive;
      }

      if (cancelled) return;
      setLiveMatch(liveData as LiveMatchState);
      liveMatchIdRef.current = liveData?.id || null;

      // Fetch events
      if (liveData) {
        const { data: eventData } = await supabase
          .from('match_events')
          .select('*')
          .eq('live_match_id', liveData.id)
          .order('created_at', { ascending: true });
        if (!cancelled && eventData) setEvents(eventData as MatchEvent[]);
      }

      if (!cancelled) setLoading(false);

      // ── Realtime subscriptions ──
      cleanupChannels();

      if (liveData && !cancelled) {
        // 1) live_match updates + event inserts
        const liveCh = supabase
          .channel(`match_${liveData.id}_${Date.now()}`)
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'live_matches',
            filter: `id=eq.${liveData.id}`,
          }, (payload) => { if (!cancelled) setLiveMatch(payload.new as LiveMatchState); })
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'match_events',
            filter: `live_match_id=eq.${liveData.id}`,
          }, (payload) => { if (!cancelled) setEvents(prev => [...prev, payload.new as MatchEvent]); })
          .subscribe();
        channelsRef.current.push(liveCh);
      }

      // 2) match_data changes → auto re-init
      if (!cancelled) {
        const mdCh = supabase
          .channel(`md_sync_${Date.now()}`)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'match_data',
          }, async () => {
            if (cancelled) return;
            console.log('🔄 match_data changed on DB');
            try {
              const r = await fetch('/api/match');
              const d = await r.json();
              const newMd: MatchData = d.matchData;
              if (!newMd) return;
              if (newMd.id !== matchDataIdRef.current) {
                console.log('🔄 New match_data detected → re-init');
                setInitKey(k => k + 1);
              } else {
                // same id but content may have changed (e.g. mode)
                const newMode = newMd.teams?.length === 2 ? '2-team' : '3-team';
                const curMode = liveData?.mode;
                if (newMode !== curMode) setInitKey(k => k + 1);
                else setMatchData(newMd);
              }
            } catch (e) { console.error('md sync failed', e); }
          })
          .subscribe();
        channelsRef.current.push(mdCh);
      }
    }

    init();
    return () => { cancelled = true; cleanupChannels(); };
  }, [initKey, cleanupChannels]);

  // ── Re-sync when page becomes visible again ──
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      console.log('👀 Page visible → syncing');

      try {
        const res = await fetch('/api/match');
        const data = await res.json();
        const freshMd: MatchData = data.matchData;

        if (freshMd && freshMd.id !== matchDataIdRef.current) {
          console.log('👀 match_data changed while away → re-init');
          setInitKey(k => k + 1);
          return;
        }

        if (liveMatchIdRef.current) {
          const { data: freshLive } = await supabase
            .from('live_matches').select('*')
            .eq('id', liveMatchIdRef.current).single();
          if (freshLive) setLiveMatch(freshLive as LiveMatchState);

          const { data: freshEv } = await supabase
            .from('match_events').select('*')
            .eq('live_match_id', liveMatchIdRef.current)
            .order('created_at', { ascending: true });
          if (freshEv) setEvents(freshEv as MatchEvent[]);
        }
      } catch (e) { console.error('visibility sync failed', e); }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // ── Actions ──
  const updateMatch = async (updates: Partial<LiveMatchState>) => {
    if (!liveMatch) return;
    setLiveMatch({ ...liveMatch, ...updates });
    await supabase.from('live_matches').update(updates).eq('id', liveMatch.id);
  };

  const addEvent = async (event: Omit<MatchEvent, 'id' | 'live_match_id' | 'created_at'>) => {
    if (!liveMatch) return;
    await supabase.from('match_events').insert({ live_match_id: liveMatch.id, ...event });
  };

  const scoreGoal = async (team_color: string, score_a: number, score_b: number, formattedTime: string) => {
    if (!liveMatch) return;
    await addEvent({ event_type: 'goal', team_color, current_score_a: score_a, current_score_b: score_b, timestamp_minute: formattedTime });
    await updateMatch({ score_a, score_b });
  };

  const clearEvents = async () => {
    if (!liveMatch) return;
    setEvents([]);
    await supabase.from('match_events').delete().eq('live_match_id', liveMatch.id);
  };

  return { matchData, liveMatch, events, loading, updateMatch, addEvent, scoreGoal, clearEvents };
}
