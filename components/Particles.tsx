import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';

// Vertex Shader
const vertexShader = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uSize;
  uniform vec3 uHandPos;
  uniform float uInteractRadius;
  uniform float uSpeed;
  uniform float uNoiseScale;
  uniform float uHasHand;
  uniform float uExpansion;

  attribute vec3 aRandom;

  varying vec3 vColor;
  varying float vDist;

  void main() {
    // Apply expansion scale immediately
    vec3 pos = position * uExpansion;
    
    // Ambient Movement
    float time = uTime * uSpeed;
    
    // Create a flow field effect
    pos.x += sin(time * 0.1 + pos.y * uNoiseScale + aRandom.x * 6.0) * 0.2;
    pos.y += cos(time * 0.1 + pos.x * uNoiseScale + aRandom.y * 6.0) * 0.2;
    pos.z += sin(time * 0.15 + pos.x * uNoiseScale) * 0.2;

    // Interactive Force (Hand)
    if (uHasHand > 0.5) {
      // Calculate distance in local space
      float dist = distance(pos, uHandPos); 
      
      if (dist < uInteractRadius) {
        vec3 dir = normalize(pos - uHandPos);
        float force = (uInteractRadius - dist) / uInteractRadius;
        
        // Push away effect with some swirl
        vec3 curl = cross(dir, vec3(0.0, 1.0, 0.0));
        
        pos += dir * force * 3.0;
        pos += curl * force * 0.5;
      }
      vDist = dist;
    } else {
      vDist = 10.0;
    }

    // Color gradient mixing based on position and randomness
    float mixFactor = smoothstep(-5.0, 5.0, pos.x + sin(time));
    vColor = mix(uColor1, uColor2, mixFactor + aRandom.z * 0.2);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = uSize * (300.0 / -mvPosition.z);
  }
`;

// Fragment Shader
const fragmentShader = `
  varying vec3 vColor;
  varying float vDist;

  void main() {
    // Circular particle
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;

    // Soft glow edge
    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 1.5);

    // Add extra brightness if near hand (vDist small)
    vec3 finalColor = vColor;
    if (vDist < 2.0) {
       finalColor += vec3(0.5) * (1.0 - vDist / 2.0);
    }

    gl_FragColor = vec4(finalColor, glow);
  }
`;

const Particles: React.FC = () => {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const handPosition = useStore(state => state.handPosition);
  const isHandDetected = useStore(state => state.isHandDetected);
  const gesture = useStore(state => state.gesture);
  const config = useStore(state => state.config);

  // Physics State
  const momentum = useRef(new THREE.Vector2(0, 0)); // X and Y rotational velocity
  const lastHandPos = useRef<THREE.Vector3 | null>(null);
  const currentScale = useRef(1.0);

  const { count, positions, randoms } = useMemo(() => {
    const count = config.particleCount;
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Sphere distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const radius = 4 + Math.random() * 2;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      randoms[i * 3] = Math.random();
      randoms[i * 3 + 1] = Math.random();
      randoms[i * 3 + 2] = Math.random();
    }
    return { count, positions, randoms };
  }, [config.particleCount]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color(config.color1) },
    uColor2: { value: new THREE.Color(config.color2) },
    uSize: { value: config.particleSize },
    uHandPos: { value: new THREE.Vector3(0, 0, 0) },
    uInteractRadius: { value: config.interactionRadius },
    uSpeed: { value: config.speed },
    uNoiseScale: { value: config.noiseScale },
    uHasHand: { value: 0.0 },
    uExpansion: { value: 1.0 }
  }), []);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColor1.value.set(config.color1);
      materialRef.current.uniforms.uColor2.value.set(config.color2);
      materialRef.current.uniforms.uSize.value = config.particleSize;
      materialRef.current.uniforms.uInteractRadius.value = config.interactionRadius;
      materialRef.current.uniforms.uSpeed.value = config.speed;
      materialRef.current.uniforms.uNoiseScale.value = config.noiseScale;
    }
  }, [config]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    // Shader Time Update
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
    }

    // --- EXPANSION PHYSICS (Responsive Lerp) ---
    // Target logic: 3 distinct states to avoid glitching
    let targetScale = 1.0;
    
    if (isHandDetected) {
      switch (gesture) {
        case 'CLOSED':
          targetScale = 0.4; // Shrunk
          break;
        case 'OPEN':
          targetScale = 1.3; // Expanded
          break;
        case 'NEUTRAL':
        default:
          targetScale = 1.0; // Normal / Reset
          break;
      }
    } else {
      targetScale = 1.0; // Reset when no hand
    }

    // Using LERP for organic movement instead of linear constant speed
    // 0.12 factor provides a responsive "spring" feel that slows down as it reaches target
    const LERP_SPEED = 0.12;
    currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale, LERP_SPEED);

    if (materialRef.current) {
      materialRef.current.uniforms.uExpansion.value = currentScale.current;
    }

    if (meshRef.current) {
      // --- ROTATION PHYSICS ---
      
      if (isHandDetected && handPosition) {
        // Initialize last pos if fresh
        if (!lastHandPos.current) {
          lastHandPos.current = handPosition.clone();
        }

        // Calculate Hand Velocity
        const SENSITIVITY = 0.5; 
        
        const dx = handPosition.x - lastHandPos.current.x;
        const dy = handPosition.y - lastHandPos.current.y;
        
        const targetVelX = -dy * SENSITIVITY; 
        const targetVelY = dx * SENSITIVITY;

        const MOMENTUM_LERP = 0.15;
        momentum.current.x = THREE.MathUtils.lerp(momentum.current.x, targetVelX, MOMENTUM_LERP);
        momentum.current.y = THREE.MathUtils.lerp(momentum.current.y, targetVelY, MOMENTUM_LERP);

        lastHandPos.current.copy(handPosition);

        // SHADER INTERACTION
        const localHandPos = handPosition.clone();
        meshRef.current.worldToLocal(localHandPos);

        if (materialRef.current) {
          materialRef.current.uniforms.uHandPos.value.lerp(localHandPos, 0.5);
          materialRef.current.uniforms.uHasHand.value = 1.0;
          
          const zInfluence = THREE.MathUtils.clamp(1.0 + Math.abs(handPosition.z) * 0.5, 0.5, 3.0);
          materialRef.current.uniforms.uInteractRadius.value = THREE.MathUtils.lerp(
             materialRef.current.uniforms.uInteractRadius.value,
             config.interactionRadius * zInfluence,
             0.1
          );
        }

      } else {
        // --- RELEASED / IDLE ---
        lastHandPos.current = null;
        if (materialRef.current) materialRef.current.uniforms.uHasHand.value = 0.0;

        const FRICTION = 0.98; 
        momentum.current.x *= FRICTION;
        momentum.current.y *= FRICTION;

        if (Math.abs(momentum.current.x) < 0.0001) momentum.current.x = 0;
        if (Math.abs(momentum.current.y) < 0.0001) momentum.current.y = 0;
      }

      const MAX_SPEED = 0.5;
      momentum.current.x = THREE.MathUtils.clamp(momentum.current.x, -MAX_SPEED, MAX_SPEED);
      momentum.current.y = THREE.MathUtils.clamp(momentum.current.y, -MAX_SPEED, MAX_SPEED);

      meshRef.current.rotation.x += momentum.current.x;
      meshRef.current.rotation.y += momentum.current.y;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={count}
          array={randoms}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Particles;