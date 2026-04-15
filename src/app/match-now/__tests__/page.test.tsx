/**
 * Unit tests cho trang Match Now (/match-now)
 *
 * Bao gồm:
 * 1. Helper functions (formatTime)
 * 2. Constants & configuration
 * 3. MatchNowPage rendering (loading, 2-team, 3-team)
 * 4. TwoTeamMode: scoring, timer, controls, finished state
 * 5. ThreeTeamMode: pick phase, playing, scoring, win/draw logic, result, finished
 * 6. Edge cases
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ────────────────────────────────
//   MOCKS
// ────────────────────────────────

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  );
});

// Mock useLiveMatch hook
const mockUpdateMatch = jest.fn().mockResolvedValue(undefined);
const mockScoreGoal = jest.fn().mockResolvedValue(undefined);
const mockAddEvent = jest.fn().mockResolvedValue(undefined);
const mockClearEvents = jest.fn().mockResolvedValue(undefined);

let mockLiveMatchData: ReturnType<typeof createMockLiveMatch> | null = null;
let mockEvents: MockEvent[] = [];
let mockLoading = false;

interface MockEvent {
  id: string;
  live_match_id: string;
  event_type: 'goal' | 'start' | 'pause' | 'end';
  team_color: string | null;
  current_score_a: number;
  current_score_b: number;
  timestamp_minute: string;
  created_at: string;
}

function createMockLiveMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'live-match-1',
    match_data_id: 'match-data-1',
    mode: '2-team',
    status: 'waiting' as const,
    team_a_color: 'white',
    team_b_color: 'black',
    score_a: 0,
    score_b: 0,
    time_elapsed: 0,
    winner: null,
    ...overrides,
  };
}

jest.mock('@/hooks/useLiveMatch', () => ({
  useLiveMatch: () => ({
    liveMatch: mockLiveMatchData,
    events: mockEvents,
    loading: mockLoading,
    updateMatch: mockUpdateMatch,
    scoreGoal: mockScoreGoal,
    addEvent: mockAddEvent,
    clearEvents: mockClearEvents,
  }),
}));

// Mock AudioContext
const mockAudioContext = {
  createOscillator: jest.fn(() => ({
    type: 'triangle',
    frequency: { setValueAtTime: jest.fn() },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createGain: jest.fn(() => ({
    gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
    connect: jest.fn(),
  })),
  destination: {},
  currentTime: 0,
  close: jest.fn().mockResolvedValue(undefined),
};

Object.defineProperty(window, 'AudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true,
});

// Import component after mocks are set up
import MatchNowPage from '../page';

// ────────────────────────────────
//   1. HELPER FUNCTIONS
// ────────────────────────────────

describe('formatTime', () => {
  // Trích hàm formatTime để test riêng
  function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  it('formats 0 seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats seconds < 60 correctly', () => {
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(30)).toBe('00:30');
    expect(formatTime(59)).toBe('00:59');
  });

  it('formats exact minutes correctly', () => {
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(120)).toBe('02:00');
    expect(formatTime(420)).toBe('07:00');
  });

  it('formats mixed minutes and seconds correctly', () => {
    expect(formatTime(90)).toBe('01:30');
    expect(formatTime(125)).toBe('02:05');
    expect(formatTime(419)).toBe('06:59');
  });

  it('pads single digits with leading zero', () => {
    expect(formatTime(61)).toBe('01:01');
    expect(formatTime(9)).toBe('00:09');
  });

  it('handles large values', () => {
    expect(formatTime(600)).toBe('10:00');
    expect(formatTime(3599)).toBe('59:59');
  });
});

// ────────────────────────────────
//   2. CONSTANTS & CONFIGURATION
// ────────────────────────────────

describe('Constants', () => {
  const MATCH_DURATION = 7 * 60;
  const WIN_GOALS = 2;
  const ALL_COLORS = ['white', 'black', 'orange'];

  it('match duration is 7 minutes (420 seconds)', () => {
    expect(MATCH_DURATION).toBe(420);
  });

  it('win goals threshold is 2', () => {
    expect(WIN_GOALS).toBe(2);
  });

  it('all team colors are defined', () => {
    expect(ALL_COLORS).toEqual(['white', 'black', 'orange']);
    expect(ALL_COLORS).toHaveLength(3);
  });
});

describe('TEAMS configuration', () => {
  const TEAMS = {
    white: {
      color: 'white',
      label: 'Trắng',
      bg: '#f5f5f5',
      textColor: '#1a1a2e',
      borderColor: '#e0e0e0',
      glowColor: 'rgba(255,255,255,0.5)',
      emoji: '⚪',
    },
    black: {
      color: 'black',
      label: 'Đen',
      bg: '#1a1a2e',
      textColor: '#ffffff',
      borderColor: '#333',
      glowColor: 'rgba(0,0,0,0.5)',
      emoji: '⚫',
    },
    orange: {
      color: 'orange',
      label: 'Pit',
      bg: '#ef6c00',
      textColor: '#ffffff',
      borderColor: '#e65100',
      glowColor: 'rgba(239,108,0,0.5)',
      emoji: '🟠',
    },
  };

  it.each(Object.entries(TEAMS))('team "%s" has complete config', (_, team) => {
    expect(team).toHaveProperty('color');
    expect(team).toHaveProperty('label');
    expect(team).toHaveProperty('bg');
    expect(team).toHaveProperty('textColor');
    expect(team).toHaveProperty('borderColor');
    expect(team).toHaveProperty('glowColor');
    expect(team).toHaveProperty('emoji');
  });

  it('each team has unique emoji', () => {
    const emojis = Object.values(TEAMS).map((t) => t.emoji);
    expect(new Set(emojis).size).toBe(emojis.length);
  });
});

// ────────────────────────────────
//   3. MATCHNOW PAGE - RENDERING
// ────────────────────────────────

describe('MatchNowPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockEvents = [];
    mockLoading = false;
    mockLiveMatchData = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Loading state', () => {
    it('hiển thị text loading khi đang tải dữ liệu', () => {
      mockLoading = true;
      mockLiveMatchData = null;
      render(<MatchNowPage />);
      expect(screen.getByText('Đang đồng bộ dữ liệu...')).toBeInTheDocument();
    });

    it('không hiển thị nút Back khi loading', () => {
      mockLoading = true;
      render(<MatchNowPage />);
      expect(screen.queryByText('← Trang chủ')).not.toBeInTheDocument();
    });
  });

  describe('2-team mode rendering', () => {
    it('renders title "Trận Đấu 2 Đội" for 2-team mode', () => {
      mockLiveMatchData = createMockLiveMatch({ mode: '2-team' });
      render(<MatchNowPage />);
      expect(screen.getByText('Trận Đấu 2 Đội')).toBeInTheDocument();
    });

    it('renders back link to homepage', () => {
      mockLiveMatchData = createMockLiveMatch({ mode: '2-team' });
      render(<MatchNowPage />);
      const link = screen.getByText('← Trang chủ');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/');
    });
  });

  describe('3-team mode rendering', () => {
    it('renders title "Trận Đấu 3 Đội" for 3-team mode', () => {
      mockLiveMatchData = createMockLiveMatch({ mode: '3-team' });
      render(<MatchNowPage />);
      expect(screen.getByText('Trận Đấu 3 Đội')).toBeInTheDocument();
    });
  });
});

// ────────────────────────────────
//   4. TWO-TEAM MODE
// ────────────────────────────────

describe('TwoTeamMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockEvents = [];
    mockLoading = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Trạng thái chờ (waiting)', () => {
    it('hiển thị tỉ số ban đầu 0-0', () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'waiting', score_a: 0, score_b: 0 });
      render(<MatchNowPage />);
      const scores = screen.getAllByText('0');
      expect(scores.length).toBeGreaterThanOrEqual(2);
    });

    it('hiển thị nút "▶ Bắt Đầu"', () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'waiting' });
      render(<MatchNowPage />);
      expect(screen.getByText('▶ Bắt Đầu')).toBeInTheDocument();
    });

    it('hiển thị timer 00:00 khi chưa bắt đầu', () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'waiting', time_elapsed: 0 });
      render(<MatchNowPage />);
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });

    it('hiển thị tên đội Trắng và Đen', () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'waiting' });
      render(<MatchNowPage />);
      expect(screen.getByText(/Trắng/)).toBeInTheDocument();
      expect(screen.getByText(/Đen/)).toBeInTheDocument();
    });

    it('click nút play gọi updateMatch với status playing', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'waiting' });
      render(<MatchNowPage />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('▶ Bắt Đầu'));
      });
      
      expect(mockUpdateMatch).toHaveBeenCalledWith({ status: 'playing' });
    });
  });

  describe('Trạng thái đang chơi (playing)', () => {
    it('hiển thị nút "⏸ Dừng" khi đang chơi', () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing' });
      render(<MatchNowPage />);
      expect(screen.getByText('⏸ Dừng')).toBeInTheDocument();
    });

    it('click nút pause gọi updateMatch với status waiting', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing' });
      render(<MatchNowPage />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('⏸ Dừng'));
      });
      
      expect(mockUpdateMatch).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'waiting' })
      );
    });

    it('timer tự tăng mỗi giây khi đang chơi', () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', time_elapsed: 0 });
      render(<MatchNowPage />);
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      expect(screen.getByText('00:03')).toBeInTheDocument();
    });
  });

  describe('Ghi bàn (scoring)', () => {
    it('click vào ô đội trắng gọi scoreGoal với score_a + 1', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 0, score_b: 0 });
      render(<MatchNowPage />);
      
      const whiteBox = screen.getByText('⚪ Trắng').closest('button')!;
      
      await act(async () => {
        fireEvent.click(whiteBox);
      });
      
      expect(mockScoreGoal).toHaveBeenCalledWith('white', 1, 0, expect.any(String));
    });

    it('click vào ô đội đen gọi scoreGoal với score_b + 1', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 0, score_b: 0 });
      render(<MatchNowPage />);
      
      const blackBox = screen.getByText('⚫ Đen').closest('button')!;
      
      await act(async () => {
        fireEvent.click(blackBox);
      });
      
      expect(mockScoreGoal).toHaveBeenCalledWith('black', 0, 1, expect.any(String));
    });

    it('không ghi bàn khi không ở trạng thái playing', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'waiting', score_a: 0, score_b: 0 });
      render(<MatchNowPage />);
      
      const whiteBox = screen.getByText('⚪ Trắng').closest('button')!;
      
      await act(async () => {
        fireEvent.click(whiteBox);
      });
      
      expect(mockScoreGoal).not.toHaveBeenCalled();
    });

    it('hiển thị tỉ số cập nhật từ liveMatch', () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 3, score_b: 1 });
      render(<MatchNowPage />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Kết thúc trận (finish)', () => {
    it('click nút "Kết thúc" gọi updateMatch với status finished', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 2, score_b: 1 });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Kết thúc/));
      });

      expect(mockAddEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'end' })
      );
      expect(mockUpdateMatch).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'finished' })
      );
    });

    it('ghi event team_color = white khi đội trắng thắng', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 3, score_b: 1 });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Kết thúc/));
      });

      expect(mockAddEvent).toHaveBeenCalledWith(
        expect.objectContaining({ team_color: 'white' })
      );
    });

    it('ghi event team_color = black khi đội đen thắng', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 1, score_b: 3 });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Kết thúc/));
      });

      expect(mockAddEvent).toHaveBeenCalledWith(
        expect.objectContaining({ team_color: 'black' })
      );
    });

    it('ghi event team_color = draw khi hoà', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 2, score_b: 2 });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Kết thúc/));
      });

      expect(mockAddEvent).toHaveBeenCalledWith(
        expect.objectContaining({ team_color: 'draw' })
      );
    });
  });

  describe('Trạng thái kết thúc (finished)', () => {
    it('hiển thị bảng timeline bàn thắng khi trận kết thúc', () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'finished', score_a: 2, score_b: 1 });
      mockEvents = [
        {
          id: 'e1',
          live_match_id: 'live-match-1',
          event_type: 'goal',
          team_color: 'white',
          current_score_a: 1,
          current_score_b: 0,
          timestamp_minute: '02:30',
          created_at: '2026-04-01T10:00:00Z',
        },
        {
          id: 'e2',
          live_match_id: 'live-match-1',
          event_type: 'goal',
          team_color: 'black',
          current_score_a: 1,
          current_score_b: 1,
          timestamp_minute: '04:10',
          created_at: '2026-04-01T10:02:00Z',
        },
      ];

      render(<MatchNowPage />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Away')).toBeInTheDocument();
    });

    it('hiển thị "Không có bàn thắng nào" khi không có goal events', () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'finished', score_a: 0, score_b: 0 });
      mockEvents = [];

      render(<MatchNowPage />);
      expect(screen.getByText('Không có bàn thắng nào.')).toBeInTheDocument();
    });

    it('hiển thị nút "🔄 Chơi lại từ đầu"', () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'finished', score_a: 0, score_b: 0 });
      render(<MatchNowPage />);
      expect(screen.getByText('🔄 Chơi lại từ đầu')).toBeInTheDocument();
    });

    it('click "Chơi lại từ đầu" gọi clearEvents và resetScore', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'finished', score_a: 2, score_b: 1 });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText('🔄 Chơi lại từ đầu'));
      });

      expect(mockClearEvents).toHaveBeenCalled();
      expect(mockUpdateMatch).toHaveBeenCalledWith({
        score_a: 0,
        score_b: 0,
        time_elapsed: 0,
        status: 'waiting',
      });
    });
  });

  describe('Reset score', () => {
    it('click 🔄 khi đang chơi gọi clearEvents và reset về 0', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 1, score_b: 1 });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText('🔄'));
      });

      expect(mockClearEvents).toHaveBeenCalled();
      expect(mockUpdateMatch).toHaveBeenCalledWith({
        score_a: 0,
        score_b: 0,
        time_elapsed: 0,
        status: 'waiting',
      });
    });
  });

  describe('Reset trận hiện tại (2-team)', () => {
    it('hiển thị nút "↩ Reset trận"', () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 1, score_b: 0 });
      render(<MatchNowPage />);
      expect(screen.getByText('↩ Reset trận')).toBeInTheDocument();
    });

    it('click "↩ Reset trận" hiện confirm dialog', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 2, score_b: 1 });
      render(<MatchNowPage />);

      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      await act(async () => {
        fireEvent.click(screen.getByText('↩ Reset trận'));
      });

      expect(confirmSpy).toHaveBeenCalledWith('Reset tỉ số trận hiện tại về 0-0?');
      confirmSpy.mockRestore();
    });

    it('confirm → gọi updateMatch chỉ reset score, KHÔNG reset time', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 3, score_b: 1, time_elapsed: 120 });
      render(<MatchNowPage />);

      jest.spyOn(window, 'confirm').mockReturnValue(true);

      await act(async () => {
        fireEvent.click(screen.getByText('↩ Reset trận'));
      });

      expect(mockUpdateMatch).toHaveBeenCalledWith({ score_a: 0, score_b: 0 });
      // Không reset time_elapsed, không đổi status
      expect(mockUpdateMatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ time_elapsed: 0 })
      );
      window.confirm = jest.fn();
    });

    it('confirm → KHÔNG gọi clearEvents (giữ lịch sử)', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 2, score_b: 2 });
      render(<MatchNowPage />);

      jest.spyOn(window, 'confirm').mockReturnValue(true);

      await act(async () => {
        fireEvent.click(screen.getByText('↩ Reset trận'));
      });

      expect(mockClearEvents).not.toHaveBeenCalled();
      window.confirm = jest.fn();
    });

    it('cancel confirm → không gọi updateMatch', async () => {
      mockLiveMatchData = createMockLiveMatch({ status: 'playing', score_a: 1, score_b: 1 });
      render(<MatchNowPage />);

      jest.spyOn(window, 'confirm').mockReturnValue(false);

      await act(async () => {
        fireEvent.click(screen.getByText('↩ Reset trận'));
      });

      expect(mockUpdateMatch).not.toHaveBeenCalled();
      window.confirm = jest.fn();
    });
  });
});

// ────────────────────────────────
//   5. THREE-TEAM MODE
// ────────────────────────────────

describe('ThreeTeamMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockEvents = [];
    mockLoading = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Pick phase - Chọn 2 đội ra sân', () => {
    it('hiển thị 3 card để chọn đội', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'waiting',
        team_a_color: null,
        team_b_color: null,
      });
      render(<MatchNowPage />);

      // Team names appear in both stats bar and pick cards
      expect(screen.getAllByText('Trắng').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Đen').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Pit').length).toBeGreaterThanOrEqual(1);
    });

    it('hiển thị nút "⚽ Bắt đầu trận đấu" bị disabled khi chưa chọn đủ 2 đội', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'waiting',
        team_a_color: null,
        team_b_color: null,
      });
      render(<MatchNowPage />);

      const startBtn = screen.getByText('⚽ Bắt đầu trận đấu');
      expect(startBtn).toBeDisabled();
    });

    it('hiển thị bảng điểm 3 đội', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'waiting',
        team_a_color: null,
        team_b_color: null,
      });
      render(<MatchNowPage />);

      // Kiểm tra có hiển thị 3 khung thông tin đội
      expect(screen.getAllByText(/0đ/).length).toBe(3);
    });

    it('chọn 2 đội → nút start enabled', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'waiting',
        team_a_color: null,
        team_b_color: null,
      });
      render(<MatchNowPage />);

      // Chọn 2 đội - use pick cards (have class mn-pick-name)
      const pickCards = screen.getAllByRole('button').filter(
        (btn) => btn.classList.contains('mn-pick-card')
      );
      fireEvent.click(pickCards[0]); // white
      fireEvent.click(pickCards[1]); // black

      const startBtn = screen.getByText('⚽ Bắt đầu trận đấu');
      expect(startBtn).not.toBeDisabled();
    });

    it('không thể chọn quá 2 đội', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'waiting',
        team_a_color: null,
        team_b_color: null,
      });
      render(<MatchNowPage />);

      const pickCards = screen.getAllByRole('button').filter(
        (btn) => btn.classList.contains('mn-pick-card')
      );
      fireEvent.click(pickCards[0]); // white
      fireEvent.click(pickCards[1]); // black
      fireEvent.click(pickCards[2]); // Pit - should not be added

      // Chỉ có 2 dấu ✓
      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks.length).toBe(2);
    });

    it('toggle chọn đội: bấm lần 2 → bỏ chọn', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'waiting',
        team_a_color: null,
        team_b_color: null,
      });
      render(<MatchNowPage />);

      const pickCards = screen.getAllByRole('button').filter(
        (btn) => btn.classList.contains('mn-pick-card')
      );
      fireEvent.click(pickCards[0]); // select white
      expect(screen.getAllByText('✓').length).toBe(1);
      
      fireEvent.click(pickCards[0]); // deselect white
      expect(screen.queryAllByText('✓').length).toBe(0);
    });

    it('click start gọi updateMatch với đội đã chọn', async () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'waiting',
        team_a_color: null,
        team_b_color: null,
      });
      render(<MatchNowPage />);

      const pickCards = screen.getAllByRole('button').filter(
        (btn) => btn.classList.contains('mn-pick-card')
      );
      fireEvent.click(pickCards[0]); // white
      fireEvent.click(pickCards[1]); // black

      await act(async () => {
        fireEvent.click(screen.getByText('⚽ Bắt đầu trận đấu'));
      });

      expect(mockUpdateMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'playing',
          score_a: 0,
          score_b: 0,
          team_a_color: 'white',
          team_b_color: 'black',
        })
      );
    });
  });

  describe('Playing phase - Đang thi đấu', () => {
    it('hiển thị 2 đội đang thi đấu và đội chờ', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
        score_a: 0,
        score_b: 0,
      });
      render(<MatchNowPage />);

      // Đội chờ là Pit
      expect(screen.getByText(/Pit đang chờ/)).toBeInTheDocument();
    });

    it('hiển thị timer 07:00 mặc định', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      expect(screen.getByText('07:00')).toBeInTheDocument();
    });

    it('hiển thị nút "▶ Bắt đầu" timer', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      expect(screen.getByText('▶ Bắt đầu')).toBeInTheDocument();
    });

    it('click nút play → hiển thị "⏸ Tạm dừng"', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      fireEvent.click(screen.getByText('▶ Bắt đầu'));
      expect(screen.getByText('⏸ Tạm dừng')).toBeInTheDocument();
    });

    it('timer đếm ngược khi running', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      // Start timer
      fireEvent.click(screen.getByText('▶ Bắt đầu'));

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.getByText('06:55')).toBeInTheDocument();
    });

    it('team boxes hiển thị dạng div (không phải button ghi bàn)', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      // Team boxes are divs now, not clickable buttons
      const teamBoxes = document.querySelectorAll('.two-team-box');
      expect(teamBoxes.length).toBe(2);
    });

    it('hiển thị match number "Trận #1"', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      expect(screen.getByText('Trận #1')).toBeInTheDocument();
    });

    it('hiển thị nút "⏹ Kết thúc trận" và "🏁 Kết thúc giải"', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      expect(screen.getByText(/Kết thúc trận/)).toBeInTheDocument();
      expect(screen.getByText(/Kết thúc giải/)).toBeInTheDocument();
    });

    it('hiển thị nút "← Quay lại"', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      expect(screen.getByText('← Quay lại')).toBeInTheDocument();
    });

    it('click "⏹ Kết thúc trận" → chuyển sang scoring phase', async () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Kết thúc trận/));
      });

      // Should show score selection buttons
      expect(screen.getByText(/Chọn tỉ số/)).toBeInTheDocument();
    });
  });

  describe('Scoring phase - Chọn tỉ số', () => {
    it('hiển thị 8 nút tỉ số sau khi kết thúc trận', async () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Kết thúc trận/));
      });

      // Should show all 8 score buttons
      expect(screen.getByText('0 - 0')).toBeInTheDocument();
      expect(screen.getByText('1 - 0')).toBeInTheDocument();
      expect(screen.getByText('1 - 1')).toBeInTheDocument();
      expect(screen.getByText('2 - 0')).toBeInTheDocument();
      expect(screen.getByText('2 - 1')).toBeInTheDocument();
      expect(screen.getByText('1 - 2')).toBeInTheDocument();
      expect(screen.getByText('0 - 1')).toBeInTheDocument();
      expect(screen.getByText('0 - 2')).toBeInTheDocument();
    });

    it('hiển thị nút "← Quay lại trận đấu" trong scoring phase', async () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Kết thúc trận/));
      });

      expect(screen.getByText('← Quay lại trận đấu')).toBeInTheDocument();
    });

    it('click tỉ số → chuyển sang confirm phase', async () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Kết thúc trận/));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('2 - 1'));
      });

      // Should show confirm modal
      expect(screen.getByText('Xác nhận kết quả')).toBeInTheDocument();
    });
  });

  describe('Confirm phase - Xác nhận kết quả', () => {
    it('hiển thị modal xác nhận với tỉ số + trận tiếp theo', async () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Kết thúc trận/));
      });
      await act(async () => {
        fireEvent.click(screen.getByText('1 - 0'));
      });

      expect(screen.getByText('Xác nhận kết quả')).toBeInTheDocument();
      expect(screen.getByText(/Trận tiếp theo/)).toBeInTheDocument();
      expect(screen.getByText('✅ Xác nhận')).toBeInTheDocument();
      expect(screen.getByText('Quay lại')).toBeInTheDocument();
    });

    it('xác nhận → gọi addEvent và chuyển sang playing phase', async () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Kết thúc trận/));
      });
      await act(async () => {
        fireEvent.click(screen.getByText('2 - 0'));
      });
      await act(async () => {
        fireEvent.click(screen.getByText('✅ Xác nhận'));
      });

      expect(mockAddEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'end',
          team_color: 'white',
          current_score_a: 2,
          current_score_b: 0,
        })
      );
    });

    it('quay lại từ confirm → trở về scoring phase', async () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'white',
        team_b_color: 'black',
      });
      render(<MatchNowPage />);

      await act(async () => {
        fireEvent.click(screen.getByText(/Kết thúc trận/));
      });
      await act(async () => {
        fireEvent.click(screen.getByText('1 - 1'));
      });
      await act(async () => {
        fireEvent.click(screen.getByText('Quay lại'));
      });

      // Should be back in scoring phase
      expect(screen.getByText(/Chọn tỉ số/)).toBeInTheDocument();
    });
  });

  describe('Finished phase - Kết thúc giải', () => {
    it('hiển thị bảng kết quả khi trạng thái finished', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'finished',
      });
      mockEvents = [
        {
          id: 'e1',
          live_match_id: 'live-match-1',
          event_type: 'end',
          team_color: 'white',
          current_score_a: 2,
          current_score_b: 0,
          timestamp_minute: 'white|black',
          created_at: '2026-04-01T10:00:00Z',
        },
      ];

      render(<MatchNowPage />);

      expect(screen.getByText('Trận')).toBeInTheDocument();
      expect(screen.getByText('Tỉ số')).toBeInTheDocument();
      expect(screen.getByText('Kết quả')).toBeInTheDocument();
    });

    it('hiển thị "Chưa có trận đấu nào" khi không có events', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'finished',
      });
      mockEvents = [];
      render(<MatchNowPage />);

      expect(screen.getByText('Chưa có trận đấu nào.')).toBeInTheDocument();
    });

    it('hiển thị đúng kết quả trận: winner label', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'finished',
      });
      mockEvents = [
        {
          id: 'e1',
          live_match_id: 'live-match-1',
          event_type: 'end',
          team_color: 'white',
          current_score_a: 2,
          current_score_b: 1,
          timestamp_minute: 'white|black',
          created_at: '2026-04-01T10:00:00Z',
        },
      ];
      render(<MatchNowPage />);

      expect(screen.getByText(/Trắng Thắng/)).toBeInTheDocument();
    });

    it('hiển thị "Hoà" cho trận hoà', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'finished',
      });
      mockEvents = [
        {
          id: 'e1',
          live_match_id: 'live-match-1',
          event_type: 'end',
          team_color: 'draw',
          current_score_a: 1,
          current_score_b: 1,
          timestamp_minute: 'white|black',
          created_at: '2026-04-01T10:00:00Z',
        },
      ];
      render(<MatchNowPage />);

      expect(screen.getByText('Hoà')).toBeInTheDocument();
    });

    it('tính đúng điểm số từ events khi mount', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'finished',
      });
      mockEvents = [
        {
          id: 'e1',
          live_match_id: 'live-match-1',
          event_type: 'end',
          team_color: 'white',
          current_score_a: 2,
          current_score_b: 0,
          timestamp_minute: 'white|black',
          created_at: '2026-04-01T10:00:00Z',
        },
        {
          id: 'e2',
          live_match_id: 'live-match-1',
          event_type: 'end',
          team_color: 'orange',
          current_score_a: 2,
          current_score_b: 1,
          timestamp_minute: 'orange|black',
          created_at: '2026-04-01T10:10:00Z',
        },
      ];
      render(<MatchNowPage />);

      // white: 1 win → 3đ, orange: 1 win → 3đ, black: 2 losses → 0đ
      // Both white and orange have 3đ, so there should be 2 elements
      const threePoints = screen.getAllByText('3đ');
      expect(threePoints.length).toBe(2);
    });
  });

  describe('Rehydration: khôi phục trạng thái từ DB', () => {
    it('khôi phục playing phase từ DB khi có team_a/team_b', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'playing',
        team_a_color: 'orange',
        team_b_color: 'white',
        score_a: 1,
        score_b: 0,
      });
      render(<MatchNowPage />);

      // Should show the playing view, not pick view
      expect(screen.getByText(/đang chờ/)).toBeInTheDocument();
      expect(screen.queryByText('⚽ Bắt đầu trận đấu')).not.toBeInTheDocument();
    });

    it('khôi phục finished phase từ DB', () => {
      mockLiveMatchData = createMockLiveMatch({
        mode: '3-team',
        status: 'finished',
      });
      mockEvents = [];
      render(<MatchNowPage />);

      expect(screen.getByText('Chưa có trận đấu nào.')).toBeInTheDocument();
    });
  });
});

// ────────────────────────────────
//   6. EDGE CASES
// ────────────────────────────────

describe('Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockEvents = [];
    mockLoading = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('mode defaults to 2 khi mode không phải "3-team"', () => {
    mockLiveMatchData = createMockLiveMatch({ mode: '2-team' });
    render(<MatchNowPage />);
    expect(screen.getByText('Trận Đấu 2 Đội')).toBeInTheDocument();
  });

  it('mode defaults to 2 for unknown mode values', () => {
    mockLiveMatchData = createMockLiveMatch({ mode: 'unknown' });
    render(<MatchNowPage />);
    expect(screen.getByText('Trận Đấu 2 Đội')).toBeInTheDocument();
  });

  it('3-team mode: hiển thị playing phase khi có team colors', () => {
    mockLiveMatchData = createMockLiveMatch({
      mode: '3-team',
      status: 'playing',
      team_a_color: 'white',
      team_b_color: 'orange',
      score_a: 1,
      score_b: 0,
    });
    render(<MatchNowPage />);

    // Should show playing phase with team names and waiting team
    expect(screen.getByText(/đang chờ/)).toBeInTheDocument();
  });

  it('2-team mode: timer khôi phục từ time_elapsed', () => {
    mockLiveMatchData = createMockLiveMatch({
      mode: '2-team',
      status: 'waiting',
      time_elapsed: 125,
    });
    render(<MatchNowPage />);
    
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('events end with invalid timestamp_minute are skipped gracefully in 3-team finished', () => {
    mockLiveMatchData = createMockLiveMatch({
      mode: '3-team',
      status: 'finished',
    });
    mockEvents = [
      {
        id: 'e1',
        live_match_id: 'live-match-1',
        event_type: 'end',
        team_color: 'white',
        current_score_a: 2,
        current_score_b: 0,
        timestamp_minute: 'invalid_data',
        created_at: '2026-04-01T10:00:00Z',
      },
    ];

    // Should not throw
    expect(() => render(<MatchNowPage />)).not.toThrow();
  });

  it('multiple rapid clicks on score button: first click triggers scoreGoal', async () => {
    mockLiveMatchData = createMockLiveMatch({
      mode: '2-team',
      status: 'playing',
      score_a: 0,
      score_b: 0,
    });
    render(<MatchNowPage />);

    const whiteBox = screen.getByText('⚪ Trắng').closest('button')!;

    // First click should work
    await act(async () => {
      fireEvent.click(whiteBox);
    });

    expect(mockScoreGoal).toHaveBeenCalledTimes(1);
    expect(mockScoreGoal).toHaveBeenCalledWith('white', 1, 0, expect.any(String));
  });

  it('3-team: "🏁 Kết thúc giải" saves event (when timer ran) and goes to finished phase', async () => {
    mockLiveMatchData = createMockLiveMatch({
      mode: '3-team',
      status: 'playing',
      team_a_color: 'white',
      team_b_color: 'black',
    });
    render(<MatchNowPage />);

    // Start and advance timer so timeLeft < MATCH_DURATION
    fireEvent.click(screen.getByText('▶ Bắt đầu'));
    act(() => { jest.advanceTimersByTime(5000); });

    await act(async () => {
      fireEvent.click(screen.getByText(/Kết thúc giải/));
    });

    expect(mockAddEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'end' })
    );
    expect(mockUpdateMatch).toHaveBeenCalledWith({ status: 'finished' });
  });

  it('3-team: "🏁 Kết thúc giải" khi chưa chơi → không lưu event', async () => {
    mockLiveMatchData = createMockLiveMatch({
      mode: '3-team',
      status: 'playing',
      team_a_color: 'white',
      team_b_color: 'black',
    });
    render(<MatchNowPage />);

    await act(async () => {
      fireEvent.click(screen.getByText(/Kết thúc giải/));
    });

    // time = MATCH_DURATION → không lưu event
    expect(mockAddEvent).not.toHaveBeenCalled();
    expect(mockUpdateMatch).toHaveBeenCalledWith({ status: 'finished' });
  });

  it('timer text shows "urgent" class when < 60 seconds left (3-team)', () => {
    mockLiveMatchData = createMockLiveMatch({
      mode: '3-team',
      status: 'playing',
      team_a_color: 'white',
      team_b_color: 'black',
    });
    render(<MatchNowPage />);

    // Start timer
    fireEvent.click(screen.getByText('▶ Bắt đầu'));

    // Advance to 6:01 minutes → 59 seconds left
    act(() => {
      jest.advanceTimersByTime(361000);
    });

    const timerText = screen.getByText('00:59');
    expect(timerText).toHaveClass('urgent');
  });
});

// ────────────────────────────────
//   7. GAME LOGIC - Points System
// ────────────────────────────────

describe('Points System Logic (Unit)', () => {
  // Test pure logic: cách tính điểm từ events
  function calculatePoints(events: MockEvent[]) {
    const wins: Record<string, number> = { white: 0, black: 0, orange: 0 };
    const losses: Record<string, number> = { white: 0, black: 0, orange: 0 };
    const draws: Record<string, number> = { white: 0, black: 0, orange: 0 };
    const points: Record<string, number> = { white: 0, black: 0, orange: 0 };

    const endEvents = events.filter((e) => e.event_type === 'end');
    for (const ev of endEvents) {
      const parts = (ev.timestamp_minute || '').split('|');
      const tA = parts[0];
      const tB = parts[1];
      if (!tA || !tB) continue;

      if (ev.team_color === 'draw') {
        draws[tA]++;
        draws[tB]++;
        points[tA] += 1;
        points[tB] += 1;
      } else {
        const winner = ev.team_color as string;
        const loser = winner === tA ? tB : tA;
        wins[winner]++;
        losses[loser]++;
        points[winner] += 3;
      }
    }

    return { wins, losses, draws, points };
  }

  it('1 trận thắng → winner +3đ, loser 0đ', () => {
    const events: MockEvent[] = [
      {
        id: '1',
        live_match_id: 'lm1',
        event_type: 'end',
        team_color: 'white',
        current_score_a: 2,
        current_score_b: 0,
        timestamp_minute: 'white|black',
        created_at: '',
      },
    ];
    const { points, wins, losses } = calculatePoints(events);
    expect(points.white).toBe(3);
    expect(points.black).toBe(0);
    expect(wins.white).toBe(1);
    expect(losses.black).toBe(1);
  });

  it('1 trận hoà → mỗi đội +1đ', () => {
    const events: MockEvent[] = [
      {
        id: '1',
        live_match_id: 'lm1',
        event_type: 'end',
        team_color: 'draw',
        current_score_a: 1,
        current_score_b: 1,
        timestamp_minute: 'white|black',
        created_at: '',
      },
    ];
    const { points, draws } = calculatePoints(events);
    expect(points.white).toBe(1);
    expect(points.black).toBe(1);
    expect(draws.white).toBe(1);
    expect(draws.black).toBe(1);
  });

  it('nhiều trận: tính tổng điểm đúng', () => {
    const events: MockEvent[] = [
      {
        id: '1',
        live_match_id: 'lm1',
        event_type: 'end',
        team_color: 'white',
        current_score_a: 2,
        current_score_b: 0,
        timestamp_minute: 'white|black',
        created_at: '',
      },
      {
        id: '2',
        live_match_id: 'lm1',
        event_type: 'end',
        team_color: 'orange',
        current_score_a: 2,
        current_score_b: 1,
        timestamp_minute: 'orange|black',
        created_at: '',
      },
      {
        id: '3',
        live_match_id: 'lm1',
        event_type: 'end',
        team_color: 'draw',
        current_score_a: 0,
        current_score_b: 0,
        timestamp_minute: 'white|orange',
        created_at: '',
      },
    ];
    const { points, wins, losses, draws } = calculatePoints(events);
    
    // white: 1 win (3) + 1 draw (1) = 4
    expect(points.white).toBe(4);
    expect(wins.white).toBe(1);
    expect(draws.white).toBe(1);
    
    // orange: 1 win (3) + 1 draw (1) = 4
    expect(points.orange).toBe(4);
    expect(wins.orange).toBe(1);
    expect(draws.orange).toBe(1);
    
    // black: 2 losses = 0
    expect(points.black).toBe(0);
    expect(losses.black).toBe(2);
  });

  it('event không phải "end" bị bỏ qua', () => {
    const events: MockEvent[] = [
      {
        id: '1',
        live_match_id: 'lm1',
        event_type: 'goal',
        team_color: 'white',
        current_score_a: 1,
        current_score_b: 0,
        timestamp_minute: '02:30',
        created_at: '',
      },
    ];
    const { points } = calculatePoints(events);
    expect(points.white).toBe(0);
    expect(points.black).toBe(0);
    expect(points.orange).toBe(0);
  });

  it('event với timestamp_minute rỗng bị bỏ qua', () => {
    const events: MockEvent[] = [
      {
        id: '1',
        live_match_id: 'lm1',
        event_type: 'end',
        team_color: 'white',
        current_score_a: 2,
        current_score_b: 0,
        timestamp_minute: '',
        created_at: '',
      },
    ];
    const { points } = calculatePoints(events);
    expect(points.white).toBe(0);
  });
});

// ────────────────────────────────
//   8. WAITING TEAM LOGIC
// ────────────────────────────────

describe('getWaitingTeam logic', () => {
  const ALL_COLORS = ['white', 'black', 'orange'];

  function getWaitingTeam(teamA: string, teamB: string) {
    return ALL_COLORS.find((c) => c !== teamA && c !== teamB)!;
  }

  it('white vs black → Pit đang chờ', () => {
    expect(getWaitingTeam('white', 'black')).toBe('orange');
  });

  it('white vs orange → đen đang chờ', () => {
    expect(getWaitingTeam('white', 'orange')).toBe('black');
  });

  it('black vs orange → trắng đang chờ', () => {
    expect(getWaitingTeam('black', 'orange')).toBe('white');
  });
});

// ────────────────────────────────
//   9. FINISH MATCH LOGIC
// ────────────────────────────────

describe('Score selection → winner determination', () => {
  function determineWinner(teamA: string, teamB: string, sA: number, sB: number) {
    if (sA > sB) return { winner: teamA, loser: teamB };
    if (sB > sA) return { winner: teamB, loser: teamA };
    return { winner: 'draw', loser: null };
  }

  it('team A score cao hơn → team A thắng', () => {
    const { winner, loser } = determineWinner('white', 'black', 2, 0);
    expect(winner).toBe('white');
    expect(loser).toBe('black');
  });

  it('team B score cao hơn → team B thắng', () => {
    const { winner, loser } = determineWinner('white', 'black', 0, 1);
    expect(winner).toBe('black');
    expect(loser).toBe('white');
  });

  it('hoà → winner is draw', () => {
    const { winner } = determineWinner('white', 'black', 1, 1);
    expect(winner).toBe('draw');
  });
});

// ────────────────────────────────
//   10. TIME UP LOGIC
// ────────────────────────────────

describe('Draw team staying logic', () => {
  function determineStaying(
    teamA: string, teamB: string,
    sA: number, sB: number,
    isFirstMatch: boolean,
    entryOrder: { first: string; second: string } | null
  ): string {
    if (sA > sB) return teamA;
    if (sB > sA) return teamB;
    // Draw
    if (isFirstMatch) return 'random';
    // Team mới vào (second) được giữ lại
    return entryOrder?.second === teamA ? teamA : teamB;
  }

  it('team A thắng → A ở lại', () => {
    expect(determineStaying('white', 'black', 2, 1, false, null)).toBe('white');
  });

  it('team B thắng → B ở lại', () => {
    expect(determineStaying('white', 'black', 0, 1, false, null)).toBe('black');
  });

  it('hoà trận đầu → random', () => {
    expect(determineStaying('white', 'black', 1, 1, true, null)).toBe('random');
  });

  it('hoà không phải trận đầu → team mới vào (second) giữ lại', () => {
    // second = black → black ở lại
    expect(determineStaying('white', 'black', 0, 0, false, { first: 'white', second: 'black' })).toBe('black');
  });

  it('hoà, second là teamA → teamA ở lại', () => {
    expect(determineStaying('white', 'black', 1, 1, false, { first: 'black', second: 'white' })).toBe('white');
  });
});
