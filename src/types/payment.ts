export interface MatchPayment {
  id: string;
  matchDataId: string;
  fieldCost: number;      // tiền sân (VND)
  drinkCost: number;      // tiền nước (VND)
  losingTeams: LosingTeam[];
  createdAt: string;
  updatedAt: string;
}

export interface LosingTeam {
  teamName: string;       // HOME, AWAY, EXTRA
  score: number;
  drinkPercent: number;   // 100 (2-team), 70 or 30 (3-team)
}

export interface PlayerPayment {
  id: string;
  matchPaymentId: string;
  playerName: string;
  playerId: string | null;
  teamName: string;
  fieldAmount: number;    // tiền sân (VND)
  drinkAmount: number;    // tiền nước (VND)
  totalAmount: number;
  isPaid: boolean;
  paidAt: string | null;
  paymentMethod: string; // 'App' | 'QR_Bank' | 'Khác' | 'unpaid' | 'manual' | 'payos' | 'cash'
  createdAt: string;
}

export interface PaymentSummary {
  matchPayment: MatchPayment | null;
  playerPayments: PlayerPayment[];
  totalPlayers: number;
  fieldPerPerson: number;
  isReady: boolean;       // có đủ thông tin để thanh toán không
}
