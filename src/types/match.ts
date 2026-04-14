export interface Player {
  name: string;
  telegramHandle?: string; // e.g. @viettien29
  playerId?: string;
}

export interface Team {
  name: string; // HOME, AWAY, EXTRA
  players: Player[];
}

export interface MatchVenue {
  date?: string;       // e.g. "12/3"
  time?: string;       // e.g. "19h15"
  venue?: string;      // e.g. "Sân số 8"
  googleMapLink?: string;
  teamConfig?: number; // e.g. 2 or 3
}

export interface MatchData {
  id: string;
  bench?: Player[];    // Players waiting to be assigned to teams
  teams: Team[];
  venue: MatchVenue;
  createdAt: string;
  updatedAt: string;
  rawMessage?: string;
}
