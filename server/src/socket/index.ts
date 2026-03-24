import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../middleware/auth';
import { setupLobbyHandlers } from './lobby';
import { setupGameHandlers } from './game';

export function setupSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      socket.data.userId = payload.userId;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as JwtPayload;
    console.log(`User connected: ${user.displayName} (${socket.id})`);

    setupLobbyHandlers(io, socket, user);
    setupGameHandlers(io, socket, user);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user.displayName}`);
    });
  });

  return io;
}
