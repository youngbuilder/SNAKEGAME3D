/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { GameScene } from './components/GameScene';
import { useGameStore } from './store/gameStore';
import { UI } from './components/UI';

export default function App() {
  const { connect, viewState, theme } = useGameStore();

  useEffect(() => {
    connect();
  }, [connect]);

  const isDark = theme === 'dark';

  return (
    <div
      className={`w-screen h-screen overflow-hidden relative select-none ${
        isDark ? 'bg-black text-white' : 'bg-white text-zinc-900'
      }`}
      style={{
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {viewState === 'in_game' && (
        <Canvas
          shadows
          camera={{ position: [0, -10, 38], fov: 55 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={[isDark ? '#030712' : '#f8fafc']} />
          <fog attach="fog" args={[isDark ? '#030712' : '#f8fafc', 35, 140]} />
          <GameScene />
          {isDark && (
            <EffectComposer>
              <Bloom
                luminanceThreshold={1.1}
                mipmapBlur
                intensity={1.2}
              />
            </EffectComposer>
          )}
        </Canvas>
      )}
      <UI />
    </div>
  );
}
