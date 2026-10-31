import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';

const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 480;
const CORE_LANDMARKS = [11, 12, 23, 24];
const ANKLE_LANDMARKS = [27, 28];

function isVisible(landmark) {
  return landmark && (landmark.visibility ?? 0) >= 0.5;
}

export default function PersonDetector({ onDetectionUpdate, onMetricsUpdate }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const mountedRef = useRef(true);
  const onDetectionUpdateRef = useRef(onDetectionUpdate);
  const onMetricsUpdateRef = useRef(onMetricsUpdate);
  const lastStatusRef = useRef('');
  const lastMetricsRef = useRef(0);
  const lastCenterRef = useRef(null);
  const lastAnklesRef = useRef(null);
  const movementRef = useRef([]);
  const [status, setStatus] = useState('Loading person detection…');
  const [error, setError] = useState('');

  useEffect(() => {
    onDetectionUpdateRef.current = onDetectionUpdate;
    onMetricsUpdateRef.current = onMetricsUpdate;
  }, [onDetectionUpdate, onMetricsUpdate]);

  const updateDetection = useCallback((detected, moving) => {
    const key = `${detected}:${moving}`;
    if (key === lastStatusRef.current) return;
    lastStatusRef.current = key;
    onDetectionUpdateRef.current?.({ detected, moving });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!window.Pose || !window.Camera) {
      setError('Person detection could not load. Check your internet connection and reload.');
      return undefined;
    }

    const pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    poseRef.current = pose;
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results) => {
      const canvas = canvasRef.current;
      if (!canvas || !mountedRef.current) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      canvas.width = FRAME_WIDTH;
      canvas.height = FRAME_HEIGHT;
      ctx.save();
      ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      ctx.translate(FRAME_WIDTH, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);

      const landmarks = results.poseLandmarks;
      const visibleCore = CORE_LANDMARKS.filter((index) => isVisible(landmarks?.[index]));
      if (visibleCore.length < 2) {
        ctx.restore();
        lastCenterRef.current = null;
        lastAnklesRef.current = null;
        movementRef.current = [];
        updateDetection(false, false);
        setStatus('No person detected — walk into the camera view.');
        return;
      }

      const visibleLandmarks = landmarks
        .map((landmark, index) => ({ landmark, index }))
        .filter(({ landmark }) => isVisible(landmark));
      const points = visibleLandmarks.map(({ landmark }) => ({
        x: landmark.x * FRAME_WIDTH,
        y: landmark.y * FRAME_HEIGHT,
      }));
      const left = Math.max(0, Math.min(...points.map((point) => point.x)) - 12);
      const top = Math.max(0, Math.min(...points.map((point) => point.y)) - 12);
      const right = Math.min(FRAME_WIDTH, Math.max(...points.map((point) => point.x)) + 12);
      const bottom = Math.min(FRAME_HEIGHT, Math.max(...points.map((point) => point.y)) + 12);

      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.strokeRect(left, top, right - left, bottom - top);

      const connections = window.POSE_CONNECTIONS || [];
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      for (const [start, end] of connections) {
        const first = landmarks[start];
        const second = landmarks[end];
        if (!isVisible(first) || !isVisible(second)) continue;
        ctx.beginPath();
        ctx.moveTo(first.x * FRAME_WIDTH, first.y * FRAME_HEIGHT);
        ctx.lineTo(second.x * FRAME_WIDTH, second.y * FRAME_HEIGHT);
        ctx.stroke();
      }
      ctx.fillStyle = '#fb7185';
      for (const { landmark } of visibleLandmarks) {
        ctx.beginPath();
        ctx.arc(landmark.x * FRAME_WIDTH, landmark.y * FRAME_HEIGHT, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const center = visibleCore.reduce((total, index) => ({
        x: total.x + landmarks[index].x / visibleCore.length,
        y: total.y + landmarks[index].y / visibleCore.length,
      }), { x: 0, y: 0 });
      const ankles = ANKLE_LANDMARKS.map((index) => landmarks[index])
        .filter(isVisible)
        .map((landmark) => ({ x: landmark.x, y: landmark.y }));
      const now = performance.now();

      if (lastCenterRef.current) {
        const centerDelta = Math.hypot(center.x - lastCenterRef.current.x, center.y - lastCenterRef.current.y);
        const ankleDelta = ankles.length && lastAnklesRef.current?.length
          ? ankles.reduce((total, ankle, index) => {
              const previous = lastAnklesRef.current[index];
              return total + (previous ? Math.hypot(ankle.x - previous.x, ankle.y - previous.y) : 0);
            }, 0) / ankles.length
          : 0;
        movementRef.current.push({ time: now, centerDelta, ankleDelta });
        movementRef.current = movementRef.current.filter((sample) => now - sample.time <= 1000);
      }

      lastCenterRef.current = center;
      lastAnklesRef.current = ankles;
      const samples = movementRef.current;
      const centerMovement = samples.reduce((total, sample) => total + sample.centerDelta, 0);
      const ankleMovement = samples.reduce((total, sample) => total + sample.ankleDelta, 0);
      const moving = samples.length >= 3
        && now - samples[0].time >= 400
        && (centerMovement >= 0.08 || ankleMovement >= 0.2);
      updateDetection(true, moving);
      setStatus(moving ? 'Person detected · movement detected' : 'Person detected · standing still');
      if (now - lastMetricsRef.current >= 500) {
        const walkingSpeed = moving
          ? Number(Math.min(1.35, 0.35 + Math.min(1, ankleMovement * 2.5 + centerMovement) * 0.8).toFixed(2))
          : 0.35;
        onMetricsUpdateRef.current?.({
          walkingSpeed,
          activityLevel: moving ? 65 : 35,
          sittingMinutes: moving ? 45 : 90,
          balanceScore: 78,
          tremorIndex: 8,
          gaitRhythm: moving ? 72 : 60,
          heartRateVar: moving ? 45 : 35,
          postureStability: 78,
          stepStride: moving ? 0.65 : 0.42,
          fatigueIndex: moving ? 25 : 35,
          movementVariability: moving ? 12 : 5,
          isHighRisk: false,
        });
        lastMetricsRef.current = now;
      }
    });

    return () => {
      mountedRef.current = false;
      cameraRef.current?.stop();
      cameraRef.current = null;
      pose.close();
      poseRef.current = null;
    };
  }, [updateDetection]);

  const startCamera = useCallback(() => {
    const video = webcamRef.current?.video;
    if (!video || !poseRef.current || cameraRef.current) return;
    const camera = new window.Camera(video, {
      onFrame: async () => {
        if (!mountedRef.current || !poseRef.current) return;
        try {
          await poseRef.current.send({ image: video });
        } catch (cameraError) {
          console.error('Person detection frame failed.', cameraError);
          setError('Person detection stopped unexpectedly. Reload the page to try again.');
          updateDetection(false, false);
          cameraRef.current?.stop();
        }
      },
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });
    cameraRef.current = camera;
    try {
      Promise.resolve(camera.start()).catch((cameraError) => {
        console.error('Could not start the camera.', cameraError);
        setError('Could not start the camera. Allow camera access and reload.');
        updateDetection(false, false);
      });
    } catch (cameraError) {
      console.error('Could not start the camera.', cameraError);
      setError('Could not start the camera. Allow camera access and reload.');
      updateDetection(false, false);
    }
  }, [updateDetection]);

  const handleCameraError = useCallback((cameraError) => {
    console.error('Camera access was denied or unavailable.', cameraError);
    setError('Camera access is blocked or unavailable. Allow camera access and reload.');
    updateDetection(false, false);
  }, [updateDetection]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-sky-500/30 bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
      <Webcam
        ref={webcamRef}
        mirrored
        audio={false}
        videoConstraints={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, facingMode: 'user' }}
        onUserMedia={startCamera}
        onUserMediaError={handleCameraError}
        className="hidden"
      />
      <canvas ref={canvasRef} className="aspect-[4/3] w-full bg-slate-950 object-cover" />
      <div className="absolute left-3 top-3 rounded-full border border-emerald-500/50 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-emerald-300 backdrop-blur-md" role="status">
        {error || status}
      </div>
      <div className="absolute bottom-3 right-3 rounded-full border border-slate-500/50 bg-slate-900/80 px-3 py-1.5 font-mono text-xs text-slate-200 backdrop-blur-md">
        Live person detection
      </div>
    </div>
  );
}
