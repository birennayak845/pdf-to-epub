'use client';
import { useState } from 'react';
import { Seat } from '@/lib/types';

interface BidModalProps {
  currentHighest: number;
  mySeat: Seat;
  isMyTurn: boolean;
  onBid: (bid: number | 'pass') => void;
}

export default function BidModal({ currentHighest, mySeat, isMyTurn, onBid }: BidModalProps) {
  const [bid, setBid] = useState(currentHighest + 1);
  const minBid = Math.max(16, currentHighest + 1);
  const maxBid = 28;

  if (!isMyTurn) {
    return (
      <div className="bg-white/10 rounded-2xl p-6 text-center border border-white/20">
        <div className="text-white/60 text-sm animate-pulse">Waiting for other players to bid…</div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
      <h3 className="text-white font-bold text-lg mb-4 text-center">Your Bid</h3>

      <div className="flex items-center justify-center gap-3 mb-5">
        <button
          onClick={() => setBid(b => Math.max(minBid, b - 1))}
          disabled={bid <= minBid}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold
            disabled:opacity-30 disabled:cursor-not-allowed text-xl"
        >−</button>
        <span className="text-4xl font-bold text-yellow-400 w-16 text-center">{bid}</span>
        <button
          onClick={() => setBid(b => Math.min(maxBid, b + 1))}
          disabled={bid >= maxBid}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold
            disabled:opacity-30 disabled:cursor-not-allowed text-xl"
        >+</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onBid('pass')}
          className="py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium transition-colors"
        >
          Pass
        </button>
        <button
          onClick={() => onBid(bid)}
          disabled={bid > maxBid}
          className="py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold transition-colors"
        >
          Bid {bid}
        </button>
      </div>

      {currentHighest >= 16 && (
        <p className="text-white/40 text-xs text-center mt-3">
          Current highest: {currentHighest}
        </p>
      )}
    </div>
  );
}
