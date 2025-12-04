import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useStore } from '../store';
import { Vector3 } from 'three';

const WebcamHandTracker: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const setHandPosition = useStore(state => state.setHandPosition);
  const setIsHandDetected = useStore(state => state.setIsHandDetected);
  const setGesture = useStore(state => state.setGesture);
  const setError = useStore(state => state.setError);

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;
    let video: HTMLVideoElement | null = null;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        setIsLoaded(true);
        startWebcam();
      } catch (err) {
        console.error("Failed to load MediaPipe:", err);
        setError("Failed to load hand tracking. Please ensure your browser supports WebGPU/WebGL.");
      }
    };

    const startWebcam = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: 320,
              height: 240,
              facingMode: "user"
            }
          });
          if (videoRef.current) {
            video = videoRef.current;
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
          }
        } catch (err) {
            console.error(err);
            setError("Camera access denied.");
        }
      }
    };

    let lastVideoTime = -1;
    const predictWebcam = () => {
      if (!handLandmarker || !video) return;

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const startTimeMs = performance.now();
        const results = handLandmarker.detectForVideo(video, startTimeMs);

        if (results.landmarks && results.landmarks.length > 0) {
           setIsHandDetected(true);
           // Get index finger tip (landmark 8)
           // MediaPipe coords: x (0-1), y (0-1), z (depth, relative to wrist)
           const landmarks = results.landmarks[0];
           const indexTip = landmarks[8];
           
           // Convert to approximate 3D world space for our canvas
           // X: Invert because webcam is mirrored. Scale to approx -5 to 5
           // Y: Scale to approx -4 to 4
           // Z: Scale depth for interaction intensity
           const x = (0.5 - indexTip.x) * 10; 
           const y = (0.5 - indexTip.y) * 8;
           const z = indexTip.z * -10; // Depth factor
           
           setHandPosition(new Vector3(x, y, z));

           // --- Gesture Detection (Fist vs Open vs Neutral) ---
           // We check if fingertips are closer to the wrist than their PIP joints.
           // Wrist is index 0.
           const wrist = landmarks[0];
           
           const isFingerFolded = (tipIdx: number, pipIdx: number) => {
              const tip = landmarks[tipIdx];
              const pip = landmarks[pipIdx];
              
              const distTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y, tip.z - wrist.z);
              const distPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y, pip.z - wrist.z);
              
              // If tip is significantly closer to wrist than PIP, it's folded
              return distTip < distPip;
           };

           // Check Index (8,6), Middle (12,10), Ring (16,14), Pinky (20,18)
           // Thumb is excluded as it's complex, but 4 fingers are enough for a fist check.
           let foldedCount = 0;
           if (isFingerFolded(8, 6)) foldedCount++;
           if (isFingerFolded(12, 10)) foldedCount++;
           if (isFingerFolded(16, 14)) foldedCount++;
           if (isFingerFolded(20, 18)) foldedCount++;

           // State Machine Logic:
           // 0-1 fingers folded: OPEN
           // 4 fingers folded: CLOSED
           // 2-3 fingers folded: NEUTRAL (Transition state)
           
           if (foldedCount >= 4) {
             setGesture('CLOSED');
           } else if (foldedCount <= 1) {
             setGesture('OPEN');
           } else {
             setGesture('NEUTRAL');
           }

        } else {
           setIsHandDetected(false);
           setHandPosition(null);
           setGesture(null);
        }
      }
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    setupMediaPipe();

    return () => {
      if (video && video.srcObject) {
        const tracks = (video.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute bottom-4 right-4 z-50 pointer-events-none opacity-80">
      <div className="relative rounded-lg overflow-hidden border-2 border-white/20 shadow-lg w-32 h-24 bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-white/50">
            Loading AI...
          </div>
        )}
      </div>
      <div className="text-[10px] text-white/50 text-right mt-1 uppercase tracking-wider">
        Camera Feed
      </div>
    </div>
  );
};

export default WebcamHandTracker;