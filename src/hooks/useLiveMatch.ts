import { useEffect, useState } from 'react';
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

  // 1. Lấy dữ liệu trận đấu và thiết lập Live Match
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    async function init() {
      // Fetch match_data
      const res = await fetch('/api/match');
      const data = await res.json();
      const currentMatchData: MatchData = data.matchData;
      
      if (!currentMatchData || !currentMatchData.teams || currentMatchData.teams.length < 2) {
        setLoading(false);
        return;
      }
      
      setMatchData(currentMatchData);

      const mode = currentMatchData.teams.length === 2 ? '2-team' : '3-team';

      // Load or Create live_match for this matchData
      let { data: liveData } = await supabase
        .from('live_matches')
        .select('*')
        .eq('match_data_id', currentMatchData.id)
        .single();

      // Check mode mismatch: if teams changed (2→3 or 3→2), reset live_match
      if (liveData && liveData.mode !== mode) {
        console.log(`Mode mismatch: DB=${liveData.mode}, current=${mode}. Re-syncing...`);
        // Delete old events
        await supabase.from('match_events').delete().eq('live_match_id', liveData.id);
        // Delete old live_match
        await supabase.from('live_matches').delete().eq('id', liveData.id);
        liveData = null;
      }

      if (!liveData) {
        const { data: newLive, error } = await supabase
          .from('live_matches')
          .insert({
            match_data_id: currentMatchData.id,
            mode,
            status: 'waiting',
          })
          .select()
          .single();
        
        if (error) console.error("Create live_match error:", error);
        liveData = newLive;
      }

      setLiveMatch(liveData as LiveMatchState);

      // Fetch existing events
      if (liveData) {
        const { data: eventData } = await supabase
          .from('match_events')
          .select('*')
          .eq('live_match_id', liveData.id)
          .order('created_at', { ascending: true });
        
        if (eventData) setEvents(eventData as MatchEvent[]);
      }

      setLoading(false);

      // 2. Đăng ký Realtime
      if (liveData) {
        channel = supabase.channel(`match_${liveData.id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_matches', filter: `id=eq.${liveData.id}` }, (payload) => {
            setLiveMatch(payload.new as LiveMatchState);
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_events', filter: `live_match_id=eq.${liveData.id}` }, (payload) => {
            setEvents(prev => [...prev, payload.new as MatchEvent]);
          })
          .subscribe();
      }
    }

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // 3. Các hàm tương tác
  const updateMatch = async (updates: Partial<LiveMatchState>) => {
    if (!liveMatch) return;
    // Optimistic update
    setLiveMatch({ ...liveMatch, ...updates });
    await supabase.from('live_matches').update(updates).eq('id', liveMatch.id);
  };

  const addEvent = async (event: Omit<MatchEvent, 'id' | 'live_match_id' | 'created_at'>) => {
    if (!liveMatch) return;
    await supabase.from('match_events').insert({
      live_match_id: liveMatch.id,
      ...event
    });
  };

  const scoreGoal = async (team_color: string, score_a: number, score_b: number, formattedTime: string) => {
    if (!liveMatch) return;
    
    // Tạo 1 event ghi bàn
    await addEvent({
      event_type: 'goal',
      team_color,
      current_score_a: score_a,
      current_score_b: score_b,
      timestamp_minute: formattedTime
    });

    // Cập nhật tổng tỉ số
    await updateMatch({ score_a, score_b });
  };

  const clearEvents = async () => {
    if (!liveMatch) return;
    setEvents([]); // Clear UI ngay lập tức
    await supabase.from('match_events').delete().eq('live_match_id', liveMatch.id);
  };

  return { matchData, liveMatch, events, loading, updateMatch, addEvent, scoreGoal, clearEvents };
}
