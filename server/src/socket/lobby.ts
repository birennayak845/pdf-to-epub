import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { JwtPayload } from '../middleware/auth';
import { RoomInfo, Seat } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { startGame, getGameForRoom } from './game';

const prisma = new PrismaClient();

// In-memory matchmaking queue: userId -> { socket, user }
const matchmakingQueue = new Map<string, { socket: Socket; user: JwtPayload }>();

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function getRoomInfo(roomId: string): Promise<RoomInfo | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { players: { include: { user: true } } },
  });
  if (!room) return null;
  return {
    id: room.id,
    code: room.code,
    name: room.name ?? undefined,
    isPrivate: room.isPrivate,
    playerCount: room.players.length,
    players: room.players.map(p => ({ displayName: p.user.displayName, seat: p.seat })),
    status: room.status.toLowerCase() as RoomInfo['status'],
  };
}

async function broadcastRoomUpdate(io: Server, roomId: string) {
  const info = await getRoomInfo(roomId);
  if (info) io.to(roomId).emit('room_updated', info);
}

async function broadcastPublicRooms(io: Server) {
  const rooms = await prisma.room.findMany({
    where: { isPrivate: false, status: 'WAITING' },
    include: { players: { include: { user: true } } },
  });
  const list: RoomInfo[] = rooms.map(r => ({
    id: r.id,
    code: r.code,
    name: r.name ?? undefined,
    isPrivate: false,
    playerCount: r.players.length,
    players: r.players.map(p => ({ displayName: p.user.displayName, seat: p.seat })),
    status: 'waiting',
  }));
  io.emit('room_list', list);
}

export function setupLobbyHandlers(io: Server, socket: Socket, user: JwtPayload) {
  // ── Create Room ──────────────────────────────────────────────
  socket.on('create_room', async (data: { name?: string; isPrivate?: boolean }, cb) => {
    try {
      // Leave existing room first
      await leaveCurrentRoom(io, socket, user);

      const code = generateRoomCode();
      const room = await prisma.room.create({
        data: {
          code,
          name: data.name || null,
          isPrivate: data.isPrivate ?? false,
          players: {
            create: {
              userId: user.userId,
              seat: 0,
              team: 0,
            },
          },
        },
      });

      socket.join(room.id);
      socket.data.roomId = room.id;

      const info = await getRoomInfo(room.id);
      cb({ ok: true, room: info! });
      await broadcastPublicRooms(io);
    } catch (err) {
      console.error(err);
      cb({ ok: false, error: 'Failed to create room' });
    }
  });

  // ── Join Room ────────────────────────────────────────────────
  socket.on('join_room', async (data: { code: string }, cb) => {
    try {
      const room = await prisma.room.findUnique({
        where: { code: data.code.toUpperCase() },
        include: { players: true },
      });

      if (!room) return cb({ ok: false, error: 'Room not found' });
      if (room.status !== 'WAITING') return cb({ ok: false, error: 'Game already in progress' });
      if (room.players.length >= room.maxPlayers) return cb({ ok: false, error: 'Room is full' });

      // Check not already in this room
      const alreadyIn = room.players.find(p => p.userId === user.userId);
      if (alreadyIn) {
        socket.join(room.id);
        socket.data.roomId = room.id;
        const info = await getRoomInfo(room.id);
        return cb({ ok: true, room: info! });
      }

      await leaveCurrentRoom(io, socket, user);

      // Assign next available seat
      const takenSeats = room.players.map(p => p.seat);
      const seat = ([0, 1, 2, 3] as Seat[]).find(s => !takenSeats.includes(s))!;
      const team = seat % 2 === 0 ? 0 : 1;

      await prisma.gamePlayer.create({
        data: { userId: user.userId, roomId: room.id, seat, team },
      });

      socket.join(room.id);
      socket.data.roomId = room.id;

      io.to(room.id).emit('player_joined', { displayName: user.displayName, seat });

      const info = await getRoomInfo(room.id);
      cb({ ok: true, room: info! });

      await broadcastRoomUpdate(io, room.id);
      await broadcastPublicRooms(io);
    } catch (err) {
      console.error(err);
      cb({ ok: false, error: 'Failed to join room' });
    }
  });

  // ── Leave Room ───────────────────────────────────────────────
  socket.on('leave_room', async () => {
    await leaveCurrentRoom(io, socket, user);
  });

  // ── Get Public Rooms ─────────────────────────────────────────
  socket.on('get_rooms', async () => {
    await broadcastPublicRooms(io);
  });

  // ── Start Game ───────────────────────────────────────────────
  socket.on('start_game', async (cb) => {
    const roomId = socket.data.roomId;
    if (!roomId) return cb({ ok: false, error: 'Not in a room' });

    try {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { players: { include: { user: true } } },
      });

      if (!room) return cb({ ok: false, error: 'Room not found' });
      if (room.players.length < 4) return cb({ ok: false, error: 'Need 4 players to start' });
      if (room.status !== 'WAITING') return cb({ ok: false, error: 'Game already started' });

      // Only let the room creator (seat 0) start
      const requester = room.players.find(p => p.userId === user.userId);
      if (!requester || requester.seat !== 0) return cb({ ok: false, error: 'Only the host can start the game' });

      await prisma.room.update({ where: { id: roomId }, data: { status: 'IN_PROGRESS' } });

      await startGame(io, roomId, room.players.map(p => ({
        userId: p.userId,
        displayName: p.user.displayName,
        seat: p.seat as Seat,
      })));

      cb({ ok: true });
      await broadcastPublicRooms(io);
    } catch (err) {
      console.error(err);
      cb({ ok: false, error: 'Failed to start game' });
    }
  });

  // ── Matchmaking ──────────────────────────────────────────────
  socket.on('join_matchmaking', async () => {
    if (matchmakingQueue.has(user.userId)) return;
    matchmakingQueue.set(user.userId, { socket, user });
    socket.emit('matchmaking_status', 'searching');

    if (matchmakingQueue.size >= 4) {
      const matched = [...matchmakingQueue.entries()].slice(0, 4);
      matched.forEach(([uid]) => matchmakingQueue.delete(uid));

      try {
        const code = generateRoomCode();
        const room = await prisma.room.create({
          data: {
            code,
            isPrivate: true,
            status: 'IN_PROGRESS',
            players: {
              create: matched.map(([, { user: u }], idx) => ({
                userId: u.userId,
                seat: idx,
                team: idx % 2 === 0 ? 0 : 1,
              })),
            },
          },
        });

        for (const [, { socket: s, user: u }] of matched) {
          s.join(room.id);
          s.data.roomId = room.id;
          s.emit('matchmaking_found', room.id);
          s.emit('matchmaking_status', 'found');
        }

        await startGame(io, room.id, matched.map(([, { user: u }], idx) => ({
          userId: u.userId,
          displayName: u.displayName,
          seat: idx as Seat,
        })));
      } catch (err) {
        console.error('Matchmaking error:', err);
      }
    }
  });

  socket.on('leave_matchmaking', () => {
    matchmakingQueue.delete(user.userId);
    socket.emit('matchmaking_status', 'cancelled');
  });

  // ── Disconnect ───────────────────────────────────────────────
  socket.on('disconnect', async () => {
    matchmakingQueue.delete(user.userId);
    await leaveCurrentRoom(io, socket, user);
  });
}

async function leaveCurrentRoom(io: Server, socket: Socket, user: JwtPayload) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  try {
    const player = await prisma.gamePlayer.findFirst({
      where: { userId: user.userId, roomId },
      include: { room: true },
    });
    if (!player) return;

    // Only remove player if room is in WAITING state (not mid-game)
    if (player.room.status === 'WAITING') {
      await prisma.gamePlayer.delete({ where: { id: player.id } });
      socket.leave(roomId);
      socket.data.roomId = null;

      io.to(roomId).emit('player_left', { displayName: user.displayName, seat: player.seat });

      // Delete empty rooms
      const remaining = await prisma.gamePlayer.count({ where: { roomId } });
      if (remaining === 0) {
        await prisma.room.delete({ where: { id: roomId } });
      } else {
        await broadcastRoomUpdate(io, roomId);
      }
      await broadcastPublicRooms(io);
    } else {
      socket.leave(roomId);
      socket.data.roomId = null;
    }
  } catch (err) {
    console.error('Leave room error:', err);
  }
}
