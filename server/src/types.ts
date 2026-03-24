export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// Card ordering in 29: J > 9 > A > 10 > K > Q > 8 > 7
export const RANK_ORDER: Rank[] = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];
export const CARD_POINTS: Partial<Record<Rank, number>> = {
  J: 3,
  '9': 2,
  A: 1,
  '10': 1,
};

export type GamePhase =
  | 'waiting'
  | 'dealing_first'  // first 4 cards dealt, bidding can start
  | 'bidding'
  | 'trump_selection' // highest bidder picks trump
  | 'dealing_second' // remaining 4 cards dealt
  | 'playing'
  | 'scoring'
  | 'finished';

export type Seat = 0 | 1 | 2 | 3; // 0=N, 1=E, 2=S, 3=W

export interface TrickCard {
  seat: Seat;
  card: Card;
}

export interface Trick {
  cards: TrickCard[];
  winner: Seat;
  points: number;
}

export interface GameState {
  phase: GamePhase;
  players: {
    seat: Seat;
    userId: string;
    displayName: string;
    team: 0 | 1; // 0=N+S, 1=E+W
    cardCount: number;
  }[];
  hands: Record<Seat, Card[]>;      // private - each player only sees their own
  currentBid: number;
  bidHistory: { seat: Seat; bid: number | 'pass' }[];
  highestBidSeat: Seat | null;
  highestBid: number;
  trumpSuit: Suit | null;
  trumpRevealed: boolean;
  currentTrick: TrickCard[];
  completedTricks: Trick[];
  currentLeaderSeat: Seat;
  trickCounts: [number, number];  // [team0, team1]
  teamPoints: [number, number];   // [team0, team1]
  roundScores: [number, number];  // accumulated game scores
  currentTurnSeat: Seat;
  dealerSeat: Seat;
  passCount: number;
}

export interface PlayerView {
  phase: GamePhase;
  players: GameState['players'];
  myHand: Card[];
  currentBid: number;
  bidHistory: GameState['bidHistory'];
  highestBidSeat: Seat | null;
  highestBid: number;
  trumpSuit: Suit | null;          // null until revealed
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

// Socket event payloads
export interface ServerToClientEvents {
  room_updated: (room: RoomInfo) => void;
  room_list: (rooms: RoomInfo[]) => void;
  game_state: (state: PlayerView) => void;
  game_started: (state: PlayerView) => void;
  game_error: (msg: string) => void;
  player_joined: (info: { displayName: string; seat: number }) => void;
  player_left: (info: { displayName: string; seat: number }) => void;
  chat_message: (msg: { from: string; text: string; timestamp: number }) => void;
  matchmaking_status: (status: 'searching' | 'found' | 'cancelled') => void;
  matchmaking_found: (roomId: string) => void;
  trick_complete: (trick: Trick, nextLeader: Seat) => void;
  round_end: (result: { bidMade: boolean; scores: [number, number] }) => void;
  game_over: (result: { winner: 0 | 1; finalScores: [number, number] }) => void;
}

export interface ClientToServerEvents {
  join_room: (data: { code: string }, cb: (res: { ok: boolean; room?: RoomInfo; error?: string }) => void) => void;
  create_room: (data: { name?: string; isPrivate?: boolean }, cb: (res: { ok: boolean; room?: RoomInfo; error?: string }) => void) => void;
  leave_room: () => void;
  start_game: (cb: (res: { ok: boolean; error?: string }) => void) => void;
  get_rooms: () => void;
  join_matchmaking: () => void;
  leave_matchmaking: () => void;
  place_bid: (data: { bid: number | 'pass' }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  select_trump: (data: { suit: Suit }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  play_card: (data: { card: Card }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  send_chat: (data: { text: string }) => void;
}
