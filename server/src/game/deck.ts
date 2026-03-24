import { Card, Rank, Suit, RANK_ORDER, CARD_POINTS } from '../types';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function cardPoints(card: Card): number {
  return CARD_POINTS[card.rank] ?? 0;
}

export function handPoints(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + cardPoints(c), 0);
}

/** Returns positive if a > b, negative if a < b, 0 if equal (in trick context) */
export function compareCards(a: Card, b: Card, ledSuit: Suit, trumpSuit: Suit | null): number {
  const aIsTrump = trumpSuit && a.suit === trumpSuit;
  const bIsTrump = trumpSuit && b.suit === trumpSuit;
  const aIsLed = a.suit === ledSuit;
  const bIsLed = b.suit === ledSuit;

  // Trump beats non-trump
  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;

  // Among cards of the same effective suit, use rank order
  if ((aIsTrump && bIsTrump) || (aIsLed && bIsLed)) {
    return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
  }

  // Neither is trump, a is led but b is not
  if (aIsLed && !bIsLed) return 1;
  if (!aIsLed && bIsLed) return -1;

  // Both off-suit, off-trump — no winner comparison needed (first played wins by default)
  return 0;
}

export function trickWinner(
  trick: { suit: Suit; rank: Rank }[],
  ledSuit: Suit,
  trumpSuit: Suit | null
): number {
  let winnerIdx = 0;
  for (let i = 1; i < trick.length; i++) {
    if (compareCards(trick[i], trick[winnerIdx], ledSuit, trumpSuit) > 0) {
      winnerIdx = i;
    }
  }
  return winnerIdx;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}
