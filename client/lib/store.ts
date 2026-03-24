import { create } from 'zustand';
import { AuthUser, PlayerView, RoomInfo } from './types';

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>(set => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },
}));

interface GameStore {
  gameState: PlayerView | null;
  room: RoomInfo | null;
  publicRooms: RoomInfo[];
  chatMessages: { from: string; text: string; timestamp: number }[];
  matchmakingStatus: 'idle' | 'searching' | 'found' | 'cancelled';
  lastTrick: { cards: PlayerView['currentTrick']; winner: number; points: number } | null;
  roundResult: { bidMade: boolean; scores: [number, number] } | null;
  gameOver: { winner: 0 | 1; finalScores: [number, number] } | null;
  setGameState: (state: PlayerView) => void;
  setRoom: (room: RoomInfo | null) => void;
  setPublicRooms: (rooms: RoomInfo[]) => void;
  addChatMessage: (msg: { from: string; text: string; timestamp: number }) => void;
  setMatchmakingStatus: (status: GameStore['matchmakingStatus']) => void;
  setLastTrick: (trick: GameStore['lastTrick']) => void;
  setRoundResult: (result: GameStore['roundResult']) => void;
  setGameOver: (result: GameStore['gameOver']) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>(set => ({
  gameState: null,
  room: null,
  publicRooms: [],
  chatMessages: [],
  matchmakingStatus: 'idle',
  lastTrick: null,
  roundResult: null,
  gameOver: null,
  setGameState: state => set({ gameState: state }),
  setRoom: room => set({ room }),
  setPublicRooms: rooms => set({ publicRooms: rooms }),
  addChatMessage: msg => set(s => ({ chatMessages: [...s.chatMessages.slice(-100), msg] })),
  setMatchmakingStatus: status => set({ matchmakingStatus: status }),
  setLastTrick: trick => set({ lastTrick: trick }),
  setRoundResult: result => set({ roundResult: result }),
  setGameOver: result => set({ gameOver: result }),
  reset: () => set({
    gameState: null,
    room: null,
    chatMessages: [],
    matchmakingStatus: 'idle',
    lastTrick: null,
    roundResult: null,
    gameOver: null,
  }),
}));
