import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { JwtPayload } from '../middleware/auth';
import { Game29Engine, PlayerInfo } from '../game/engine';
import { Seat, Suit, Card } from '../types';

const prisma = new PrismaClient();

// Active games in memory: roomId -> engine
const activeGames = new Map<string, Game29Engine>();

export function getGameForRoom(roomId: string): Game29Engine | undefined {
  return activeGames.get(roomId);
}

export async function startGame(io: Server, roomId: string, players: PlayerInfo[]) {
  const engine = new Game29Engine(players);
  activeGames.set(roomId, engine);

  // Persist initial game record
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { players: true } });
  if (!room) return;

  const game = await prisma.game.create({
    data: {
      roomId,
      state: {},
      players: {
        connect: room.players.map(p => ({ id: p.id })),
      },
    },
  });

  // Start first round (dealer = seat 0)
  engine.startRound(0);

  // Broadcast initial game state to each player
  broadcastGameState(io, roomId, engine);
}

function broadcastGameState(io: Server, roomId: string, engine: Game29Engine) {
  const state = engine.getState();
  for (const player of state.players) {
    const view = engine.getPlayerView(player.seat);
    // Find sockets in this room that belong to this player
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) continue;
    for (const socketId of room) {
      const s = io.sockets.sockets.get(socketId);
      if (s && s.data.userId === player.userId) {
        s.emit('game_state', view);
      }
    }
  }
}

export function setupGameHandlers(io: Server, socket: Socket, user: JwtPayload) {
  // ── Place Bid ────────────────────────────────────────────────
  socket.on('place_bid', async (data: { bid: number | 'pass' }, cb) => {
    const roomId = socket.data.roomId;
    if (!roomId) return cb({ ok: false, error: 'Not in a room' });

    const engine = activeGames.get(roomId);
    if (!engine) return cb({ ok: false, error: 'No active game' });

    const seat = getSeatForUser(engine, user.userId);
    if (seat === null) return cb({ ok: false, error: 'Not a player in this game' });

    const result = engine.placeBid(seat, data.bid);
    cb(result);

    if (result.ok) {
      broadcastGameState(io, roomId, engine);
    }
  });

  // ── Select Trump ─────────────────────────────────────────────
  socket.on('select_trump', async (data: { suit: Suit }, cb) => {
    const roomId = socket.data.roomId;
    if (!roomId) return cb({ ok: false, error: 'Not in a room' });

    const engine = activeGames.get(roomId);
    if (!engine) return cb({ ok: false, error: 'No active game' });

    const seat = getSeatForUser(engine, user.userId);
    if (seat === null) return cb({ ok: false, error: 'Not a player in this game' });

    const result = engine.selectTrump(seat, data.suit);
    cb(result);

    if (result.ok) {
      broadcastGameState(io, roomId, engine);
    }
  });

  // ── Play Card ────────────────────────────────────────────────
  socket.on('play_card', async (data: { card: Card }, cb) => {
    const roomId = socket.data.roomId;
    if (!roomId) return cb({ ok: false, error: 'Not in a room' });

    const engine = activeGames.get(roomId);
    if (!engine) return cb({ ok: false, error: 'No active game' });

    const seat = getSeatForUser(engine, user.userId);
    if (seat === null) return cb({ ok: false, error: 'Not a player in this game' });

    const prevTrickCount = engine.getState().completedTricks.length;
    const result = engine.playCard(seat, data.card);
    cb(result);

    if (!result.ok) return;

    const state = engine.getState();

    // Trick completed
    if (result.trickComplete) {
      const lastTrick = state.completedTricks[state.completedTricks.length - 1];
      io.to(roomId).emit('trick_complete', lastTrick, state.currentLeaderSeat);

      if (state.phase === 'scoring' || state.phase === 'finished') {
        const roundResult = engine.getRoundResult();
        if (roundResult) {
          io.to(roomId).emit('round_end', {
            bidMade: roundResult.bidMade,
            scores: roundResult.scores,
          });
        }

        if (state.phase === 'finished') {
          const winner = engine.getWinner();
          io.to(roomId).emit('game_over', { winner: winner!, finalScores: state.roundScores });

          // Persist final scores
          await saveGameResult(roomId, engine);
          activeGames.delete(roomId);
          return;
        }

        // Auto-start next round after a delay
        setTimeout(() => {
          if (activeGames.has(roomId)) {
            engine.startNextRound();
            broadcastGameState(io, roomId, engine);
          }
        }, 4000);
      }
    }

    broadcastGameState(io, roomId, engine);
  });

  // ── Chat ─────────────────────────────────────────────────────
  socket.on('send_chat', (data: { text: string }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const text = data.text?.trim().slice(0, 200);
    if (!text) return;
    io.to(roomId).emit('chat_message', {
      from: user.displayName,
      text,
      timestamp: Date.now(),
    });
  });
}

function getSeatForUser(engine: Game29Engine, userId: string): Seat | null {
  const player = engine.getState().players.find(p => p.userId === userId);
  return player ? player.seat : null;
}

async function saveGameResult(roomId: string, engine: Game29Engine) {
  try {
    const state = engine.getState();
    const winner = engine.getWinner();

    await prisma.game.update({
      where: { roomId },
      data: { status: 'FINISHED', state: state as object },
    });

    await prisma.room.update({
      where: { id: roomId },
      data: { status: 'FINISHED' },
    });

    // Update stats for each player
    for (const player of state.players) {
      const isWinner = player.team === winner;
      await prisma.gameStats.update({
        where: { userId: player.userId },
        data: {
          gamesPlayed: { increment: 1 },
          gamesWon: isWinner ? { increment: 1 } : undefined,
          totalPoints: { increment: state.roundScores[player.team] },
        },
      });
    }
  } catch (err) {
    console.error('Failed to save game result:', err);
  }
}
