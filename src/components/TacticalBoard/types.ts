export type PitchType = 5 | 7 | 11;
export type UserRole = 'hlv' | 'player';

export interface TacticalPlayer {
  id: string;
  number: number | string;
  name: string;
  team: 'A' | 'B';
  isGk?: boolean;
  x: number; // Percentage 0 - 100 on width
  y: number; // Percentage 0 - 100 on height
  customColor?: string;
}

export interface TacticalArrow {
  id: string;
  startX: number; // %
  startY: number; // %
  endX: number; // %
  endY: number; // %
  color: string;
}

export interface TacticalBall {
  x: number; // %
  y: number; // %
}

export interface TacticalBoardState {
  pitchType: PitchType;
  teamAColor: string; // Red default #ef4444
  teamBColor: string; // White default #ffffff or Black #111827
  gkColor: string;    // Yellow default #eab308
  teamAName: string;  // Default "Đội Red"
  teamBName: string;  // Default "Đội White"
  formationA: string; // Preset name e.g. "1-2-1", "3-2-1", "4-3-3"
  formationB: string;
  players: TacticalPlayer[];
  ball: TacticalBall;
  arrows: TacticalArrow[];
  arrowColor: string; // Active drawing arrow color
  updatedAt?: string;
}
