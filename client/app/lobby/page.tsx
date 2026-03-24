'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useGameStore } from '@/lib/store';
import { getSocket, connectSocket } from '@/lib/socket';
import { useSocketEvents } from '@/lib/useSocketEvents';
import { RoomInfo } from '@/lib/types';
import { updateProfile } from '@/lib/api';

export default function LobbyPage() {
  const router = useRouter();
  const { user, token, setAuth, clearAuth } = useAuthStore();
  const { room, publicRooms, setRoom, setPublicRooms, matchmakingStatus, setMatchmakingStatus, reset } = useGameStore();

  const [tab, setTab] = useState<'public' | 'create' | 'join'>('public');
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [profileError, setProfileError] = useState('');

  useSocketEvents();

  useEffect(() => {
    if (!token) { router.replace('/auth'); return; }
    const socket = connectSocket(token);
    socket.emit('get_rooms');
  }, [token]);

  // Watch for matchmaking redirect
  useEffect(() => {
    const socket = getSocket();
    socket.on('matchmaking_found', (roomId: string) => {
      router.push(`/game/${roomId}`);
    });
    return () => { socket.off('matchmaking_found'); };
  }, []);

  // If we joined a room that has a game in progress, go to game
  useEffect(() => {
    if (room?.status === 'in_progress') {
      router.push(`/game/${room.id}`);
    }
  }, [room]);

  const handleCreateRoom = () => {
    setError('');
    getSocket().emit('create_room', { name: roomName || undefined, isPrivate }, (res: any) => {
      if (!res.ok) return setError(res.error);
      setRoom(res.room);
    });
  };

  const handleJoinRoom = () => {
    setError('');
    if (!joinCode.trim()) return setError('Enter a room code');
    getSocket().emit('join_room', { code: joinCode.trim() }, (res: any) => {
      if (!res.ok) return setError(res.error);
      setRoom(res.room);
    });
  };

  const handleJoinPublic = (r: RoomInfo) => {
    setError('');
    getSocket().emit('join_room', { code: r.code }, (res: any) => {
      if (!res.ok) return setError(res.error);
      setRoom(res.room);
    });
  };

  const handleStartGame = () => {
    getSocket().emit('start_game', (res: any) => {
      if (!res.ok) return setError(res.error);
      router.push(`/game/${room!.id}`);
    });
  };

  const handleLeaveRoom = () => {
    getSocket().emit('leave_room');
    setRoom(null);
  };

  const handleMatchmaking = () => {
    if (matchmakingStatus === 'searching') {
      getSocket().emit('leave_matchmaking');
      setMatchmakingStatus('idle');
    } else {
      getSocket().emit('join_matchmaking');
      setMatchmakingStatus('searching');
    }
  };

  const handleUpdateName = async () => {
    if (!newDisplayName.trim()) return;
    try {
      const result = await updateProfile(newDisplayName.trim());
      if (user && token) {
        setAuth({ ...user, displayName: result.displayName }, result.token || token);
      }
      setEditingName(false);
      setProfileError('');
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Failed to update name');
    }
  };

  const handleLogout = () => {
    getSocket().emit('leave_room');
    reset();
    clearAuth();
    router.replace('/auth');
  };

  if (!user) return null;

  const SEAT_POSITIONS = ['N', 'E', 'S', 'W'];

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🃏</span>
          <span className="text-white font-bold text-xl">Game 29</span>
        </div>
        <div className="flex items-center gap-3">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDisplayName}
                onChange={e => setNewDisplayName(e.target.value)}
                placeholder={user.displayName}
                className="px-3 py-1 rounded-lg bg-white/20 border border-white/30 text-white text-sm
                  placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400 w-40"
              />
              <button onClick={handleUpdateName} className="px-3 py-1 bg-yellow-500 text-green-900 rounded-lg text-sm font-medium">
                Save
              </button>
              <button onClick={() => setEditingName(false)} className="px-3 py-1 bg-white/20 text-white rounded-lg text-sm">
                Cancel
              </button>
              {profileError && <span className="text-red-300 text-xs">{profileError}</span>}
            </div>
          ) : (
            <button
              onClick={() => { setEditingName(true); setNewDisplayName(user.displayName); }}
              className="text-white/80 hover:text-white text-sm flex items-center gap-1"
            >
              <span className="font-medium">{user.displayName}</span>
              <span className="text-white/40 text-xs">✏️</span>
            </button>
          )}
          <button onClick={handleLogout} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm">
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Room panel */}
        <div className="md:col-span-2 space-y-4">
          {/* Current Room */}
          {room ? (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-bold text-lg">{room.name || 'Game Room'}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-green-200 text-sm">Code:</span>
                    <span className="font-mono font-bold text-yellow-400 tracking-widest text-sm">{room.code}</span>
                  </div>
                </div>
                <button onClick={handleLeaveRoom} className="text-white/60 hover:text-white text-sm px-3 py-1 bg-white/10 rounded-lg">
                  Leave
                </button>
              </div>

              {/* Seats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[0, 1, 2, 3].map(seat => {
                  const player = room.players.find(p => p.seat === seat);
                  const isMe = player?.displayName === user.displayName;
                  return (
                    <div key={seat} className={`rounded-xl p-3 border ${
                      player
                        ? isMe ? 'bg-yellow-500/20 border-yellow-400/50' : 'bg-white/15 border-white/20'
                        : 'bg-white/5 border-white/10 border-dashed'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 text-xs font-mono bg-white/10 rounded px-1.5 py-0.5">
                          {SEAT_POSITIONS[seat]} · Team {seat % 2 === 0 ? '1' : '2'}
                        </span>
                        {isMe && <span className="text-yellow-400 text-xs">You</span>}
                      </div>
                      <div className={`mt-1 font-medium ${player ? 'text-white' : 'text-white/30'}`}>
                        {player ? player.displayName : 'Waiting…'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="bg-red-500/20 text-red-200 text-sm rounded-lg px-3 py-2 mb-3">{error}</div>
              )}

              {room.playerCount === 4 ? (
                room.players.find(p => p.seat === 0)?.displayName === user.displayName ? (
                  <button
                    onClick={handleStartGame}
                    className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold rounded-xl text-lg transition-colors"
                  >
                    Start Game
                  </button>
                ) : (
                  <p className="text-center text-white/60 text-sm">Waiting for host to start…</p>
                )
              ) : (
                <p className="text-center text-white/60 text-sm">
                  {4 - room.playerCount} more player{room.playerCount < 3 ? 's' : ''} needed
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-white/10">
                {(['public', 'create', 'join'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(''); }}
                    className={`flex-1 py-3 text-sm font-medium transition-colors capitalize ${
                      tab === t ? 'bg-white/10 text-white border-b-2 border-yellow-400' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {t === 'public' ? 'Browse Rooms' : t === 'create' ? 'Create Room' : 'Join by Code'}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {tab === 'public' && (
                  <div className="space-y-3">
                    {publicRooms.length === 0 ? (
                      <div className="text-center text-white/40 py-8">
                        <div className="text-4xl mb-2">🎴</div>
                        <p>No open rooms right now.</p>
                        <p className="text-sm mt-1">Create one or use matchmaking!</p>
                      </div>
                    ) : (
                      publicRooms.map(r => (
                        <div key={r.id} className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                          <div>
                            <div className="text-white font-medium">{r.name || 'Unnamed Room'}</div>
                            <div className="text-white/50 text-xs">{r.playerCount}/4 players · Code: {r.code}</div>
                          </div>
                          <button
                            onClick={() => handleJoinPublic(r)}
                            disabled={r.playerCount >= 4}
                            className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-green-900 rounded-lg text-sm font-medium
                              disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Join
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {tab === 'create' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-green-100 text-sm mb-1">Room Name (optional)</label>
                      <input
                        type="text"
                        value={roomName}
                        onChange={e => setRoomName(e.target.value)}
                        placeholder="e.g. Friday Night Game"
                        className="w-full px-4 py-2.5 rounded-lg bg-white/20 border border-white/30 text-white
                          placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={e => setIsPrivate(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-white/80 text-sm">Private room (join by code only)</span>
                    </label>
                    {error && <div className="bg-red-500/20 text-red-200 text-sm rounded-lg px-3 py-2">{error}</div>}
                    <button
                      onClick={handleCreateRoom}
                      className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold rounded-xl transition-colors"
                    >
                      Create Room
                    </button>
                  </div>
                )}

                {tab === 'join' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-green-100 text-sm mb-1">Room Code</label>
                      <input
                        type="text"
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="e.g. ABC123"
                        maxLength={6}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/20 border border-white/30 text-white
                          placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400
                          font-mono text-xl text-center tracking-widest uppercase"
                      />
                    </div>
                    {error && <div className="bg-red-500/20 text-red-200 text-sm rounded-lg px-3 py-2">{error}</div>}
                    <button
                      onClick={handleJoinRoom}
                      className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold rounded-xl transition-colors"
                    >
                      Join Room
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Matchmaking + info */}
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
            <h3 className="text-white font-bold mb-3">Quick Match</h3>
            <p className="text-white/60 text-sm mb-4">Get matched with 3 random players instantly.</p>
            <button
              onClick={handleMatchmaking}
              disabled={!!room}
              className={`w-full py-3 rounded-xl font-bold transition-colors text-sm ${
                matchmakingStatus === 'searching'
                  ? 'bg-red-500/80 hover:bg-red-500 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {matchmakingStatus === 'searching' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Searching… Cancel
                </span>
              ) : 'Find a Match'}
            </button>
          </div>

          {/* How to play */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
            <h3 className="text-white font-bold mb-3">How to Play</h3>
            <ul className="text-white/70 text-sm space-y-2">
              <li>🎴 4 players, 2 teams (N-S vs E-W)</li>
              <li>🃏 32 cards dealt (8 per player)</li>
              <li>📢 Bid for trump (16–28 points)</li>
              <li>🔒 Trump suit is kept secret!</li>
              <li>🏆 Win tricks to reach your bid</li>
              <li>⭐ First team to 6 round wins!</li>
            </ul>
            <div className="mt-3 text-white/50 text-xs">
              Card rank: J &gt; 9 &gt; A &gt; 10 &gt; K &gt; Q &gt; 8 &gt; 7
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
