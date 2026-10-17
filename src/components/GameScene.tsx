/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore, globalGameState, globalControls } from '../store/gameStore';
import { WORLD_SIZE, TURN_SPEED, getSnakeSpeed } from '../shared/types';
import * as THREE from 'three';
import { Sphere, Cylinder, Box } from '@react-three/drei';
import { sounds } from '../utils/audio';

const localCollectedOrbs = new Set<string>();

function ArenaWalls({ isDark }: { isDark: boolean }) {
  const half = WORLD_SIZE / 2;
  const wallHeight = 4;
  const wallThickness = 0.6;
  return (
    <group position={[0, 0, wallHeight / 2]}>
      <Box args={[WORLD_SIZE, wallThickness, wallHeight]} position={[0, half, 0]}>
        <meshStandardMaterial
          color={isDark ? "#3b82f6" : "#60a5fa"}
          emissive={isDark ? "#2563eb" : "#3b82f6"}
          emissiveIntensity={isDark ? 1.5 : 0.8}
          transparent
          opacity={0.65}
          roughness={isDark ? 0.1 : 0.6}
          metalness={isDark ? 0.8 : 0.2}
        />
      </Box>
      <Box args={[WORLD_SIZE, wallThickness, wallHeight]} position={[0, -half, 0]}>
        <meshStandardMaterial
          color={isDark ? "#3b82f6" : "#60a5fa"}
          emissive={isDark ? "#2563eb" : "#3b82f6"}
          emissiveIntensity={isDark ? 1.5 : 0.8}
          transparent
          opacity={0.65}
          roughness={isDark ? 0.1 : 0.6}
          metalness={isDark ? 0.8 : 0.2}
        />
      </Box>
      <Box args={[wallThickness, WORLD_SIZE, wallHeight]} position={[half, 0, 0]}>
        <meshStandardMaterial
          color={isDark ? "#3b82f6" : "#60a5fa"}
          emissive={isDark ? "#2563eb" : "#3b82f6"}
          emissiveIntensity={isDark ? 1.5 : 0.8}
          transparent
          opacity={0.65}
          roughness={isDark ? 0.1 : 0.6}
          metalness={isDark ? 0.8 : 0.2}
        />
      </Box>
      <Box args={[wallThickness, WORLD_SIZE, wallHeight]} position={[-half, 0, 0]}>
        <meshStandardMaterial
          color={isDark ? "#3b82f6" : "#60a5fa"}
          emissive={isDark ? "#2563eb" : "#3b82f6"}
          emissiveIntensity={isDark ? 1.5 : 0.8}
          transparent
          opacity={0.65}
          roughness={isDark ? 0.1 : 0.6}
          metalness={isDark ? 0.8 : 0.2}
        />
      </Box>
      {[
        [-half, -half],
        [half, -half],
        [-half, half],
        [half, half],
      ].map(([cx, cy], idx) => (
        <group key={idx} position={[cx, cy, 2]}>
          <Cylinder args={[1.2, 1.2, 10, 16]} position={[0, 0, 1]}>
            <meshStandardMaterial
              color={isDark ? "#00f3ff" : "#0284c7"}
              emissive={isDark ? "#00f3ff" : "#0284c7"}
              emissiveIntensity={2.5}
              roughness={0.2}
            />
          </Cylinder>
          <pointLight color={isDark ? "#00f3ff" : "#0284c7"} intensity={3} distance={25} />
        </group>
      ))}
    </group>
  );
}

function Snake({
  playerId,
  color,
  isLocal,
}: {
  playerId: string;
  color: string;
  isLocal: boolean;
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPositions = useRef<{ x: number; y: number }[]>([]);

  useFrame((state, delta) => {
    if (!bodyRef.current || !headGroupRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;
    const player = gs.players[playerId];
    if (!player || player.segments.length === 0) {
      bodyRef.current.count = 0;
      headGroupRef.current.visible = false;
      return;
    }
    headGroupRef.current.visible = true;
    const count = player.segments.length;
    bodyRef.current.count = Math.max(0, count - 1);

    while (currentPositions.current.length < count) {
      const idx = currentPositions.current.length;
      currentPositions.current.push({
        x: player.segments[idx]?.x || 0,
        y: player.segments[idx]?.y || 0,
      });
    }

    const headX = isLocal ? player.segments[0].x : currentPositions.current[0]?.x ?? player.segments[0].x;
    const headY = isLocal ? player.segments[0].y : currentPositions.current[0]?.y ?? player.segments[0].y;
    headGroupRef.current.position.set(headX, headY, 0.7);
    headGroupRef.current.rotation.z = player.currentAngle;
    headGroupRef.current.position.z = 0.7 + Math.sin(state.clock.elapsedTime * 6) * 0.08;

    for (let i = 0; i < count; i++) {
      const targetX = player.segments[i].x;
      const targetY = player.segments[i].y;
      const curr = currentPositions.current[i];
      if (isLocal) {
        curr.x = targetX;
        curr.y = targetY;
      } else {
        const dist = Math.abs(targetX - curr.x) + Math.abs(targetY - curr.y);
        if (dist > 12) {
          curr.x = targetX;
          curr.y = targetY;
        } else {
          const lerpFactor = 16;
          curr.x += (targetX - curr.x) * lerpFactor * delta;
          curr.y += (targetY - curr.y) * lerpFactor * delta;
        }
      }

      if (i > 0) {
        dummy.position.set(curr.x, curr.y, 0.6);
        dummy.scale.set(1.0, 1.0, 1.0);
        dummy.updateMatrix();
        bodyRef.current.setMatrixAt(i - 1, dummy.matrix);
      }
    }
    bodyRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <group ref={headGroupRef}>
        <Sphere castShadow receiveShadow args={[0.9, 24, 24]}>
          <meshStandardMaterial
            color={color}
            roughness={0.2}
            metalness={0.7}
            emissive={color}
            emissiveIntensity={0.8}
          />
        </Sphere>
        <Box args={[0.3, 0.1, 0.5]} position={[-0.1, 0, 0.9]}>
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
        </Box>
        <group position={[0.45, 0.45, 0.45]}>
          <Sphere args={[0.26, 16, 16]}>
            <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.9} />
          </Sphere>
          <Sphere args={[0.13, 12, 12]} position={[0.14, 0.05, 0.05]}>
            <meshStandardMaterial color="#000000" emissive="#00ffff" emissiveIntensity={0.8} />
          </Sphere>
        </group>
        <group position={[0.45, -0.45, 0.45]}>
          <Sphere args={[0.26, 16, 16]}>
            <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.9} />
          </Sphere>
          <Sphere args={[0.13, 12, 12]} position={[0.14, -0.05, 0.05]}>
            <meshStandardMaterial color="#000000" emissive="#00ffff" emissiveIntensity={0.8} />
          </Sphere>
        </group>
        <pointLight color={color} intensity={1.8} distance={8} />
      </group>
      <instancedMesh
        ref={bodyRef}
        args={[null as any, null as any, 2000]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <sphereGeometry args={[0.65, 18, 18]} />
        <meshStandardMaterial
          color={color}
          roughness={0.25}
          metalness={0.65}
          emissive={color}
          emissiveIntensity={0.6}
        />
      </instancedMesh>
    </group>
  );
}

function Orbs({ isDark }: { isDark: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;
    const time = state.clock.elapsedTime;
    let i = 0;
    for (const orbId in gs.orbs) {
      if (localCollectedOrbs.has(orbId)) continue;
      const orb = gs.orbs[orbId];
      const floatZ = 0.5 + Math.sin(time * 3 + orb.x * 0.2 + orb.y * 0.2) * 0.25;
      dummy.position.set(orb.x, orb.y, floatZ);
      dummy.rotation.x = time * 1.5;
      dummy.rotation.y = time * 2;
      const scale = 0.45 + (orb.value > 1 ? 0.25 : 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      if (isDark) {
        colorObj.set(orb.color);
      } else {
        colorObj.set('#111827'); // Black orbs in light mode
      }
      meshRef.current.setColorAt(i, colorObj);
      i++;
    }
    meshRef.current.count = i;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null as any, null as any, 1000]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      <octahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial
        roughness={0.1}
        metalness={0.9}
        emissive={isDark ? "#ffffff" : "#000000"}
        emissiveIntensity={isDark ? 1.2 : 0}
      />
    </instancedMesh>
  );
}

function BoostParticles({ isBoosting, headPos }: { isBoosting: boolean; headPos: { x: number; y: number } }) {
  const count = 30;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useRef<Array<{ x: number; y: number; z: number; vx: number; vy: number; life: number }>>([]);

  if (particles.current.length === 0) {
    for (let i = 0; i < count; i++) {
      particles.current.push({ x: 0, y: 0, z: -10, vx: 0, vy: 0, life: 0 });
    }
  }

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    let activeCount = 0;
    for (let i = 0; i < count; i++) {
      const p = particles.current[i];
      if (p.life > 0) {
        p.life -= delta * 3.5;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z -= delta * 0.5;
        dummy.position.set(p.x, p.y, Math.max(0.1, p.z));
        const s = Math.max(0.01, p.life * 0.35);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(activeCount, dummy.matrix);
        activeCount++;
      } else if (isBoosting && Math.random() < 0.4) {
        p.life = 1.0;
        p.x = headPos.x + (Math.random() - 0.5) * 0.6;
        p.y = headPos.y + (Math.random() - 0.5) * 0.6;
        p.z = 0.5;
        p.vx = (Math.random() - 0.5) * 8;
        p.vy = (Math.random() - 0.5) * 8;
      }
    }
    meshRef.current.count = activeCount;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]} frustumCulled={false}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshBasicMaterial color="#00ffff" />
    </instancedMesh>
  );
}

export function GameScene() {
  const { gameState, playerId, sendPlayerState, sendCollectOrb, is3D, theme } = useGameStore();
  const { camera, gl } = useThree();
  const isDark = theme === 'dark';
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [lightTarget] = useState(() => new THREE.Object3D());
  const mouseScreenPos = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const mouseActive = useRef(false);
  const isMouseDown = useRef(false);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const planeIntersectPoint = useMemo(() => new THREE.Vector3(), []);
  const keys = useRef({ left: false, right: false, boost: false });
  const localPlayerRef = useRef<{
    active: boolean;
    segments: { x: number; y: number }[];
    score: number;
    currentAngle: number;
    smoothAngle: number;
    isBoosting: boolean;
    lastSendTime: number;
  }>({
    active: false,
    segments: [],
    score: 10,
    currentAngle: 0,
    smoothAngle: 0,
    isBoosting: false,
    lastSendTime: 0,
  });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseScreenPos.current.set(x, y);
      mouseActive.current = true;
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 0 || e.button === 2) {
        isMouseDown.current = true;
      }
    };
    const handlePointerUp = () => {
      isMouseDown.current = false;
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && !keys.current.left) {
        keys.current.left = true;
      }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && !keys.current.right) {
        keys.current.right = true;
      }
      if (
        (e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') &&
        !keys.current.boost
      ) {
        keys.current.boost = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && keys.current.left) {
        keys.current.left = false;
      }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && keys.current.right) {
        keys.current.right = false;
      }
      if (
        (e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') &&
        keys.current.boost
      ) {
        keys.current.boost = false;
      }
    };
    const handleBlur = () => {
      keys.current = { left: false, right: false, boost: false };
      isMouseDown.current = false;
    };

    const dom = gl.domElement;
    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const gs = globalGameState.current;
    if (!gs || !playerId) return;
    const serverPlayer = gs.players[playerId];
    if (serverPlayer && serverPlayer.state === 'alive') {
      if (!localPlayerRef.current.active && serverPlayer.segments.length > 0) {
        localPlayerRef.current.active = true;
        localPlayerRef.current.segments = [...serverPlayer.segments];
        localPlayerRef.current.score = serverPlayer.score;
        localPlayerRef.current.currentAngle = serverPlayer.currentAngle;
        localPlayerRef.current.smoothAngle = serverPlayer.currentAngle;
      }
      if (!localPlayerRef.current.active) return;
      const head = { ...localPlayerRef.current.segments[0] };

      if (globalControls.joystick.active) {
        const targetAngle = Math.atan2(-globalControls.joystick.y, globalControls.joystick.x);
        let diff = targetAngle - localPlayerRef.current.currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const maxTurn = TURN_SPEED * delta;
        localPlayerRef.current.currentAngle += Math.sign(diff) * Math.min(Math.abs(diff), maxTurn);
      } else if (mouseActive.current && !keys.current.left && !keys.current.right) {
        raycaster.setFromCamera(mouseScreenPos.current, camera);
        const hit = raycaster.ray.intersectPlane(groundPlane, planeIntersectPoint);
        if (hit) {
          const dx = hit.x - head.x;
          const dy = hit.y - head.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 2.0) {
            const targetAngle = Math.atan2(dy, dx);
            let diff = targetAngle - localPlayerRef.current.currentAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            const maxTurn = TURN_SPEED * delta;
            localPlayerRef.current.currentAngle += Math.sign(diff) * Math.min(Math.abs(diff), maxTurn);
          }
        }
      } else {
        if (keys.current.left) localPlayerRef.current.currentAngle += TURN_SPEED * delta;
        if (keys.current.right) localPlayerRef.current.currentAngle -= TURN_SPEED * delta;
      }

      const wantsBoost =
        globalControls.isBoosting || isMouseDown.current || keys.current.boost;
      const canBoost = wantsBoost && localPlayerRef.current.score > 11;
      const prevBoosting = localPlayerRef.current.isBoosting;
      localPlayerRef.current.isBoosting = canBoost;
      if (canBoost !== prevBoosting) {
        sounds.setBoost(canBoost);
      }

      const speed = getSnakeSpeed(localPlayerRef.current.score, localPlayerRef.current.isBoosting);
      head.x += Math.cos(localPlayerRef.current.currentAngle) * speed * delta;
      head.y += Math.sin(localPlayerRef.current.currentAngle) * speed * delta;

      const boundary = WORLD_SIZE / 2;
      let hitWall = false;
      if (head.x < -boundary || head.x > boundary || head.y < -boundary || head.y > boundary) {
        hitWall = true;
      }

      localPlayerRef.current.segments[0] = head;
      const spacing = 0.52;
      for (let i = 1; i < localPlayerRef.current.segments.length; i++) {
        const prev = localPlayerRef.current.segments[i - 1];
        const curr = localPlayerRef.current.segments[i];
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > spacing) {
          const ang = Math.atan2(dy, dx);
          curr.x = prev.x + Math.cos(ang) * spacing;
          curr.y = prev.y + Math.sin(ang) * spacing;
        }
      }

      if (localPlayerRef.current.isBoosting) {
        localPlayerRef.current.score -= 2.2 * delta;
        if (localPlayerRef.current.score <= 10) {
          localPlayerRef.current.isBoosting = false;
          localPlayerRef.current.score = 10;
          sounds.setBoost(false);
        }
      }

      const targetLength = Math.max(10, Math.floor(localPlayerRef.current.score));
      while (localPlayerRef.current.segments.length < targetLength) {
        const last = localPlayerRef.current.segments[localPlayerRef.current.segments.length - 1];
        localPlayerRef.current.segments.push({ ...last });
      }
      while (localPlayerRef.current.segments.length > targetLength) {
        localPlayerRef.current.segments.pop();
      }

      for (const orbId in gs.orbs) {
        if (localCollectedOrbs.has(orbId)) continue;
        const orb = gs.orbs[orbId];
        const dx = head.x - orb.x;
        const dy = head.y - orb.y;
        if (dx * dx + dy * dy < 4.2) {
          localPlayerRef.current.score += orb.value;
          localCollectedOrbs.add(orbId);
          delete gs.orbs[orbId];
          sendCollectOrb(orbId);
          sounds.playOrbCollect(orb.value);
        }
      }

      if (Math.random() < 0.05) {
        for (const id of localCollectedOrbs) {
          if (!gs.orbs[id]) localCollectedOrbs.delete(id);
        }
      }

      let collidedWithSnake = false;
      const myTeam = serverPlayer?.team;
      for (const otherId in gs.players) {
        if (otherId === playerId) continue;
        const other = gs.players[otherId];
        if (other.state !== 'alive' || other.segments.length === 0) continue;
        if (gs.gameMode === 'team' && myTeam && other.team && myTeam === other.team) {
          continue;
        }

        const oHead = other.segments[0];
        const hDx = head.x - oHead.x;
        const hDy = head.y - oHead.y;
        if (hDx * hDx + hDy * hDy < 2.4) {
          if (localPlayerRef.current.score < other.score) {
            collidedWithSnake = true;
            break;
          } else if (localPlayerRef.current.score > other.score) {
            continue;
          }
        }

        for (let sIdx = 1; sIdx < other.segments.length; sIdx++) {
          const seg = other.segments[sIdx];
          const dx = head.x - seg.x;
          const dy = head.y - seg.y;
          if (dx * dx + dy * dy < 2.0) {
            collidedWithSnake = true;
            break;
          }
        }
        if (collidedWithSnake) break;
      }

      if (hitWall || collidedWithSnake) {
        localPlayerRef.current.active = false;
        sounds.playCrash();
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: localPlayerRef.current.isBoosting,
          state: 'dead',
        });
        return;
      }

      gs.players[playerId].segments = localPlayerRef.current.segments;
      gs.players[playerId].score = localPlayerRef.current.score;
      gs.players[playerId].currentAngle = localPlayerRef.current.currentAngle;
      gs.players[playerId].isBoosting = localPlayerRef.current.isBoosting;

      const now = Date.now();
      if (now - localPlayerRef.current.lastSendTime > 50) {
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: localPlayerRef.current.isBoosting,
          state: 'alive',
        });
        localPlayerRef.current.lastSendTime = now;
      }

      let aDiff = localPlayerRef.current.currentAngle - localPlayerRef.current.smoothAngle;
      while (aDiff < -Math.PI) aDiff += Math.PI * 2;
      while (aDiff > Math.PI) aDiff -= Math.PI * 2;
      localPlayerRef.current.smoothAngle += aDiff * 1.8 * delta;
      const angle = localPlayerRef.current.smoothAngle;

      if (!is3D) {
        const targetCamZ = 45 + Math.min(25, localPlayerRef.current.score * 0.15);
        camera.position.x += (head.x - camera.position.x) * 8 * delta;
        camera.position.y += (head.y - camera.position.y) * 8 * delta;
        camera.position.z += (targetCamZ - camera.position.z) * 6 * delta;
        camera.lookAt(head.x, head.y, 0);
      } else {
        const camDistXY = 6 + Math.min(6, localPlayerRef.current.score * 0.04);
        const camHeightZ = 36 + Math.min(16, localPlayerRef.current.score * 0.08);
        const targetCamX = head.x - Math.cos(angle) * camDistXY;
        const targetCamY = head.y - Math.sin(angle) * camDistXY;
        const targetCamZ = camHeightZ;
        camera.position.x += (targetCamX - camera.position.x) * 5 * delta;
        camera.position.y += (targetCamY - camera.position.y) * 5 * delta;
        camera.position.z += (targetCamZ - camera.position.z) * 4 * delta;
        const lookX = head.x + Math.cos(angle) * 1.0;
        const lookY = head.y + Math.sin(angle) * 1.0;
        camera.lookAt(lookX, lookY, 0.5);
      }

      if (lightRef.current) {
        lightRef.current.position.set(camera.position.x + 12, camera.position.y - 12, 35);
        lightTarget.position.set(head.x, head.y, 0);
      }
    } else {
      localPlayerRef.current.active = false;
      sounds.setBoost(false);
    }
  });

  const localHeadPos = localPlayerRef.current.segments[0] || { x: 0, y: 0 };

  return (
    <>
      <ambientLight intensity={isDark ? 0.4 : 0.8} />
      <directionalLight
        ref={lightRef}
        target={lightTarget}
        castShadow
        intensity={isDark ? 2.4 : 1.5}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={0.1}
        shadow-camera-far={120}
        shadow-bias={-0.0005}
      />
      <primitive object={lightTarget} />
      {/* Cyber Floor Plane (아까 지정한 바닥 색상: 다크모드 #1a1f2e, 라이트모드 #f8fafc) */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshStandardMaterial
          color={isDark ? '#1a1f2e' : '#f8fafc'}
          roughness={isDark ? 0.3 : 0.8}
          metalness={isDark ? 0.4 : 0.1}
        />
      </mesh>
      <gridHelper
        args={[WORLD_SIZE, WORLD_SIZE / 2, isDark ? '#00f3ff' : '#0ea5e9', isDark ? '#1e293b' : '#cbd5e1']}
        position={[0, 0, 0.05]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <ArenaWalls isDark={isDark} />
      {/* Orbs: 라이트모드일 때 먹이(오브)가 검은색(#111827)으로 표시됨 */}
      <Orbs isDark={isDark} />
      <BoostParticles
        isBoosting={localPlayerRef.current.isBoosting}
        headPos={localHeadPos}
      />
      {gameState &&
        Object.values(gameState.players).map((player) => {
          if (player.state !== 'alive' || player.segments.length === 0) return null;
          return (
            <Snake
              key={player.id}
              playerId={player.id}
              color={player.color}
              isLocal={player.id === playerId}
            />
          );
        })}
    </>
  );
}
