'use client';
import { Card, SUIT_SYMBOLS, SUIT_COLORS } from '@/lib/types';
import clsx from 'clsx';

interface PlayingCardProps {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function PlayingCard({
  card, selected, disabled, small, faceDown, onClick, className
}: PlayingCardProps) {
  if (faceDown) {
    return (
      <div className={clsx(
        'card-back inline-block',
        small ? 'w-10 h-14' : 'w-16 h-24',
        className
      )} />
    );
  }

  const symbol = SUIT_SYMBOLS[card.suit];
  const color = SUIT_COLORS[card.suit];

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={clsx(
        'card-face inline-flex flex-col',
        small ? 'w-10 h-14 p-1 text-xs' : 'w-16 h-24 p-1.5 text-sm',
        selected && 'selected',
        disabled && 'disabled',
        !disabled && onClick && 'cursor-pointer',
        className
      )}
    >
      <div className={clsx('font-bold leading-none', color)}>{card.rank}</div>
      <div className={clsx('text-center my-auto', small ? 'text-lg' : 'text-2xl', color)}>
        {symbol}
      </div>
      <div className={clsx('font-bold leading-none self-end rotate-180', color)}>{card.rank}</div>
    </div>
  );
}
