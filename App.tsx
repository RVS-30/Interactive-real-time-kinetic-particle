import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Particles from './components/Particles';
import WebcamHandTracker from './components/WebcamHandTracker';
import Controls from './components/Controls';
import { useStore } from './store';

const App: React.FC = () => {
  const isHandDetected = useStore(state => state.isHandDetected);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        className="z-10"
        dpr={[1, 2]} // Support high-DPI screens
      >
        <Suspense fallback={null}>
          <color attach="background" args={['#050505']} />
          <ambientLight intensity={0.5} />
          
          <Particles />
          
          {/* Note: OrbitControls removed to allow full hand-gesture control of the sphere object itself */}
        </Suspense>
      </Canvas>

      {/* Overlays */}
      <Controls />
      <WebcamHandTracker />

      {/* Interaction Hint */}
      {!isHandDetected && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/30 text-sm animate-pulse pointer-events-none tracking-widest uppercase">
          Raise Hand to Spin
        </div>
      )}
    </div>
  );
};

export default App;