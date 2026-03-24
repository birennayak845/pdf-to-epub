'use client';
import { Suit, SUIT_SYMBOLS, SUIT_COLORS } from '@/lib/types';

interface TrumpModalProps {
  isMyTurn: boolean;
  onSelect: (suit: Suit) => void;
}

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export default function TrumpModal({ isMyTurn, onSelect }: TrumpModalProps) {
  if (!isMyTurn) {
    return (
      <div className="bg-white/10 rounded-2xl p-6 text-center border border-white/20">
        <div className="text-white/60 text-sm animate-pulse">Waiting for bidder to select trump…</div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
      <h3 className="text-white font-bold text-lg mb-2 text-center">Select Trump Suit</h3>
      <p className="text-white/50 text-xs text-center mb-5">
        Your trump will be kept secret until first played!
      </p>
      <div className="grid grid-cols-2 gap-3">
        {SUITS.map(suit => (
          <button
            key={suit}
            onClick={() => onSelect(suit)}
            className="flex items-center justify-center gap-2 py-4 rounded-xl
              bg-white hover:bg-yellow-50 transition-colors shadow-md"
          >
            <span className={`text-3xl ${SUIT_COLORS[suit]}`}>{SUIT_SYMBOLS[suit]}</span>
            <span className={`font-bold capitalize ${SUIT_COLORS[suit]}`}>{suit}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
