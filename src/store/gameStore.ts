/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { GameState, RoomConfig, GameMode, TeamId, AiDifficulty } from '../shared/types';
import { sounds } from '../utils/audio';

export type AppViewState = 'lobby' | 'skin_select' | 'in_game';

interface GameStore {
  socket: Socket | null;
  gameState: GameState | null;
  playerId: string | null;
  rooms: RoomConfig[];
  currentRoom: RoomConfig | null;
  viewState: AppViewState;
  joystickVector: { x: number; y: number; active: boolean };
  isBoosting: boolean;
  is3D: boolean;
  selectedSkinColor: string;
  selectedTeam: TeamId;
  playerName: string;
  isTouchDevice: boolean;
  soundEnabled: boolean;
  theme: 'dark' | 'light';
  connect: () => void;
  fetchRooms: () => void;
  createRoom: (
    title: string,
    gameMode: GameMode,
    aiCount: number,
    isEventMode: boolean,
    aiDifficulty: AiDifficulty
  ) => void;
  selectRoom: (room: RoomConfig) => void;
  backToLobby: () => void;
  startGame: (nickname?: string) => void;
  sendPlayerState: (data: any) => void;
  sendCollectOrb: (orbId: string) => void;
  setJoystickVector: (x: number, y: number, active: boolean) => void;
  setIsBoosting: (boosting: boolean) => void;
  toggle3D2D: () => void;
  setSelectedSkinColor: (color: string) => void;
  setSelectedTeam: (team: TeamId) => void;
  setPlayerName: (name: string) => void;
  toggleSound: () => void;
  toggleTheme: () => void;
  setIsTouchDevice: (isTouch: boolean) => void;
}

export const globalGameState: { current: GameState | null } = { current: null };
export const globalControls = {
  joystick: { x: 0, y: 0, active: false },
  isBoosting: false,
  mouseWorldTarget: { x: 0, y: 0, active: false },
};

let lastUiUpdate = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  gameState: null,
  playerId: null,
  rooms: [],
  currentRoom: null,
  viewState: 'lobby',
  joystickVector: { x: 0, y: 0, active: false },
  isBoosting: false,
  is3D: true,
  selectedSkinColor: '#00f3ff',
  selectedTeam: 'red',
  playerName: 'CyberSnake',
  isTouchDevice: typeof window !== 'undefined' ? ('ontouchstart' in window || navigator.maxTouchPoints > 0) : false,
  soundEnabled: true,
  connect: () => {
    if (get().socket) return;
    const socket = io();
    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('get_rooms');
    });
    socket.on('init', (id: string) => {
      set({ playerId: id });
    });
    socket.on('rooms_list', (rooms: RoomConfig[]) => {
      set({ rooms });
    });
    socket.on('state', (state: GameState) => {
      globalGameState.current = state;
      const now = Date.now();
      if (now - lastUiUpdate > 80) {
        set({ gameState: state });
        lastUiUpdate = now;
      }
    });
    set({ socket });
  },
  fetchRooms: () => {
    const { socket } = get();
    if (socket) socket.emit('get_rooms');
  },
  createRoom: (title, gameMode, aiCount, isEventMode, aiDifficulty) => {
    const { socket } = get();
    if (socket) {
      socket.emit(
        'create_room',
        { title, gameMode, aiCount, isEventMode, aiDifficulty },
        (res: { success: boolean; room: RoomConfig }) => {
          if (res?.success && res.room) {
            socket.emit('join_room', res.room.id, () => {
              set({
                currentRoom: res.room,
                viewState: 'skin_select',
                selectedSkinColor: res.room.gameMode === 'team' ? '#ff3366' : get().selectedSkinColor,
                selectedTeam: 'red',
              });
            });
          }
        }
      );
    }
  },
  selectRoom: (room) => {
    const { socket } = get();
    if (socket) {
      socket.emit('join_room', room.id, (res: { success: boolean }) => {
        if (res?.success) {
          set({
            currentRoom: room,
            viewState: 'skin_select',
            selectedSkinColor: room.gameMode === 'team' ? '#ff3366' : get().selectedSkinColor,
            selectedTeam: 'red',
          });
        }
      });
    }
  },
  backToLobby: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('leave_room');
      socket.emit('get_rooms');
    }
    set({ currentRoom: null, viewState: 'lobby', gameState: null });
    globalGameState.current = null;
  },
  startGame: (nickname) => {
    const { socket, currentRoom, selectedSkinColor, selectedTeam, playerName } = get();
    const finalName = nickname?.trim() || playerName;
    if (socket) {
      const isTeam = currentRoom?.gameMode === 'team';
      const color = isTeam ? (selectedTeam === 'red' ? '#ff3366' : '#00f3ff') : selectedSkinColor;
      socket.emit('join_game', {
        skinColor: color,
        name: finalName,
        team: isTeam ? selectedTeam : undefined,
      });
      set({
        viewState: 'in_game',
        playerName: finalName,
        selectedSkinColor: color,
      });
    }
  },
  sendPlayerState: (data) => {
    const { socket } = get();
    if (socket) {
      socket.emit('update_state', data);
    }
  },
  sendCollectOrb: (orbId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('collect_orb', orbId);
    }
  },
  setJoystickVector: (x, y, active) => {
    globalControls.joystick = { x, y, active };
    set({ joystickVector: { x, y, active } });
  },
  setIsBoosting: (boosting) => {
    globalControls.isBoosting = boosting;
    set({ isBoosting: boosting });
  },
  toggle3D2D: () => {
    set((state) => ({ is3D: !state.is3D }));
  },
  setSelectedSkinColor: (selectedSkinColor) => set({ selectedSkinColor }),
  setSelectedTeam: (selectedTeam) => {
    const color = selectedTeam === 'red' ? '#ff3366' : '#00f3ff';
    set({ selectedTeam, selectedSkinColor: color });
  },
  setPlayerName: (playerName) => set({ playerName }),
  toggleSound: () => {
    const next = !get().soundEnabled;
    sounds.enabled = next;
    set({ soundEnabled: next });
  },
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setIsTouchDevice: (isTouchDevice) => set({ isTouchDevice }),
}));
