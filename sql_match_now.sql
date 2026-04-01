-- Bảng lưu trữ state chung của trận đấu (tỉ số, team đang đá, trạng thái)
CREATE TABLE public.live_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_data_id TEXT NOT NULL, -- Link với bảng match_data hiện tại
    mode TEXT NOT NULL, -- '2-team' hoặc '3-team'
    status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
    team_a_color TEXT,
    team_b_color TEXT,
    score_a INTEGER DEFAULT 0,
    score_b INTEGER DEFAULT 0,
    time_elapsed INTEGER DEFAULT 0, -- Thời gian đã trôi qua
    winner TEXT, -- Team nào thắng
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Bảng log các sự kiện xảy ra trong trận đấu (để hiển thị timeline ghi bàn)
CREATE TABLE public.match_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    live_match_id UUID REFERENCES public.live_matches(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'goal', 'start', 'pause', 'end'
    team_color TEXT, -- Màu của team ghi bàn (nếu event = 'goal')
    current_score_a INTEGER,
    current_score_b INTEGER,
    timestamp_minute TEXT, -- Lúc bao nhiêu phút phần mili (VD: 03:15)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Bật tính năng Realtime cho 2 bảng này
alter publication supabase_realtime add table live_matches;
alter publication supabase_realtime add table match_events;
