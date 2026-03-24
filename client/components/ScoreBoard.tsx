'use client';
import { PlayerView, TEAM_NAMES } from '@/lib/types';

interface ScoreBoardProps {
  state: PlayerView;
}

export default function ScoreBoard({ state }: ScoreBoardProps) {
  const myTeam = state.players.find(p => p.seat === state.mySeat)?.team ?? 0;

  return (
    <div className="bg-white/10 rounded-2xl p-4 border border-white/20 space-y-3">
      {/* Round scores */}
      <div>
        <div className="text-white/50 text-xs mb-2 font-medium uppercase tracking-wider">Round Wins</div>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map(team => (
            <div key={team} className={`rounded-xl p-2 text-center ${
              team === myTeam ? 'bg-yellow-500/20 border border-yellow-400/40' : 'bg-white/10'
            }`}>
              <div className="text-white/60 text-xs">{TEAM_NAMES[team]}</div>
              <div className="text-2xl font-bold text-white">{state.roundScores[team]}</div>
              <div className="text-white/40 text-xs">/ 6 to win</div>
            </div>
          ))}
        </div>
      </div>

      {/* Current round points */}
      {state.phase === 'playing' && (
        <div>
          <div className="text-white/50 text-xs mb-2 font-medium uppercase tracking-wider">Points This Round</div>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map(team => (
              <div key={team} className="bg-white/10 rounded-xl p-2 text-center">
                <div className="text-white/60 text-xs">{TEAM_NAMES[team]}</div>
                <div className="text-xl font-bold text-white">{state.teamPoints[team]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bid info */}
      {state.highestBidSeat !== null && (
        <div className="bg-white/10 rounded-xl p-3">
          <div className="text-white/50 text-xs mb-1">Current Bid</div>
          <div className="flex items-center justify-between">
            <span className="text-yellow-400 font-bold text-lg">{state.highestBid}</span>
            <span className="text-white/60 text-sm">
              by {state.players.find(p => p.seat === state.highestBidSeat)?.displayName}
            </span>
          </div>
          {state.trumpRevealed && state.trumpSuit && (
            <div className="text-white/60 text-xs mt-1">
              Trump: <span className="text-white font-medium capitalize">{state.trumpSuit}</span>
            </div>
          )}
        </div>
      )}

      {/* Tricks */}
      {state.phase === 'playing' && (
        <div className="text-white/50 text-xs">
          Tricks: {TEAM_NAMES[0]} {state.trickCounts[0]} · {TEAM_NAMES[1]} {state.trickCounts[1]}
        </div>
      )}
    </div>
  );
}
