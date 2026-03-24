'use client';
import { PlayerInfo, TrickCard, SEAT_NAMES, SUIT_SYMBOLS, SUIT_COLORS, Suit } from '@/lib/types';
import PlayingCard from './PlayingCard';
import clsx from 'clsx';

interface PlayerSlotProps {
  player: PlayerInfo | undefined;
  seat: 0 | 1 | 2 | 3;
  isCurrentTurn: boolean;
  isMe: boolean;
  trickCard?: TrickCard;
  trumpSuit?: Suit | null;
  trumpRevealed?: boolean;
  position: 'top' | 'left' | 'right'; // bottom is handled by the main hand
}

export default function PlayerSlot({
  player, seat, isCurrentTurn, isMe, trickCard, trumpSuit, trumpRevealed, position
}: PlayerSlotProps) {
  const SEAT_LABELS = ['N', 'E', 'S', 'W'];

  return (
    <div className={clsx(
      'flex flex-col items-center gap-2',
      position === 'left' || position === 'right' ? 'flex-row' : ''
    )}>
      {/* Trick card played by this player */}
      {trickCard ? (
        <PlayingCard card={trickCard.card} small className="animate-slide-up" />
      ) : (
        <div className="w-10 h-14 rounded-lg border-2 border-dashed border-white/20" />
      )}

      {/* Player info badge */}
      <div className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
        isCurrentTurn
          ? 'bg-yellow-400 text-green-900 shadow-lg shadow-yellow-400/30'
          : isMe
          ? 'bg-white/30 text-white'
          : 'bg-white/10 text-white/70'
      )}>
        <span className="font-mono text-[10px] opacity-70">{SEAT_LABELS[seat]}</span>
        <span className="max-w-[100px] truncate">
          {player ? (isMe ? 'You' : player.displayName) : '?'}
        </span>
        {player && (
          <span className="opacity-60">
            {'🂠'.repeat(Math.min(player.cardCount, 4))}
            {player.cardCount > 4 ? `+${player.cardCount - 4}` : ''}
          </span>
        )}
        {isCurrentTurn && <span className="animate-bounce">▶</span>}
      </div>

      {/* Trump reveal indicator */}
      {trumpSuit && trumpRevealed && isMe && (
        <div className="flex items-center gap-1 text-xs">
          <span className="text-white/50">Trump:</span>
          <span className={`text-base ${SUIT_COLORS[trumpSuit]}`}>{SUIT_SYMBOLS[trumpSuit]}</span>
        </div>
      )}
    </div>
  );
}
