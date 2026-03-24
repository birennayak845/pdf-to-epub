'use client';
import { useEffect } from 'react';
import { getSocket } from './socket';
import { useGameStore } from './store';
import { PlayerView, RoomInfo, Trick, Seat } from './types';

export function useSocketEvents() {
  const {
    setGameState, setRoom, setPublicRooms, addChatMessage,
    setMatchmakingStatus, setLastTrick, setRoundResult, setGameOver
  } = useGameStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on('game_state', (state: PlayerView) => {
      setGameState(state);
    });

    socket.on('game_started', (state: PlayerView) => {
      setGameState(state);
    });

    socket.on('room_updated', (room: RoomInfo) => {
      setRoom(room);
    });

    socket.on('room_list', (rooms: RoomInfo[]) => {
      setPublicRooms(rooms);
    });

    socket.on('chat_message', (msg: { from: string; text: string; timestamp: number }) => {
      addChatMessage(msg);
    });

    socket.on('matchmaking_status', (status: 'searching' | 'found' | 'cancelled') => {
      setMatchmakingStatus(status);
    });

    socket.on('trick_complete', (trick: Trick, nextLeader: Seat) => {
      setLastTrick(trick);
      // Clear after 2.5s
      setTimeout(() => setLastTrick(null), 2500);
    });

    socket.on('round_end', (result: { bidMade: boolean; scores: [number, number] }) => {
      setRoundResult(result);
    });

    socket.on('game_over', (result: { winner: 0 | 1; finalScores: [number, number] }) => {
      setGameOver(result);
    });

    return () => {
      socket.off('game_state');
      socket.off('game_started');
      socket.off('room_updated');
      socket.off('room_list');
      socket.off('chat_message');
      socket.off('matchmaking_status');
      socket.off('trick_complete');
      socket.off('round_end');
      socket.off('game_over');
    };
  }, []);
}
