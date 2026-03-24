export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type GamePhase =
  | 'waiting'
  | 'dealing_first'
  | 'bidding'
  | 'trump_selection'
  | 'dealing_second'
  | 'playing'
  | 'scoring'
  | 'finished';

export type Seat = 0 | 1 | 2 | 3;

export interface TrickCard {
  seat: Seat;
  card: Card;
}

export interface Trick {
  cards: TrickCard[];
  winner: Seat;
  points: number;
}

export interface PlayerInfo {
  seat: Seat;
  userId: string;
  displayName: string;
  team: 0 | 1;
  cardCount: number;
}

export interface PlayerView {
  phase: GamePhase;
  players: PlayerInfo[];
  myHand: Card[];
  currentBid: number;
  bidHistory: { seat: Seat; bid: number | 'pass' }[];
  highestBidSeat: Seat | null;
  highestBid: number;
  trumpSuit: Suit | null;
  trumpRevealed: boolean;
  currentTrick: TrickCard[];
  completedTricks: Trick[];
  currentLeaderSeat: Seat;
  trickCounts: [number, number];
  teamPoints: [number, number];
  roundScores: [number, number];
  currentTurnSeat: Seat;
  dealerSeat: Seat;
  mySeat: Seat;
}

export interface RoomInfo {
  id: string;
  code: string;
  name?: string;
  isPrivate: boolean;
  playerCount: number;
  players: { displayName: string; seat: number }[];
  status: 'waiting' | 'in_progress' | 'finished';
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  isGuest?: boolean;
}

export const SEAT_NAMES = ['North', 'East', 'South', 'West'] as const;
export const TEAM_NAMES = ['North-South', 'East-West'] as const;
export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};
export const SUIT_COLORS: Record<Suit, string> = {
  spades: 'text-gray-900',
  clubs: 'text-gray-900',
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
};
