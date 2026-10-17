/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameMode = 'solo' | 'team';
export type TeamId = 'red' | 'blue';

export type GameState = {
  roomId?: string;
  gameMode?: GameMode;
  players: Record<string, Player>;
  orbs: Record<string, Orb>;
  leaderboard: LeaderboardEntry[];
  teamScores?: { red: number; blue: number };
  isEventMode?: boolean;
  gameEnded?: boolean;
};

export type PlayerState = 'alive' | 'dead' | 'spectating';

export type Player = {
  id: string;
  name: string;
  color: string;
  team?: TeamId;
  segments: { x: number; y: number }[];
  score: number;
  isBoosting: boolean;
  state: PlayerState;
  currentAngle: number;
  inputs: { left: boolean; right: boolean; boost: boolean };
};

export type Orb = {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  color: string;
  team?: TeamId;
};

export type AiDifficulty = 'easy' | 'normal' | 'hard';

export interface RoomConfig {
  id: string;
  title: string;
  hostId: string;
  gameMode: GameMode;
  aiCount: number;
  aiDifficulty: AiDifficulty;
  isEventMode: boolean;
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
}

export const WORLD_SIZE = 280;
export const BASE_SPEED = 8;
export const BOOST_SPEED = 16;
export const TICK_RATE = 60;
export const INITIAL_LENGTH = 10;
export const SEGMENT_SPACING = 0.52;
export const TURN_SPEED = Math.PI * 0.95;

export function getSnakeSpeed(score: number, isBoosting: boolean): number {
  const factor = Math.max(0, Math.min(1, (score - 10) / 110));
  const base = (10.8 - factor * 3.6) * 0.75;
  const boost = (19.5 - factor * 5.5) * 0.75;
  return isBoosting ? boost : base;
}
