import { create } from 'zustand';
import { Vector3 } from 'three';

export interface ParticleConfig {
  color1: string;
  color2: string;
  particleSize: number;
  speed: number;
  noiseScale: number;
  interactionRadius: number;
  particleCount: number;
}

export type HandGesture = 'OPEN' | 'CLOSED' | 'NEUTRAL' | null;

interface AppState {
  // Hand tracking state
  handPosition: Vector3 | null; // Normalized -1 to 1 range approx
  isHandDetected: boolean;
  gesture: HandGesture;
  setHandPosition: (pos: Vector3 | null) => void;
  setIsHandDetected: (detected: boolean) => void;
  setGesture: (g: HandGesture) => void;

  // Particle System Config
  config: ParticleConfig;
  setConfig: (config: Partial<ParticleConfig>) => void;

  // UI State
  isConfiguring: boolean;
  setIsConfiguring: (v: boolean) => void;
  
  // Debug/Error
  error: string | null;
  setError: (e: string | null) => void;
}

const DEFAULT_CONFIG: ParticleConfig = {
  color1: '#00ffff',
  color2: '#ff00ff',
  particleSize: 0.15,
  speed: 1.0,
  noiseScale: 1.0,
  interactionRadius: 2.0,
  particleCount: 8000
};

export const useStore = create<AppState>((set) => ({
  handPosition: null,
  isHandDetected: false,
  gesture: null,
  setHandPosition: (pos) => set({ handPosition: pos }),
  setIsHandDetected: (detected) => set({ isHandDetected: detected }),
  setGesture: (g) => set({ gesture: g }),

  config: DEFAULT_CONFIG,
  setConfig: (newConfig) => set((state) => ({ config: { ...state.config, ...newConfig } })),

  isConfiguring: false,
  setIsConfiguring: (v) => set({ isConfiguring: v }),

  error: null,
  setError: (e) => set({ error: e }),
}));