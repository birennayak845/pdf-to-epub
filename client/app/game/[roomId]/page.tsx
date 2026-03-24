'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore, useGameStore } from '@/lib/store';
import { connectSocket, getSocket } from '@/lib/socket';
import { useSocketEvents } from '@/lib/useSocketEvents';
import { Card, Suit, PlayerView, SUIT_SYMBOLS, SUIT_COLORS, TEAM_NAMES } from '@/lib/types';
import PlayingCard from '@/components/PlayingCard';
import BidModal from '@/components/BidModal';
import TrumpModal from '@/components/TrumpModal';
import PlayerSlot from '@/components/PlayerSlot';
import ScoreBoard from '@/components/ScoreBoard';
import ChatPanel from '@/components/ChatPanel';

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { gameState, lastTrick, roundResult, gameOver, setRoundResult } = useGameStore();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [actionError, setActionError] = useState('');
  const [showRoundResult, setShowRoundResult] = useState(false);

  useSocketEvents();

  useEffect(() => {
    if (!token) { router.replace('/auth'); return; }
    const socket = connectSocket(token);
    // Re-join the socket room (in case of page refresh)
    socket.emit('join_room', { code: roomId }, (_res: any) => {});
  }, [token, roomId]);

  useEffect(() => {
    if (roundResult) {
      setShowRoundResult(true);
      const t = setTimeout(() => { setShowRoundResult(false); setRoundResult(null); }, 4000);
      return () => clearTimeout(t);
    }
  }, [roundResult]);

  if (!gameState || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading game…</div>
      </div>
    );
  }

  const gs = gameState;
  const mySeat = gs.mySeat;
  const myPlayer = gs.players.find(p => p.seat === mySeat);
  const isMyTurn = gs.currentTurnSeat === mySeat;

  // Seat layout: bottom=me, top=opposite, left/right=partners/opponents
  // mySeat=0(N): top=2(S), left=3(W), right=1(E)
  // mySeat=1(E): top=3(W), left=0(N), right=2(S)
  // mySeat=2(S): top=0(N), left=1(E), right=3(W)
  // mySeat=3(W): top=1(E), left=2(S), right=0(N)
  const topSeat = ((mySeat + 2) % 4) as 0 | 1 | 2 | 3;
  const leftSeat = ((mySeat + 3) % 4) as 0 | 1 | 2 | 3;
  const rightSeat = ((mySeat + 1) % 4) as 0 | 1 | 2 | 3;

  const getPlayer = (seat: 0 | 1 | 2 | 3) => gs.players.find(p => p.seat === seat);
  const getTrickCard = (seat: 0 | 1 | 2 | 3) => gs.currentTrick.find(t => t.seat === seat);

  const handleCardClick = (card: Card) => {
    if (!isMyTurn || gs.phase !== 'playing') return;
    setSelectedCard(prev =>
      prev?.suit === card.suit && prev?.rank === card.rank ? null : card
    );
    setActionError('');
  };

  const handlePlayCard = () => {
    if (!selectedCard) return;
    getSocket().emit('play_card', { card: selectedCard }, (res: any) => {
      if (!res.ok) {
        setActionError(res.error || 'Invalid move');
        setSelectedCard(null);
      } else {
        setSelectedCard(null);
        setActionError('');
      }
    });
  };

  const handleBid = (bid: number | 'pass') => {
    getSocket().emit('place_bid', { bid }, (res: any) => {
      if (!res.ok) setActionError(res.error || 'Bid failed');
    });
  };

  const handleSelectTrump = (suit: Suit) => {
    getSocket().emit('select_trump', { suit }, (res: any) => {
      if (!res.ok) setActionError(res.error || 'Failed to select trump');
    });
  };

  // Sort hand: by suit then rank value
  const RANK_ORDER = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];
  const SUIT_ORDER: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];
  const sortedHand = [...gs.myHand].sort((a, b) => {
    const suitDiff = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
    if (suitDiff !== 0) return suitDiff;
    return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
  });

  // Can this card be played (basic validity hint)
  const ledSuit = gs.currentTrick[0]?.card.suit;
  const hasLedSuit = ledSuit ? gs.myHand.some(c => c.suit === ledSuit) : false;
  const canPlay = (card: Card): boolean => {
    if (!isMyTurn || gs.phase !== 'playing') return false;
    if (!ledSuit) return true;
    if (hasLedSuit) return card.suit === ledSuit;
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col p-2 gap-2 max-h-screen overflow-hidden">
      {/* Game Over overlay */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur rounded-3xl p-8 max-w-sm w-full text-center border border-white/20">
            <div className="text-6xl mb-4">{gameOver.winner === myPlayer?.team ? '🏆' : '😢'}</div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {gameOver.winner === myPlayer?.team ? 'You Win!' : 'You Lose'}
            </h2>
            <p className="text-white/70 mb-1">{TEAM_NAMES[0]}: {gameOver.finalScores[0]} rounds</p>
            <p className="text-white/70 mb-6">{TEAM_NAMES[1]}: {gameOver.finalScores[1]} rounds</p>
            <button
              onClick={() => router.push('/lobby')}
              className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold rounded-xl"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Round result toast */}
      {showRoundResult && roundResult && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-40 px-6 py-3 rounded-2xl shadow-xl
          backdrop-blur border font-medium text-white transition-all ${
          roundResult.bidMade
            ? 'bg-green-500/80 border-green-400/50'
            : 'bg-red-500/80 border-red-400/50'
        }`}>
          {roundResult.bidMade ? '✅ Bid made!' : '❌ Bid failed!'}
          {' '}Scores: {TEAM_NAMES[0]} {roundResult.scores[0]} · {TEAM_NAMES[1]} {roundResult.scores[1]}
        </div>
      )}

      {/* Top: opponent */}
      <div className="flex justify-center">
        <PlayerSlot
          player={getPlayer(topSeat)}
          seat={topSeat}
          isCurrentTurn={gs.currentTurnSeat === topSeat}
          isMe={false}
          trickCard={getTrickCard(topSeat)}
          position="top"
        />
      </div>

      {/* Middle row: left | center table | right + sidebar */}
      <div className="flex flex-1 gap-2 min-h-0">
        {/* Left player */}
        <div className="flex items-center">
          <PlayerSlot
            player={getPlayer(leftSeat)}
            seat={leftSeat}
            isCurrentTurn={gs.currentTurnSeat === leftSeat}
            isMe={false}
            trickCard={getTrickCard(leftSeat)}
            position="left"
          />
        </div>

        {/* Center felt */}
        <div className="flex-1 felt-table rounded-2xl flex flex-col items-center justify-center relative border border-white/10 min-h-[200px]">
          {/* Bid/Trump actions */}
          {gs.phase === 'bidding' && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-xs">
                <BidModal
                  currentHighest={gs.highestBid}
                  mySeat={mySeat}
                  isMyTurn={isMyTurn}
                  onBid={handleBid}
                />
                {/* Bid history */}
                <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                  {gs.bidHistory.slice().reverse().map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-white/60">{gs.players.find(p => p.seat === b.seat)?.displayName}</span>
                      <span className={b.bid === 'pass' ? 'text-white/40' : 'text-yellow-400 font-bold'}>
                        {b.bid === 'pass' ? 'Pass' : b.bid}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {gs.phase === 'trump_selection' && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-xs">
                <TrumpModal
                  isMyTurn={gs.highestBidSeat === mySeat}
                  onSelect={handleSelectTrump}
                />
              </div>
            </div>
          )}

          {gs.phase === 'playing' && (
            <>
              {/* Center trick display (my card shown near me, others near them) */}
              <div className="flex items-center justify-center gap-2">
                {getTrickCard(mySeat) && (
                  <PlayingCard card={getTrickCard(mySeat)!.card} className="animate-slide-up" />
                )}
                {!getTrickCard(mySeat) && isMyTurn && (
                  <div className="w-16 h-24 rounded-lg border-2 border-dashed border-yellow-400/50 flex items-center justify-center">
                    <span className="text-yellow-400/70 text-xs">Play</span>
                  </div>
                )}
              </div>

              {/* Trump indicator */}
              {gs.trumpRevealed && gs.trumpSuit && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
                  <span className="text-white/50 text-xs">Trump</span>
                  <span className={`text-lg ${SUIT_COLORS[gs.trumpSuit]}`}>{SUIT_SYMBOLS[gs.trumpSuit]}</span>
                </div>
              )}

              {/* Turn indicator */}
              {isMyTurn && (
                <div className="absolute bottom-2 text-yellow-400 text-sm font-medium animate-pulse">
                  Your turn
                </div>
              )}
            </>
          )}

          {gs.phase === 'scoring' && (
            <div className="text-center p-4">
              <div className="text-white/70 text-sm">Round complete</div>
              <div className="text-white font-bold mt-1">Next round starting…</div>
            </div>
          )}
        </div>

        {/* Right player */}
        <div className="flex items-center">
          <PlayerSlot
            player={getPlayer(rightSeat)}
            seat={rightSeat}
            isCurrentTurn={gs.currentTurnSeat === rightSeat}
            isMe={false}
            trickCard={getTrickCard(rightSeat)}
            position="right"
          />
        </div>

        {/* Sidebar: scoreboard + chat */}
        <div className="w-48 flex flex-col gap-2 hidden lg:flex">
          <ScoreBoard state={gs} />
          <div className="flex-1 min-h-0">
            <ChatPanel />
          </div>
        </div>
      </div>

      {/* Bottom: my hand */}
      <div className="flex flex-col items-center gap-2">
        {/* My info */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${
          isMyTurn ? 'bg-yellow-400 text-green-900' : 'bg-white/20 text-white'
        }`}>
          <span>You ({myPlayer?.displayName})</span>
          {isMyTurn && gs.phase === 'playing' && <span className="animate-bounce">▶ Your turn</span>}
        </div>

        {/* Trump badge for me */}
        {gs.trumpSuit && (
          <div className={`flex items-center gap-1 text-sm ${
            gs.trumpRevealed ? 'text-white/70' : 'text-yellow-300'
          }`}>
            {gs.trumpRevealed ? (
              <>Trump: <span className={`${SUIT_COLORS[gs.trumpSuit]} font-bold`}>{SUIT_SYMBOLS[gs.trumpSuit]} {gs.trumpSuit}</span></>
            ) : gs.highestBidSeat === mySeat ? (
              <>Secret trump: <span className={`${SUIT_COLORS[gs.trumpSuit]} font-bold`}>{SUIT_SYMBOLS[gs.trumpSuit]}</span> (only you know)</>
            ) : null}
          </div>
        )}

        {/* Hand of cards */}
        <div className="flex gap-1 flex-wrap justify-center">
          {sortedHand.map((card, i) => {
            const playable = canPlay(card);
            const isSelected = selectedCard?.suit === card.suit && selectedCard?.rank === card.rank;
            return (
              <PlayingCard
                key={`${card.suit}-${card.rank}`}
                card={card}
                selected={isSelected}
                disabled={gs.phase !== 'playing' || !isMyTurn || !playable}
                onClick={() => handleCardClick(card)}
                className="animate-deal-in"
              />
            );
          })}
        </div>

        {/* Play button & error */}
        {gs.phase === 'playing' && isMyTurn && selectedCard && (
          <button
            onClick={handlePlayCard}
            className="px-8 py-2 bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold rounded-xl"
          >
            Play Card
          </button>
        )}
        {actionError && (
          <div className="text-red-300 text-sm">{actionError}</div>
        )}
      </div>

      {/* Mobile chat toggle */}
      <div className="lg:hidden flex gap-2 justify-center">
        <ScoreBoard state={gs} />
      </div>
    </div>
  );
}
