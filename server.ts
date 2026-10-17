/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Player,
  Orb,
  WORLD_SIZE,
  BASE_SPEED,
  BOOST_SPEED,
  TICK_RATE,
  INITIAL_LENGTH,
  SEGMENT_SPACING,
  TURN_SPEED,
  RoomConfig,
  GameMode,
  TeamId,
  AiDifficulty,
  getSnakeSpeed,
} from './src/shared/types.ts';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = 3000;

const COLORS = [
  '#00f3ff', // cyan
  '#ff007f', // pink
  '#39ff14', // green
  '#ff9900', // orange
  '#bd93f9', // purple
  '#ff3366', // red
  '#f1fa8c', // yellow
  '#8be9fd', // ice blue
];

const TEAM_COLORS: Record<TeamId, string> = {
  red: '#ff3366',
  blue: '#00f3ff',
};

const BOT_NAMES = [
  'CyberViper',
  'NeonPulse',
  'QuantumFang',
  'MatrixBoa',
  'HyperSnake',
  'LaserCobra',
  'PlasmaHydra',
  'SolarSerpent',
  'TitanPython',
  'ShadowWorm',
  'ApexAnaconda',
  'VortexNaga',
  'ByteMamba',
  'GlitchRacer',
  'ZeroKelvin',
  'OmegaTail',
  'CosmoStrike',
  'FluxCrawler',
  'NeonSpecter',
  'ZenithCoil',
];

interface BotInstance {
  id: string;
  name: string;
  color: string;
  team?: TeamId;
  targetAngle: number;
  currentAngle: number;
  turnSpeed: number;
  speedMult: number;
  boostTimer: number;
  respawnTimer: number;
}

interface RoomData {
  config: RoomConfig;
  state: GameState;
  bots: Record<string, BotInstance>;
}

const rooms: Record<string, RoomData> = {};
const socketToRoom: Record<string, string> = {};

function spawnOrbForRoom(room: RoomData, x?: number, y?: number, value = 1, color?: string, force = false) {
  const maxOrbs = room.config.isEventMode ? 750 : 380;
  if (!force && Object.keys(room.state.orbs).length >= maxOrbs) return;
  const id = uuidv4();
  const orbValue = room.config.isEventMode ? value * 2 : value;
  room.state.orbs[id] = {
    id,
    x: x ?? (Math.random() - 0.5) * (WORLD_SIZE - 20),
    y: y ?? (Math.random() - 0.5) * (WORLD_SIZE - 20),
    value: orbValue,
    color: color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

function initBotForRoom(room: RoomData, botIndex: number): BotInstance {
  const id = `bot_${room.config.id}_${botIndex}`;
  const name = BOT_NAMES[botIndex % BOT_NAMES.length];
  const difficulty = room.config.aiDifficulty || 'easy';
  let color = COLORS[botIndex % COLORS.length];
  let team: TeamId | undefined = undefined;

  if (room.config.gameMode === 'team') {
    team = botIndex % 2 === 0 ? 'red' : 'blue';
    color = TEAM_COLORS[team];
  }

  const startX = (Math.random() - 0.5) * (WORLD_SIZE - 35);
  const startY = (Math.random() - 0.5) * (WORLD_SIZE - 35);
  const angle = Math.random() * Math.PI * 2;
  const initialLength = INITIAL_LENGTH;
  const segments = [];

  for (let i = 0; i < initialLength; i++) {
    segments.push({
      x: startX - Math.cos(angle) * i * SEGMENT_SPACING,
      y: startY - Math.sin(angle) * i * SEGMENT_SPACING,
    });
  }

  const diffTag = difficulty === 'easy' ? 'E' : difficulty === 'hard' ? 'H' : 'N';
  const displayName = team ? `[${team.toUpperCase()}] ${name}` : `[AI-${diffTag}] ${name}`;

  room.state.players[id] = {
    id,
    name: displayName,
    color,
    team,
    segments,
    score: initialLength,
    isBoosting: false,
    state: 'alive',
    currentAngle: angle,
    inputs: { left: false, right: false, boost: false },
  };

  const turnSpeedMult = difficulty === 'easy' ? 0.45 : difficulty === 'hard' ? 1.05 : 0.70;
  const speedMult = difficulty === 'easy' ? 0.72 : difficulty === 'hard' ? 1.05 : 0.88;

  return {
    id,
    name,
    color,
    team,
    targetAngle: angle,
    currentAngle: angle,
    turnSpeed: TURN_SPEED * turnSpeedMult,
    speedMult,
    boostTimer: 0,
    respawnTimer: 0,
  };
}

function createRoom(
  title: string,
  hostId: string,
  gameMode: GameMode,
  aiCount: number,
  isEventMode: boolean,
  aiDifficulty?: AiDifficulty
): RoomData {
  const roomId = `room_${uuidv4().substring(0, 8)}`;
  const clampedAi = Math.max(0, Math.min(20, Math.floor(aiCount)));
  const diff: AiDifficulty =
    aiDifficulty && ['easy', 'normal', 'hard'].includes(aiDifficulty) ? aiDifficulty : 'easy';

  const roomConfig: RoomConfig = {
    id: roomId,
    title,
    hostId,
    gameMode: gameMode || 'solo',
    aiCount: clampedAi,
    aiDifficulty: diff,
    isEventMode,
    playerCount: 0,
    maxPlayers: 16,
    createdAt: Date.now(),
  };

  const roomState: GameState = {
    roomId,
    gameMode: roomConfig.gameMode,
    players: {},
    orbs: {},
    leaderboard: [],
    teamScores: { red: 0, blue: 0 },
    isEventMode,
  };

  const roomData: RoomData = {
    config: roomConfig,
    state: roomState,
    bots: {},
  };

  const initialOrbs = isEventMode ? 300 : 150;
  for (let i = 0; i < initialOrbs; i++) {
    spawnOrbForRoom(roomData);
  }

  for (let i = 0; i < clampedAi; i++) {
    const bot = initBotForRoom(roomData, i);
    roomData.bots[bot.id] = bot;
  }

  rooms[roomId] = roomData;
  return roomData;
}

function getRoomsList(): RoomConfig[] {
  return Object.values(rooms).map((r) => {
    const humanCount = Object.values(r.state.players).filter((p) => !p.id.startsWith('bot_')).length;
    r.config.playerCount = humanCount;
    return r.config;
  });
}

function broadcastRoomsList() {
  io.emit('rooms_list', getRoomsList());
}

let snakeCounter = 1;

io.on('connection', (socket: Socket) => {
  socket.emit('rooms_list', getRoomsList());

  socket.on('get_rooms', () => {
    socket.emit('rooms_list', getRoomsList());
  });

  socket.on(
    'create_room',
    (
      data: {
        title: string;
        gameMode: GameMode;
        aiCount: number;
        isEventMode: boolean;
        aiDifficulty?: AiDifficulty;
      },
      callback
    ) => {
      const title = data.title?.trim() || `CyberArena #${Math.floor(Math.random() * 1000)}`;
      const gameMode = data.gameMode === 'team' ? 'team' : 'solo';
      const aiCount = typeof data.aiCount === 'number' ? data.aiCount : 5;
      const isEventMode = Boolean(data.isEventMode);
      const aiDifficulty: AiDifficulty =
        data.aiDifficulty && ['easy', 'normal', 'hard'].includes(data.aiDifficulty)
          ? data.aiDifficulty
          : 'easy';

      const room = createRoom(title, socket.id, gameMode, aiCount, isEventMode, aiDifficulty);
      broadcastRoomsList();
      if (callback) {
        callback({ success: true, room: room.config });
      }
    }
  );

  socket.on('join_room', (roomId: string, callback) => {
    const room = rooms[roomId];
    if (!room) {
      if (callback) callback({ success: false, error: 'Room not found.' });
      return;
    }

    const prevRoomId = socketToRoom[socket.id];
    if (prevRoomId && rooms[prevRoomId]) {
      socket.leave(prevRoomId);
      delete rooms[prevRoomId].state.players[socket.id];
    }

    socketToRoom[socket.id] = roomId;
    socket.join(roomId);
    socket.emit('init', socket.id);
    socket.emit('state', room.state);
    broadcastRoomsList();
    if (callback) {
      callback({ success: true, room: room.config });
    }
  });

  socket.on('join_game', (data?: { skinColor?: string; name?: string; team?: TeamId }) => {
    const roomId = socketToRoom[socket.id];
    const room = rooms[roomId];
    if (!room) return;

    const name = data?.name?.trim() || `Player-${snakeCounter++}`;
    let color = data?.skinColor || COLORS[Math.floor(Math.random() * COLORS.length)];
    let team: TeamId | undefined = undefined;

    if (room.config.gameMode === 'team') {
      team = data?.team === 'blue' ? 'blue' : 'red';
      color = TEAM_COLORS[team];
    }

    const startX = (Math.random() - 0.5) * (WORLD_SIZE - 30);
    const startY = (Math.random() - 0.5) * (WORLD_SIZE - 30);
    const angle = Math.random() * Math.PI * 2;
    const segments = [];

    for (let i = 0; i < INITIAL_LENGTH; i++) {
      segments.push({
        x: startX - Math.cos(angle) * i * SEGMENT_SPACING,
        y: startY - Math.sin(angle) * i * SEGMENT_SPACING,
      });
    }

    room.state.players[socket.id] = {
      id: socket.id,
      name,
      color,
      team,
      segments,
      score: INITIAL_LENGTH,
      isBoosting: false,
      state: 'alive',
      currentAngle: angle,
      inputs: { left: false, right: false, boost: false },
    };

    socket.emit('init', socket.id);
    broadcastRoomsList();
  });

  socket.on(
    'update_state',
    (data: {
      segments: any[];
      score: number;
      currentAngle: number;
      isBoosting: boolean;
      state: string;
    }) => {
      const roomId = socketToRoom[socket.id];
      const room = rooms[roomId];
      if (!room) return;
      const player = room.state.players[socket.id];
      if (player && player.state === 'alive') {
        // Drop orbs 1:1 when boosting and shrinking
        if (data.isBoosting && data.segments.length < player.segments.length) {
          for (let i = data.segments.length; i < player.segments.length; i++) {
            const seg = player.segments[i];
            if (seg) {
              spawnOrbForRoom(room, seg.x, seg.y, 1, player.color, true);
            }
          }
        }
        player.segments = data.segments;
        player.score = data.score;
        player.currentAngle = data.currentAngle;
        player.isBoosting = data.isBoosting;
        if (data.state === 'dead') {
          player.state = 'dead';
          const dropMult = room.config.isEventMode ? 2 : 1;
          player.segments.forEach((seg, i) => {
            if (i % 2 === 0) spawnOrbForRoom(room, seg.x, seg.y, 1.5 * dropMult, player.color, true);
          });
        }
      }
    }
  );

  socket.on('collect_orb', (orbId: string) => {
    const roomId = socketToRoom[socket.id];
    const room = rooms[roomId];
    if (room && room.state.orbs[orbId]) {
      delete room.state.orbs[orbId];
    }
  });

  socket.on('leave_room', () => {
    const roomId = socketToRoom[socket.id];
    if (roomId && rooms[roomId]) {
      socket.leave(roomId);
      delete rooms[roomId].state.players[socket.id];
      delete socketToRoom[socket.id];

      const humanCount = Object.values(rooms[roomId].state.players).filter((p) => !p.id.startsWith('bot_')).length;
      if (humanCount === 0) {
        delete rooms[roomId];
      }
      broadcastRoomsList();
    }
  });

  socket.on('disconnect', () => {
    const roomId = socketToRoom[socket.id];
    if (roomId && rooms[roomId]) {
      const room = rooms[roomId];
      const player = room.state.players[socket.id];
      if (player && player.state === 'alive') {
        player.segments.forEach((seg, i) => {
          if (i % 2 === 0) spawnOrbForRoom(room, seg.x, seg.y, 1.5, player.color, true);
        });
      }
      delete room.state.players[socket.id];
      delete socketToRoom[socket.id];

      const humanCount = Object.values(room.state.players).filter((p) => !p.id.startsWith('bot_')).length;
      if (humanCount === 0) {
        delete rooms[roomId];
      }
      broadcastRoomsList();
    }
  });
});

let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const delta = (now - lastTick) / 1000;
  lastTick = now;

  for (const roomId in rooms) {
    const room = rooms[roomId];
    const { state, bots, config } = room;

    const timeLimit = 5 * 60 * 1000;
    if (Date.now() - config.createdAt > timeLimit) {
      state.gameEnded = true;
    }

    for (const botId in bots) {
      const bot = bots[botId];
      const player = state.players[botId];
      if (!player) continue;

      if (player.state === 'dead') {
        bot.respawnTimer += delta;
        if (bot.respawnTimer > 2.5) {
          const newBot = initBotForRoom(room, parseInt(botId.split('_').pop() || '0', 10));
          bots[botId] = newBot;
        }
        continue;
      }

      if (player.segments.length === 0) continue;
      const head = { ...player.segments[0] };
      const boundary = WORLD_SIZE / 2;
      const difficulty = config.aiDifficulty || 'easy';

      const margin = difficulty === 'easy' ? 24 : 16;
      if (head.x > boundary - margin) bot.targetAngle = Math.PI;
      else if (head.x < -boundary + margin) bot.targetAngle = 0;
      else if (head.y > boundary - margin) bot.targetAngle = -Math.PI / 2;
      else if (head.y < -boundary + margin) bot.targetAngle = Math.PI / 2;
      else {
        if (difficulty === 'easy') {
          let shouldAvoid = false;
          for (const otherId in state.players) {
            if (otherId === botId) continue;
            const other = state.players[otherId];
            if (other.state !== 'alive' || other.segments.length === 0) continue;
            const oHead = other.segments[0];
            const dx = oHead.x - head.x;
            const dy = oHead.y - head.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 14 * 14) {
              bot.targetAngle = Math.atan2(-dy, -dx);
              shouldAvoid = true;
              break;
            }
          }

          if (!shouldAvoid && Math.random() < 0.03) {
            let closestDistSq = 22 * 22;
            let targetAngle = bot.currentAngle + (Math.random() - 0.5) * 0.8;
            for (const orbId in state.orbs) {
              const orb = state.orbs[orbId];
              const dx = orb.x - head.x;
              const dy = orb.y - head.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < closestDistSq) {
                closestDistSq = distSq;
                targetAngle = Math.atan2(dy, dx);
              }
            }
            bot.targetAngle = targetAngle;
          }
          player.isBoosting = false;
        } else if (difficulty === 'normal') {
          if (Math.random() < 0.04) {
            let closestDistSq = 32 * 32;
            let targetAngle = bot.currentAngle;
            for (const orbId in state.orbs) {
              const orb = state.orbs[orbId];
              const dx = orb.x - head.x;
              const dy = orb.y - head.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < closestDistSq) {
                closestDistSq = distSq;
                targetAngle = Math.atan2(dy, dx);
              }
            }
            bot.targetAngle = targetAngle;
          }

          if (bot.boostTimer > 0) {
            bot.boostTimer -= delta;
            player.isBoosting = true;
          } else {
            player.isBoosting = false;
            if (Math.random() < 0.006 && player.score > 12) {
              bot.boostTimer = 0.9;
            }
          }
        } else {
          let hunted = false;
          for (const otherId in state.players) {
            if (otherId === botId) continue;
            const other = state.players[otherId];
            if (other.state !== 'alive' || other.segments.length === 0) continue;
            if (config.gameMode === 'team' && player.team && other.team && player.team === other.team) continue;
            const oHead = other.segments[0];
            const dx = oHead.x - head.x;
            const dy = oHead.y - head.y;
            const distSq = dx * dx + dy * dy;
            if (player.score > other.score && distSq < 22 * 22) {
              const futureX = oHead.x + Math.cos(other.currentAngle) * 6;
              const futureY = oHead.y + Math.sin(other.currentAngle) * 6;
              bot.targetAngle = Math.atan2(futureY - head.y, futureX - head.x);
              player.isBoosting = player.score > 11;
              hunted = true;
              break;
            }
          }

          if (!hunted && Math.random() < 0.06) {
            let closestDistSq = 45 * 45;
            let targetAngle = bot.currentAngle;
            for (const orbId in state.orbs) {
              const orb = state.orbs[orbId];
              const dx = orb.x - head.x;
              const dy = orb.y - head.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < closestDistSq) {
                closestDistSq = distSq;
                targetAngle = Math.atan2(dy, dx);
              }
            }
            bot.targetAngle = targetAngle;
            player.isBoosting = closestDistSq < 16 * 16 && player.score > 12;
          }
        }
      }

      let diff = bot.targetAngle - bot.currentAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      bot.currentAngle += Math.sign(diff) * Math.min(Math.abs(diff), bot.turnSpeed * delta);
      player.currentAngle = bot.currentAngle;

      // Handle bot boost score reduction & 1:1 orb dropping
      if (player.isBoosting) {
        player.score -= 2.2 * delta;
        if (player.score < 10) {
          player.score = 10;
          player.isBoosting = false;
        }
      }

      const baseSpeed = getSnakeSpeed(player.score, player.isBoosting);
      const speed = baseSpeed * (bot.speedMult || 0.85);
      head.x += Math.cos(bot.currentAngle) * speed * delta;
      head.y += Math.sin(bot.currentAngle) * speed * delta;

      if (head.x < -boundary || head.x > boundary || head.y < -boundary || head.y > boundary) {
        player.state = 'dead';
        continue;
      }

      player.segments[0] = head;
      const spacing = SEGMENT_SPACING;
      for (let i = 1; i < player.segments.length; i++) {
        const prev = player.segments[i - 1];
        const curr = player.segments[i];
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > spacing) {
          const ang = Math.atan2(dy, dx);
          curr.x = prev.x + Math.cos(ang) * spacing;
          curr.y = prev.y + Math.sin(ang) * spacing;
        }
      }

      const targetLen = Math.max(10, Math.floor(player.score));
      while (player.segments.length > targetLen) {
        const popped = player.segments.pop();
        if (popped && player.isBoosting) {
          spawnOrbForRoom(room, popped.x, popped.y, 1, player.color, true);
        }
      }

      for (const orbId in state.orbs) {
        const orb = state.orbs[orbId];
        const dx = head.x - orb.x;
        const dy = head.y - orb.y;
        if (dx * dx + dy * dy < 4.0) {
          player.score += orb.value;
          delete state.orbs[orbId];
        }
      }

      let dead = false;
      for (const otherId in state.players) {
        if (otherId === botId) continue;
        const other = state.players[otherId];
        if (other.state !== 'alive' || other.segments.length === 0) continue;

        if (config.gameMode === 'team' && player.team && other.team && player.team === other.team) {
          continue;
        }

        const oHead = other.segments[0];
        const hDx = head.x - oHead.x;
        const hDy = head.y - oHead.y;
        if (hDx * hDx + hDy * hDy < 2.4) {
          if (player.score < other.score) {
            dead = true;
            break;
          } else if (player.score > other.score) {
            other.state = 'dead';
            other.segments.forEach((seg, i) => {
              if (i % 2 === 0) spawnOrbForRoom(room, seg.x, seg.y, 1.5, other.color, true);
            });
            continue;
          }
        }

        for (let sIdx = 1; sIdx < other.segments.length; sIdx++) {
          const seg = other.segments[sIdx];
          const dx = head.x - seg.x;
          const dy = head.y - seg.y;
          if (dx * dx + dy * dy < 2.0) {
            dead = true;
            break;
          }
        }
        if (dead) break;
      }

      if (dead) {
        player.state = 'dead';
        player.segments.forEach((seg, i) => {
          if (i % 2 === 0) spawnOrbForRoom(room, seg.x, seg.y, 1.5, player.color, true);
        });
      }
    }

    const maxCap = config.isEventMode ? 320 : 160;
    if (Object.keys(state.orbs).length < maxCap && Math.random() < 0.3) {
      spawnOrbForRoom(room);
    }

    let redTotal = 0;
    let blueTotal = 0;
    for (const pid in state.players) {
      const pl = state.players[pid];
      if (pl.state === 'alive') {
        if (pl.team === 'red') redTotal += Math.floor(pl.score);
        else if (pl.team === 'blue') blueTotal += Math.floor(pl.score);
      }
    }
    state.teamScores = { red: redTotal, blue: blueTotal };

    state.leaderboard = Object.values(state.players)
      .filter((p) => p.state === 'alive')
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        name: p.name,
        score: Math.floor(p.score),
        color: p.color,
        team: p.team,
      }));

    io.to(roomId).emit('state', state);
  }
}, 1000 / TICK_RATE);

async function startServer() {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', rooms: Object.keys(rooms).length });
  });

  app.get('/api/rooms', (req, res) => {
    res.json(getRoomsList());
  });

  app.use(express.static('public'));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
