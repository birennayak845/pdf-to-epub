import { v4 as uuidv4 } from 'uuid';
import {
  Card, GameState, GamePhase, Seat, Suit, Trick, TrickCard, PlayerView
} from '../types';
import {
  createDeck, shuffleDeck, trickWinner, handPoints, cardsEqual
} from './deck';

export interface PlayerInfo {
  userId: string;
  displayName: string;
  seat: Seat;
}

const WINNING_SCORE = 6; // first team to win 6 rounds wins the match

export class Game29Engine {
  private state: GameState;

  constructor(players: PlayerInfo[]) {
    if (players.length !== 4) throw new Error('Need exactly 4 players');

    // seats already assigned (0=N,1=E,2=S,3=W); team: N+S=0, E+W=1
    this.state = {
      phase: 'waiting',
      players: players.map(p => ({
        seat: p.seat,
        userId: p.userId,
        displayName: p.displayName,
        team: (p.seat % 2 === 0 ? 0 : 1) as 0 | 1,
        cardCount: 0,
      })),
      hands: { 0: [], 1: [], 2: [], 3: [] },
      currentBid: 15,
      bidHistory: [],
      highestBidSeat: null,
      highestBid: 15,
      trumpSuit: null,
      trumpRevealed: false,
      currentTrick: [],
      completedTricks: [],
      currentLeaderSeat: 0,
      trickCounts: [0, 0],
      teamPoints: [0, 0],
      roundScores: [0, 0],
      currentTurnSeat: 0,
      dealerSeat: 0,
      passCount: 0,
    };
  }

  /** Start a fresh round / the initial game */
  startRound(dealerSeat: Seat) {
    const deck = shuffleDeck(createDeck());

    // Deal 4 cards to each player first
    const hands: Record<Seat, Card[]> = { 0: [], 1: [], 2: [], 3: [] };
    const seats: Seat[] = [0, 1, 2, 3];
    // Deal 4 cards each starting from the player after dealer
    for (let card = 0; card < 4; card++) {
      for (let offset = 1; offset <= 4; offset++) {
        const seat = ((dealerSeat + offset) % 4) as Seat;
        hands[seat].push(deck.pop()!);
      }
    }

    // Store the remaining 4 cards per player to be dealt after trump
    const remaining: Record<Seat, Card[]> = { 0: [], 1: [], 2: [], 3: [] };
    for (let card = 0; card < 4; card++) {
      for (let offset = 1; offset <= 4; offset++) {
        const seat = ((dealerSeat + offset) % 4) as Seat;
        remaining[seat].push(deck.pop()!);
      }
    }

    this.state = {
      ...this.state,
      phase: 'bidding',
      hands,
      currentBid: 15,
      bidHistory: [],
      highestBidSeat: null,
      highestBid: 15,
      trumpSuit: null,
      trumpRevealed: false,
      currentTrick: [],
      completedTricks: [],
      currentLeaderSeat: ((dealerSeat + 1) % 4) as Seat,
      trickCounts: [0, 0],
      teamPoints: [0, 0],
      currentTurnSeat: ((dealerSeat + 1) % 4) as Seat,
      dealerSeat,
      passCount: 0,
    };

    // Attach remaining cards to state (stored privately)
    (this.state as any)._remainingCards = remaining;

    // Update card counts
    this.state.players = this.state.players.map(p => ({
      ...p,
      cardCount: hands[p.seat].length,
    }));
  }

  placeBid(seat: Seat, bid: number | 'pass'): { ok: boolean; error?: string } {
    if (this.state.phase !== 'bidding') return { ok: false, error: 'Not in bidding phase' };
    if (this.state.currentTurnSeat !== seat) return { ok: false, error: 'Not your turn' };

    if (bid === 'pass') {
      this.state.bidHistory.push({ seat, bid: 'pass' });
      this.state.passCount++;
    } else {
      if (bid <= this.state.highestBid) {
        return { ok: false, error: `Bid must be higher than ${this.state.highestBid}` };
      }
      if (bid < 16 || bid > 28) {
        return { ok: false, error: 'Bid must be between 16 and 28' };
      }
      this.state.bidHistory.push({ seat, bid });
      this.state.highestBid = bid;
      this.state.highestBidSeat = seat;
      this.state.passCount = 0;
    }

    // Move to next player
    const nextSeat = ((seat + 1) % 4) as Seat;

    // Check if bidding is over: 3 passes in a row after at least one real bid,
    // OR all 4 pass on the very first round (re-deal required)
    const totalBids = this.state.bidHistory.length;
    const consecutivePasses = this.getConsecutivePasses();

    if (this.state.highestBidSeat !== null && consecutivePasses === 3) {
      // Bidding complete — move to trump selection
      this.state.phase = 'trump_selection';
      this.state.currentTurnSeat = this.state.highestBidSeat;
    } else if (totalBids === 4 && this.state.highestBidSeat === null) {
      // All 4 passed — need re-deal (treat as finished round with no result)
      this.state.phase = 'bidding';
      // Restart with next dealer
      const nextDealer = ((this.state.dealerSeat + 1) % 4) as Seat;
      this.startRound(nextDealer);
    } else {
      this.state.currentTurnSeat = nextSeat;
    }

    return { ok: true };
  }

  private getConsecutivePasses(): number {
    let count = 0;
    for (let i = this.state.bidHistory.length - 1; i >= 0; i--) {
      if (this.state.bidHistory[i].bid === 'pass') count++;
      else break;
    }
    return count;
  }

  selectTrump(seat: Seat, suit: Suit): { ok: boolean; error?: string } {
    if (this.state.phase !== 'trump_selection') return { ok: false, error: 'Not in trump selection phase' };
    if (this.state.highestBidSeat !== seat) return { ok: false, error: 'Only the highest bidder selects trump' };

    this.state.trumpSuit = suit;
    this.state.phase = 'dealing_second'; // conceptually, we "deal" second half now

    // Deal the remaining 4 cards to each player
    const remaining = (this.state as any)._remainingCards as Record<Seat, Card[]>;
    for (const s of [0, 1, 2, 3] as Seat[]) {
      this.state.hands[s] = [...this.state.hands[s], ...remaining[s]];
    }
    delete (this.state as any)._remainingCards;

    // Ready to play
    this.state.phase = 'playing';
    this.state.currentLeaderSeat = ((this.state.dealerSeat + 1) % 4) as Seat;
    this.state.currentTurnSeat = this.state.currentLeaderSeat;

    // Update card counts
    this.state.players = this.state.players.map(p => ({
      ...p,
      cardCount: this.state.hands[p.seat].length,
    }));

    return { ok: true };
  }

  playCard(seat: Seat, card: Card): { ok: boolean; error?: string; trickComplete?: boolean } {
    if (this.state.phase !== 'playing') return { ok: false, error: 'Not in playing phase' };
    if (this.state.currentTurnSeat !== seat) return { ok: false, error: 'Not your turn' };

    const hand = this.state.hands[seat];
    const cardIdx = hand.findIndex(c => cardsEqual(c, card));
    if (cardIdx === -1) return { ok: false, error: 'Card not in hand' };

    // Validate card play
    const validation = this.validateCardPlay(seat, card);
    if (!validation.ok) return validation;

    // Remove card from hand
    this.state.hands[seat] = hand.filter((_, i) => i !== cardIdx);
    this.state.players = this.state.players.map(p =>
      p.seat === seat ? { ...p, cardCount: this.state.hands[seat].length } : p
    );

    // Reveal trump if this card is trump and trump wasn't revealed
    if (!this.state.trumpRevealed && this.state.trumpSuit && card.suit === this.state.trumpSuit) {
      this.state.trumpRevealed = true;
    }

    this.state.currentTrick.push({ seat, card });

    if (this.state.currentTrick.length === 4) {
      // Trick is complete
      this.completeTrick();
      return { ok: true, trickComplete: true };
    }

    // Next player's turn
    this.state.currentTurnSeat = ((seat + 1) % 4) as Seat;
    return { ok: true };
  }

  private validateCardPlay(seat: Seat, card: Card): { ok: boolean; error?: string } {
    const hand = this.state.hands[seat];

    // If leading the trick, any card is valid
    if (this.state.currentTrick.length === 0) return { ok: true };

    const ledSuit = this.state.currentTrick[0].card.suit;

    // If player has the led suit, they must follow
    const hasLedSuit = hand.some(c => c.suit === ledSuit);
    if (hasLedSuit && card.suit !== ledSuit) {
      return { ok: false, error: `Must follow suit (${ledSuit})` };
    }

    // If trump not yet revealed, playing trump is allowed (reveals it) but only if no led suit
    // If player has neither led suit nor trump... they can play anything
    return { ok: true };
  }

  private completeTrick() {
    const trick = this.state.currentTrick;
    const ledSuit = trick[0].card.suit;

    const winnerOffset = trickWinner(
      trick.map(t => t.card),
      ledSuit,
      this.state.trumpRevealed ? this.state.trumpSuit : null
    );
    const winnerSeat = trick[winnerOffset].seat;
    const winnerTeam = (winnerSeat % 2 === 0 ? 0 : 1) as 0 | 1;
    const points = trick.reduce((sum, t) => {
      const p = t.card.rank === 'J' ? 3 : t.card.rank === '9' ? 2 : t.card.rank === 'A' ? 1 : t.card.rank === '10' ? 1 : 0;
      return sum + p;
    }, 0);

    const completedTrick: Trick = {
      cards: trick,
      winner: winnerSeat,
      points,
    };

    this.state.completedTricks.push(completedTrick);
    this.state.trickCounts[winnerTeam]++;
    this.state.teamPoints[winnerTeam] += points;
    this.state.currentTrick = [];
    this.state.currentLeaderSeat = winnerSeat;

    const totalTricks = this.state.completedTricks.length;

    if (totalTricks === 8) {
      // Last trick: +1 point to winner (making total 29)
      this.state.teamPoints[winnerTeam] += 1;
      this.endRound();
    } else {
      this.state.currentTurnSeat = winnerSeat;
    }
  }

  private endRound() {
    this.state.phase = 'scoring';
    const bid = this.state.highestBid;
    const bidSeat = this.state.highestBidSeat!;
    const bidTeam = (bidSeat % 2 === 0 ? 0 : 1) as 0 | 1;
    const opposingTeam = (bidTeam === 0 ? 1 : 0) as 0 | 1;

    const bidTeamPoints = this.state.teamPoints[bidTeam];
    const bidMade = bidTeamPoints >= bid;

    if (bidMade) {
      this.state.roundScores[bidTeam]++;
    } else {
      this.state.roundScores[bidTeam]--;
    }
    // Defending team: win if bid wasn't made
    if (!bidMade) {
      this.state.roundScores[opposingTeam]++;
    }

    // Check win condition
    if (this.state.roundScores[0] >= WINNING_SCORE || this.state.roundScores[1] >= WINNING_SCORE) {
      this.state.phase = 'finished';
    }
  }

  startNextRound(): { ok: boolean; error?: string } {
    if (this.state.phase !== 'scoring') return { ok: false, error: 'Not in scoring phase' };
    if (this.state.phase === 'finished') return { ok: false, error: 'Game over' };
    const nextDealer = ((this.state.dealerSeat + 1) % 4) as Seat;
    this.startRound(nextDealer);
    return { ok: true };
  }

  getPhase(): GamePhase { return this.state.phase; }
  getState(): GameState { return this.state; }
  isFinished(): boolean { return this.state.phase === 'finished'; }

  getWinner(): 0 | 1 | null {
    if (!this.isFinished()) return null;
    return this.state.roundScores[0] > this.state.roundScores[1] ? 0 : 1;
  }

  getRoundResult(): { bidMade: boolean; bidTeam: 0 | 1; scores: [number, number] } | null {
    if (this.state.phase !== 'scoring' && this.state.phase !== 'finished') return null;
    const bidTeam = (this.state.highestBidSeat! % 2 === 0 ? 0 : 1) as 0 | 1;
    const bidMade = this.state.teamPoints[bidTeam] >= this.state.highestBid;
    return { bidMade, bidTeam, scores: this.state.roundScores };
  }

  /** Returns the game state from a specific player's perspective */
  getPlayerView(seat: Seat): PlayerView {
    return {
      phase: this.state.phase,
      players: this.state.players,
      myHand: this.state.hands[seat],
      currentBid: this.state.currentBid,
      bidHistory: this.state.bidHistory,
      highestBidSeat: this.state.highestBidSeat,
      highestBid: this.state.highestBid,
      // Hide trump suit until revealed
      trumpSuit: this.state.trumpRevealed ? this.state.trumpSuit : null,
      trumpRevealed: this.state.trumpRevealed,
      currentTrick: this.state.currentTrick,
      completedTricks: this.state.completedTricks,
      currentLeaderSeat: this.state.currentLeaderSeat,
      trickCounts: this.state.trickCounts,
      teamPoints: this.state.teamPoints,
      roundScores: this.state.roundScores,
      currentTurnSeat: this.state.currentTurnSeat,
      dealerSeat: this.state.dealerSeat,
      mySeat: seat,
    };
  }
}
