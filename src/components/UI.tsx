/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Flame,
  Check,
  Eye,
  Plus,
  Users,
  Bot,
  RefreshCw,
  LogOut,
  Shield,
  Swords,
  Sun,
} from 'lucide-react';
import { GameMode, TeamId, AiDifficulty } from '../shared/types';

export const SKIN_PRESETS = [
  { name: 'Cyan Neon', color: '#00f3ff' },
  { name: 'Hot Pink', color: '#ff007f' },
  { name: 'Cyber Green', color: '#39ff14' },
  { name: 'Solar Orange', color: '#ff9900' },
  { name: 'Plasma Purple', color: '#bd93f9' },
  { name: 'Laser Red', color: '#ff3366' },
  { name: 'Electric Yellow', color: '#f1fa8c' },
  { name: 'Ice Blue', color: '#8be9fd' },
];

function GameTimer({ createdAt }: { createdAt: number }) {
  const [time, setTime] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - createdAt;
      const remaining = Math.max(0, 5 * 60 * 1000 - elapsed);
      setTime(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [createdAt]);
  const mins = Math.floor(time / 60000);
  const secs = Math.floor((time % 60000) / 1000);
  return (
    <span className={time < 30000 ? 'text-red-400' : 'text-zinc-200'}>
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

export function UI() {
  const {
    gameState,
    playerId,
    rooms,
    currentRoom,
    viewState,
    fetchRooms,
    createRoom,
    selectRoom,
    backToLobby,
    startGame,
    isBoosting,
    setIsBoosting,
    setJoystickVector,
    is3D,
    toggle3D2D,
    selectedSkinColor,
    setSelectedSkinColor,
    selectedTeam,
    setSelectedTeam,
    playerName,
    setPlayerName,
    soundEnabled,
    toggleSound,
    theme,
    toggleTheme,
  } = useGameStore();

  const isDark = theme === 'dark';

  const [nicknameInput, setNicknameInput] = useState(playerName);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('Cyber Arena');
  const [newRoomGameMode, setNewRoomGameMode] = useState<GameMode>('solo');
  const [newRoomAiCount, setNewRoomAiCount] = useState(5);
  const [newRoomAiDifficulty, setNewRoomAiDifficulty] = useState<AiDifficulty>('easy');
  const [newRoomEventMode, setNewRoomEventMode] = useState(false);

  const player = playerId && gameState ? gameState.players[playerId] : null;
  const isAlive = player?.state === 'alive';
  const isDead = player?.state === 'dead';

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      const touch = e.touches[e.touches.length - 1];
      touchIdRef.current = touch.identifier;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    if (!joystickContainerRef.current) return;
    const rect = joystickContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = 45;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clampedDist;
    const ny = Math.sin(angle) * clampedDist;
    setJoystickPos({ x: nx, y: ny });
    setIsJoystickActive(true);
    setJoystickVector(nx / maxRadius, ny / maxRadius, true);
  };

  const handleJoystickMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!isJoystickActive || !joystickContainerRef.current) return;
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e) {
        let touch: Touch | null = null;
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === touchIdRef.current) {
            touch = e.touches[i];
            break;
          }
        }
        if (!touch && e.touches.length > 0) touch = e.touches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const rect = joystickContainerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const maxRadius = 45;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clampedDist = Math.min(dist, maxRadius);
      const angle = Math.atan2(dy, dx);
      const nx = Math.cos(angle) * clampedDist;
      const ny = Math.sin(angle) * clampedDist;
      setJoystickPos({ x: nx, y: ny });
      setJoystickVector(nx / maxRadius, ny / maxRadius, true);
    },
    [isJoystickActive, setJoystickVector]
  );

  const handleJoystickEnd = useCallback(() => {
    if (!isJoystickActive) return;
    touchIdRef.current = null;
    setIsJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    setJoystickVector(0, 0, false);
  }, [isJoystickActive, setJoystickVector]);

  useEffect(() => {
    if (isJoystickActive) {
      window.addEventListener('touchmove', handleJoystickMove, { passive: false });
      window.addEventListener('touchend', handleJoystickEnd);
      window.addEventListener('touchcancel', handleJoystickEnd);
      window.addEventListener('mousemove', handleJoystickMove);
      window.addEventListener('mouseup', handleJoystickEnd);
    }
    return () => {
      window.removeEventListener('touchmove', handleJoystickMove);
      window.removeEventListener('touchend', handleJoystickEnd);
      window.removeEventListener('touchcancel', handleJoystickEnd);
      window.removeEventListener('mousemove', handleJoystickMove);
      window.removeEventListener('mouseup', handleJoystickEnd);
    };
  }, [isJoystickActive, handleJoystickMove, handleJoystickEnd]);

  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRoom(newRoomTitle, newRoomGameMode, newRoomAiCount, newRoomEventMode, newRoomAiDifficulty);
    setShowCreateModal(false);
  };

  const handlePlaySubmit = () => {
    setPlayerName(nicknameInput);
    startGame(nicknameInput);
  };

  if (viewState === 'lobby') {
    return (
      <div className={`absolute inset-0 flex flex-col items-center p-4 sm:p-6 overflow-y-auto ${
        isDark ? 'bg-[#030712] text-white' : 'bg-white text-zinc-900'
      }`}>
        <div className="max-w-xl w-full flex flex-col gap-5 my-auto py-6">
          <div className={`flex justify-between items-center border-b pb-4 ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-teal-500 to-fuchsia-500 tracking-tight">
                SNAKEGAME3D
              </h1>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Multiplayer 3D Cyber Arena</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchRooms}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/10' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                }`}
                title="Refresh Servers"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={toggleSound}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/10' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                }`}
                title="Toggle Sound"
              >
                {soundEnabled ? (
                  <Volume2 size={16} className="text-emerald-500" />
                ) : (
                  <VolumeX size={16} className="text-zinc-400" />
                )}
              </button>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/10' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                }`}
                title="Toggle Theme"
              >
                <Sun size={16} />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h2 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              <Users size={16} className="text-cyan-500" />
              <span>Server List</span>
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              <span>Create Server</span>
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto pr-1 flex flex-col gap-2.5">
            {rooms.length === 0 ? (
              <div className={`p-12 border rounded-2xl flex flex-col items-center justify-center text-center gap-2 ${
                isDark ? 'bg-zinc-900/40 border-white/5 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
              }`}>
                <Users size={32} className="text-zinc-500 mb-1" />
                <span className="text-base font-bold">No Active Rooms</span>
                <p className={`text-xs max-w-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  Create a new server above or join an existing match.
                </p>
              </div>
            ) : (
              rooms.map((room) => (
                <div
                  key={room.id}
                  className={`border p-4 rounded-2xl flex justify-between items-center transition-all shadow-sm group ${
                    isDark ? 'bg-zinc-900/80 hover:bg-zinc-800/95 border-white/10 text-white' : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-900'
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-extrabold text-sm transition-colors ${isDark ? 'text-white group-hover:text-cyan-300' : 'text-zinc-900 group-hover:text-cyan-600'}`}>
                        {room.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          room.gameMode === 'team'
                            ? 'bg-rose-500/20 text-rose-500 border-rose-500/30'
                            : 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30'
                        }`}
                      >
                        {room.gameMode === 'team' ? 'TEAM' : 'SOLO'}
                      </span>
                      {room.isEventMode && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-500 border border-orange-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Flame size={10} /> 2X EVENT
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-2.5 text-xs flex-wrap ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      <span className="flex items-center gap-1">
                        <Users size={12} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
                        Players: <strong className={isDark ? 'text-white' : 'text-zinc-900'}>{room.playerCount}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Bot size={12} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
                        AI: <strong className={room.aiCount === 0 ? 'text-emerald-500' : (isDark ? 'text-zinc-300' : 'text-zinc-800')}>
                          {room.aiCount === 0 ? '0 (No AI)' : `${room.aiCount}`}
                        </strong>
                        {room.aiCount > 0 && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border ml-1 ${
                              room.aiDifficulty === 'easy'
                                ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                                : room.aiDifficulty === 'hard'
                                ? 'bg-rose-500/20 text-rose-600 border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                            }`}
                          >
                            {room.aiDifficulty.toUpperCase()}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => selectRoom(room)}
                    className={`px-4 py-2 font-bold text-xs rounded-xl border transition-all active:scale-95 cursor-pointer ml-3 shrink-0 ${
                      isDark ? 'bg-white/10 hover:bg-cyan-500 hover:text-black text-white border-white/10' : 'bg-zinc-100 hover:bg-cyan-500 hover:text-white text-zinc-900 border-zinc-300'
                    }`}
                  >
                    JOIN
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <div className={`border p-4 sm:p-6 rounded-3xl max-w-sm w-[90vw] max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-4 ${
                isDark ? 'bg-zinc-950 border-cyan-500/40 text-white' : 'bg-white border-zinc-300 text-zinc-900'
              }`}>
                <div className={`flex justify-between items-center border-b pb-2 ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
                  <h3 className="text-lg font-black flex items-center gap-1.5">
                    <Plus size={18} className="text-cyan-500" />
                    <span>Create Server Room</span>
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateRoomSubmit} className="flex flex-col gap-3.5">
                  <div>
                    <label className={`text-xs font-bold block mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>Room Title</label>
                    <input
                      type="text"
                      maxLength={20}
                      value={newRoomTitle}
                      onChange={(e) => setNewRoomTitle(e.target.value)}
                      required
                      className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 ${
                        isDark ? 'bg-zinc-900 border-white/10 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                      }`}
                      placeholder="Cyber Arena #1"
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-bold block mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>Game Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewRoomGameMode('solo')}
                        className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                          newRoomGameMode === 'solo'
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-300 shadow-sm'
                            : (isDark ? 'bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200')
                        }`}
                      >
                        <Swords size={14} />
                        <span>Solo FFA</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRoomGameMode('team')}
                        className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                          newRoomGameMode === 'team'
                            ? 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-300 shadow-sm'
                            : (isDark ? 'bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200')
                        }`}
                      >
                        <Shield size={14} />
                        <span>Team Battle</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>AI Bots (0 ~ 20)</label>
                      <span className="font-mono text-cyan-500 font-extrabold text-sm">
                        {newRoomAiCount}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={newRoomAiCount}
                      onChange={(e) => setNewRoomAiCount(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {[0, 5, 10, 20].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setNewRoomAiCount(count)}
                          className={`py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                            newRoomAiCount === count
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-300'
                              : (isDark ? 'bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200')
                          }`}
                        >
                          {count === 0 ? '0 (None)' : `${count} Bots`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newRoomAiCount > 0 && (
                    <div className={`p-3 rounded-2xl border flex flex-col gap-2 ${
                      isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>
                          <Bot size={13} className="text-cyan-500" />
                          <span>AI Difficulty</span>
                        </label>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            newRoomAiDifficulty === 'easy'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                              : newRoomAiDifficulty === 'hard'
                              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {newRoomAiDifficulty.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewRoomAiDifficulty('easy')}
                          className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-xs font-bold transition-all cursor-pointer ${
                            newRoomAiDifficulty === 'easy'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-300 shadow-sm'
                              : (isDark ? 'bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200')
                          }`}
                        >
                          <span className="font-black text-sm">Easy</span>
                          <span className="text-[9px] opacity-80">Relaxed</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewRoomAiDifficulty('normal')}
                          className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-xs font-bold transition-all cursor-pointer ${
                            newRoomAiDifficulty === 'normal'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-300 shadow-sm'
                              : (isDark ? 'bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200')
                          }`}
                        >
                          <span className="font-black text-sm">Normal</span>
                          <span className="text-[9px] opacity-80">Balanced</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewRoomAiDifficulty('hard')}
                          className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-xs font-bold transition-all cursor-pointer ${
                            newRoomAiDifficulty === 'hard'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-300 shadow-sm'
                              : (isDark ? 'bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200')
                          }`}
                        >
                          <span className="font-black text-sm">Hard</span>
                          <span className="text-[9px] opacity-80">Aggressive</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-extrabold text-sm rounded-xl hover:opacity-95 transition-all shadow-lg shadow-cyan-500/30 cursor-pointer mt-1"
                  >
                    Launch Server
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (viewState === 'skin_select') {
    const isTeamMode = currentRoom?.gameMode === 'team';
    return (
      <div className={`absolute inset-0 flex items-center justify-center p-4 select-none ${
        isDark ? 'bg-[#030712] text-white' : 'bg-white text-zinc-900'
      }`}>
        <div className={`p-6 sm:p-7 rounded-3xl border shadow-2xl max-w-sm w-full flex flex-col items-center gap-4 text-center ${
          isDark ? 'bg-zinc-950 border-white/10 text-white' : 'bg-white border-zinc-300 text-zinc-900'
        }`}>
          <div className={`w-full flex justify-between items-center text-xs border-b pb-3 ${isDark ? 'text-zinc-400 border-white/10' : 'text-zinc-600 border-zinc-200'}`}>
            <button
              onClick={backToLobby}
              className="flex items-center gap-1 hover:opacity-80 transition-colors cursor-pointer"
            >
              <Users size={14} />
              <span>Back to Servers</span>
            </button>
            <span className="font-bold text-cyan-500 truncate max-w-[150px]">
              {currentRoom?.title}
            </span>
          </div>
          <div>
            <h2
              className="text-2xl sm:text-3xl font-black mb-0.5 tracking-tight"
              style={{ textShadow: isDark ? `0 0 16px ${selectedSkinColor}` : 'none' }}
            >
              SNAKEGAME3D
            </h2>
            <div className={`flex items-center justify-center gap-2 text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>
                {isTeamMode ? 'Team Battle' : 'Solo FFA'}
              </span>
              <span>•</span>
              <span>
                AI: <strong className={isDark ? 'text-white' : 'text-zinc-900'}>{currentRoom?.aiCount} bots</strong>
              </span>
              {currentRoom?.isEventMode && (
                <span className="text-orange-500 font-bold">• 2X Event</span>
              )}
            </div>
          </div>

          <div className="w-full flex items-center justify-center py-2">
            <div
              className="w-16 h-16 rounded-full border-2 border-white/90 shadow-xl flex items-center justify-around px-2 relative transition-all duration-300"
              style={{
                backgroundColor: selectedSkinColor,
                boxShadow: `0 0 25px ${selectedSkinColor}`,
              }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              </div>
              <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              </div>
            </div>
          </div>

          {isTeamMode ? (
            <div className="w-full flex flex-col gap-2">
              <div className={`text-[11px] font-bold text-left ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>Choose Team</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTeam('red')}
                  className={`py-3 px-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    selectedTeam === 'red'
                      ? 'border-red-500 bg-red-950/20 shadow-lg shadow-red-600/30 scale-102'
                      : (isDark ? 'border-white/10 bg-zinc-900/60 opacity-60 hover:opacity-100' : 'border-zinc-200 bg-zinc-50 opacity-70 hover:opacity-100')
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-[#ff3366] shadow-sm shadow-red-500" />
                  <span className="text-xs font-black text-red-500">RED TEAM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTeam('blue')}
                  className={`py-3 px-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    selectedTeam === 'blue'
                      ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/30 scale-102'
                      : (isDark ? 'border-white/10 bg-zinc-900/60 opacity-60 hover:opacity-100' : 'border-zinc-200 bg-zinc-50 opacity-70 hover:opacity-100')
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-[#00f3ff] shadow-sm shadow-cyan-400" />
                  <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">BLUE TEAM</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <div className={`text-[11px] mb-2 font-bold text-left ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>Neon Color Skin</div>
              <div className="grid grid-cols-4 gap-2.5">
                {SKIN_PRESETS.map((preset) => {
                  const isSelected = selectedSkinColor === preset.color;
                  return (
                    <button
                      key={preset.color}
                      onClick={() => setSelectedSkinColor(preset.color)}
                      className={`h-10 rounded-xl flex items-center justify-center border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-zinc-900 dark:border-white scale-105 shadow-md'
                          : 'border-transparent opacity-65 hover:opacity-100 hover:scale-100'
                      }`}
                      style={{ backgroundColor: preset.color }}
                      title={preset.name}
                    >
                      {isSelected && <Check size={16} className="text-black font-black" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="w-full text-left">
            <label className={`text-[11px] mb-1 block font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>Nickname</label>
            <input
              type="text"
              maxLength={12}
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 ${
                isDark ? 'bg-zinc-900 border-white/10 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
              }`}
              placeholder="CyberSnake"
            />
          </div>

          <button
            onClick={handlePlaySubmit}
            className="w-full py-3.5 rounded-2xl font-black text-black text-sm tracking-wide transition-all active:scale-98 shadow-lg cursor-pointer"
            style={{
              backgroundColor: selectedSkinColor,
              boxShadow: `0 0 20px ${selectedSkinColor}80`,
            }}
          >
            PLAY NOW
          </button>
        </div>
      </div>
    );
  }

  const isTeamMode = currentRoom?.gameMode === 'team';
  const teamScores = gameState?.teamScores || { red: 0, blue: 0 };
  const totalTeamScore = Math.max(1, teamScores.red + teamScores.blue);
  const redPercent = Math.round((teamScores.red / totalTeamScore) * 100);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 select-none overflow-hidden">
      <div className="flex justify-between items-center pointer-events-auto relative w-full gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={backToLobby}
            className="p-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
            title="Leave Room"
          >
            <LogOut size={14} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
          >
            <Sun size={14} />
          </button>
          <h1
            className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5"
            style={{ textShadow: `0 0 12px ${selectedSkinColor}` }}
          >
            <span>SNAKEGAME3D</span>
          </h1>
          {isAlive && (
            <div className="font-mono text-xs sm:text-sm font-bold text-white/90 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 flex items-center gap-1.5">
              <span>Score:</span> <span className="text-cyan-400">{Math.floor(player.score)}</span>
              <span className="text-zinc-500">|</span>
              <GameTimer createdAt={currentRoom?.createdAt || Date.now()} />
            </div>
          )}
        </div>

        {isTeamMode && (
          <div className="absolute left-1/2 -translate-x-1/2 top-1 flex flex-col items-center gap-1 pointer-events-none hidden md:flex">
            <div className="flex items-center gap-3 text-xs font-black font-mono">
              <span className="text-[#ff3366]">RED: {teamScores.red}</span>
              <span className="text-zinc-500 font-normal">VS</span>
              <span className="text-[#00f3ff]">BLUE: {teamScores.blue}</span>
            </div>
            <div className="w-48 h-2 bg-zinc-800 rounded-full overflow-hidden flex border border-white/10">
              <div
                className="bg-[#ff3366] h-full transition-all duration-300"
                style={{ width: `${redPercent}%` }}
              />
              <div
                className="bg-[#00f3ff] h-full transition-all duration-300"
                style={{ width: `${100 - redPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={toggle3D2D}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              is3D
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm shadow-cyan-500/20'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm shadow-emerald-500/20'
            }`}
          >
            <Eye size={13} />
            <span>{is3D ? '3D View' : '2D View'}</span>
          </button>
          <button
            onClick={toggleSound}
            className="p-1.5 bg-black/40 hover:bg-black/60 text-white border border-white/10 rounded-full transition-all cursor-pointer"
            title="Toggle Sound"
          >
            {soundEnabled ? (
              <Volume2 size={16} className="text-emerald-400" />
            ) : (
              <VolumeX size={16} className="text-zinc-500" />
            )}
          </button>
        </div>
      </div>

      {gameState && gameState.leaderboard.length > 0 && isAlive && (
        <div className="absolute top-14 right-3 w-40 sm:w-44 bg-black/50 backdrop-blur-md rounded-xl p-2 border border-white/10 pointer-events-auto">
          <div className="text-[10px] font-bold text-yellow-400 mb-1 border-b border-white/10 pb-0.5 flex justify-between">
            <span>Leaderboard</span>
            <span className="text-[9px] text-zinc-400">{isTeamMode ? 'Team MVP' : 'TOP 5'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {gameState.leaderboard.slice(0, 5).map((entry, i) => (
              <div
                key={entry.id}
                className={`flex justify-between items-center text-[10px] px-1 py-0.5 rounded ${
                  entry.id === playerId ? 'bg-cyan-500/20 font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-1 truncate max-w-[90px]">
                  <span className="text-zinc-500 font-mono text-[9px]">{i + 1}.</span>
                  <span style={{ color: entry.color }} className="truncate">
                    {entry.name}
                  </span>
                </div>
                <span className="font-mono text-zinc-300">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAlive && (
        <div className="pointer-events-none w-full flex justify-between items-end pb-3 px-3 sm:px-6 z-20">
          <div className="pointer-events-auto">
            <div
              ref={joystickContainerRef}
              onMouseDown={handleJoystickStart}
              onTouchStart={handleJoystickStart}
              className="relative w-28 h-28 rounded-full bg-black/40 border-2 border-cyan-400/40 backdrop-blur-md flex items-center justify-center touch-none shadow-lg shadow-cyan-950/40"
            >
              <div
                className="w-12 h-12 rounded-full border-2 border-white shadow-md flex items-center justify-center pointer-events-none"
                style={{
                  backgroundColor: selectedSkinColor,
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                  boxShadow: `0 0 15px ${selectedSkinColor}`,
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white opacity-90" />
              </div>
            </div>
          </div>

          <div className="pointer-events-auto">
            <button
              onMouseDown={() => setIsBoosting(true)}
              onMouseUp={() => setIsBoosting(false)}
              onMouseLeave={() => setIsBoosting(false)}
              onTouchStart={(e) => {
                e.preventDefault();
                setIsBoosting(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsBoosting(false);
              }}
              onTouchCancel={() => setIsBoosting(false)}
              className={`w-24 h-24 rounded-full flex flex-col items-center justify-center select-none touch-none transition-all active:scale-95 cursor-pointer ${
                isBoosting
                  ? 'bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-300 scale-95 border-2 border-white shadow-orange-500/80 shadow-2xl'
                  : 'bg-gradient-to-tr from-orange-600/80 to-amber-500/80 border-2 border-amber-400/60 shadow-lg'
              }`}
            >
              <Flame size={26} className="text-white" />
              <span className="text-[10px] font-black text-white tracking-widest uppercase">
                BOOST
              </span>
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isDead && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/75 backdrop-blur-sm p-4"
          >
            <div className="bg-zinc-950 p-6 rounded-3xl border border-red-500/30 shadow-2xl max-w-sm w-full flex flex-col items-center gap-4 text-center">
              <h2 className="text-3xl font-black text-red-500">YOU DIED!</h2>
              <p className="text-zinc-300 text-sm">
                Final Score: <strong className="text-cyan-400 font-mono text-lg">{Math.floor(player?.score || 10)}</strong>
              </p>
              <div className="w-full flex flex-col gap-2 mt-2">
                <button
                  onClick={handlePlaySubmit}
                  className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-sm rounded-xl transition-all active:scale-98 shadow-lg shadow-cyan-500/30 cursor-pointer"
                >
                  RESPAWN
                </button>
                <button
                  onClick={backToLobby}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs rounded-xl border border-white/10 transition-colors cursor-pointer"
                >
                  Back to Lobby
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameState?.gameEnded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/75 backdrop-blur-sm p-4"
          >
            <div className="bg-zinc-950 p-6 rounded-3xl border border-yellow-500/30 shadow-2xl max-w-sm w-full flex flex-col items-center gap-4 text-center">
              <h2 className="text-3xl font-black text-yellow-400">GAME OVER!</h2>
              <p className="text-zinc-300 text-sm">
                Winner: <strong className="text-cyan-400 font-mono text-lg">{gameState.leaderboard[0]?.name || 'N/A'}</strong>
              </p>
              <div className="w-full flex flex-col gap-2 mt-2">
                <button
                  onClick={backToLobby}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs rounded-xl border border-white/10 transition-colors cursor-pointer"
                >
                  Back to Lobby
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
