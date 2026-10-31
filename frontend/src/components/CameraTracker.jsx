import { useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';

const PROCESS_WIDTH = 480;
const PROCESS_HEIGHT = 360;
const METRIC_INTERVAL = 120;
const FRAME_INTERVAL = 40;

const CameraTracker = ({ onMetricsUpdate, onSpeedUpdate }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const lastFrameRef = useRef(0);
  const lastMetricRef = useRef(0);
  const prevPositionsRef = useRef({ index: null, middle: null, wrist: null });
  const emaSpeedRef = useRef(1.15);
  const jitterBufferRef = useRef([]);
  const rhythmBufferRef = useRef([]);
  const onMetricsRef = useRef(onMetricsUpdate);
  const onSpeedRef = useRef(onSpeedUpdate);

  useEffect(() => {
    onMetricsRef.current = onMetricsUpdate;
    onSpeedRef.current = onSpeedUpdate;
  }, [onMetricsUpdate, onSpeedUpdate]);

  const emitMetrics = useCallback((metrics) => {
    onMetricsRef.current?.(metrics);
    onSpeedRef.current?.(metrics.walkingSpeed);
  }, []);

  const computeMetrics = useCallback((indexTip, middleTip, wrist, dt) => {
    const prev = prevPositionsRef.current;
    let finalSpeed = emaSpeedRef.current;
    let postureStability = 82;
    let stepStride = 0.72;
    let fatigueIndex = 18;
    let movementVariability = 11;

    if (prev.index && prev.middle && dt > 0 && indexTip && middleTip) {
      const indexDist = Math.hypot(indexTip.x - prev.index.x, indexTip.y - prev.index.y);
      const middleDist = Math.hypot(middleTip.x - prev.middle.x, middleTip.y - prev.middle.y);
      const avgDist = (indexDist + middleDist) / 2;
      const velocity = (avgDist / dt) * 1000;

      let targetSpeed = 0.35;
      if (velocity > 0.03) {
        targetSpeed = Math.min(1.35, 0.35 + velocity * 2.2);
      }

      const alpha = 0.35;
      emaSpeedRef.current = alpha * targetSpeed + (1 - alpha) * emaSpeedRef.current;
      finalSpeed = parseFloat(emaSpeedRef.current.toFixed(2));

      jitterBufferRef.current.push(avgDist);
      if (jitterBufferRef.current.length > 20) jitterBufferRef.current.shift();

      rhythmBufferRef.current.push(velocity);
      if (rhythmBufferRef.current.length > 15) rhythmBufferRef.current.shift();
    }

    const activityLevel = Math.round(Math.min(95, Math.max(15, (finalSpeed / 1.3) * 85)));
    const sittingMinutes = Math.round(Math.min(120, Math.max(30, 130 - (finalSpeed / 1.3) * 75)));

    let balanceScore = 78;
    if (prev.wrist && wrist) {
      const wristStability = Math.hypot(wrist.x - prev.wrist.x, wrist.y - prev.wrist.y);
      balanceScore = Math.round(Math.min(95, Math.max(40, 90 - wristStability * 800)));
      postureStability = Math.round(Math.min(95, Math.max(45, balanceScore + (finalSpeed * 8))));
      stepStride = parseFloat(Math.min(1.15, Math.max(0.4, 0.42 + finalSpeed * 0.21)).toFixed(2));
    }

    const jitterAvg = jitterBufferRef.current.length > 3
      ? jitterBufferRef.current.reduce((s, v, _, a) => s + Math.abs(v - a.reduce((x, y) => x + y, 0) / a.length), 0) / jitterBufferRef.current.length
      : 0;
    const tremorIndex = parseFloat(Math.min(40, Math.max(5, 8 + jitterAvg * 120)).toFixed(1));

    const rhythmVar = rhythmBufferRef.current.length > 3
      ? Math.sqrt(rhythmBufferRef.current.reduce((s, v) => {
          const mean = rhythmBufferRef.current.reduce((a, b) => a + b, 0) / rhythmBufferRef.current.length;
          return s + (v - mean) ** 2;
        }, 0) / rhythmBufferRef.current.length)
      : 0;
    const gaitRhythm = Math.round(Math.min(95, Math.max(45, 88 - rhythmVar * 15)));
    const heartRateVar = Math.round(Math.min(65, Math.max(25, 30 + finalSpeed * 25 - tremorIndex * 0.5)));

    const variabilityInfluence = Math.max(0, rhythmVar * 6 + jitterAvg * 45);
    movementVariability = parseFloat(Math.min(35, Math.max(4, variabilityInfluence / 2.2)).toFixed(1));
    fatigueIndex = Math.round(Math.min(65, Math.max(8, 14 + Math.max(0, 1.25 - finalSpeed) * 28 + tremorIndex * 0.8)));

    return {
      walkingSpeed: finalSpeed,
      activityLevel,
      sittingMinutes,
      balanceScore,
      tremorIndex,
      gaitRhythm,
      heartRateVar,
      postureStability,
      stepStride,
      fatigueIndex,
      movementVariability,
      isHighRisk: finalSpeed < 0.85 || activityLevel < 50 || balanceScore < 55,
    };
  }, []);

  useEffect(() => {
    if (!window.Hands || !window.Camera) {
      return undefined;
    }

    const hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      const video = webcamRef.current?.video;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      canvas.width = PROCESS_WIDTH;
      canvas.height = PROCESS_HEIGHT;

      ctx.save();
      ctx.clearRect(0, 0, PROCESS_WIDTH, PROCESS_HEIGHT);
      ctx.translate(PROCESS_WIDTH, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, PROCESS_WIDTH, PROCESS_HEIGHT);

      const now = performance.now();

      if (results.multiHandLandmarks?.length === 0) {
        ctx.restore();
        return;
      }

      const landmarks = results.multiHandLandmarks[0];

      if (window.drawConnectors) {
        window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#10b981', lineWidth: 2 });
      }
      if (window.drawLandmarks) {
        window.drawLandmarks(ctx, landmarks, { color: '#f43f5e', lineWidth: 1, radius: 2 });
      }

      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const wrist = landmarks[0];

      if (now - lastMetricRef.current > METRIC_INTERVAL) {
        const dt = now - lastMetricRef.current;
        const metrics = computeMetrics(indexTip, middleTip, wrist, dt);
        emitMetrics(metrics);

        prevPositionsRef.current = {
          index: { x: indexTip.x, y: indexTip.y },
          middle: { x: middleTip.x, y: middleTip.y },
          wrist: { x: wrist.x, y: wrist.y },
        };
        lastMetricRef.current = now;
      }

      ctx.restore();
    });

    let camera = null;
    let mounted = true;

    const startCamera = () => {
      const video = webcamRef.current?.video;
      if (!video || !mounted) return;

      camera = new window.Camera(video, {
        onFrame: async () => {
          if (!mounted) return;
          const now = performance.now();
          if (now - lastFrameRef.current < FRAME_INTERVAL) return;
          lastFrameRef.current = now;
          try {
            await hands.send({ image: video });
          } catch {
            /* frame drop */
          }
        },
        width: PROCESS_WIDTH,
        height: PROCESS_HEIGHT,
      });
      camera.start();
    };

    const timer = setTimeout(startCamera, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (camera) camera.stop();
      hands.close();
    };
  }, [computeMetrics, emitMetrics]);

  const trackingSupported = typeof window !== 'undefined' && !!window.Hands && !!window.Camera;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-sky-500/30 bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
      <Webcam
        ref={webcamRef}
        mirrored
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{ width: PROCESS_WIDTH, height: PROCESS_HEIGHT, facingMode: 'user' }}
        className="hidden"
      />
      <canvas ref={canvasRef} className="aspect-video w-full bg-slate-950 object-cover" />
      {!trackingSupported && (
        <div className="absolute inset-0 grid place-items-center bg-slate-950/90 px-6 text-center text-xs text-slate-200 backdrop-blur-sm">
          <div>
            <p className="mb-1 text-sm font-semibold text-rose-300">Camera access required</p>
            <p>Enable your webcam to start live AI tracking.</p>
          </div>
        </div>
      )}
      <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-emerald-500/50 bg-slate-900/80 px-3 py-1.5 font-mono text-xs text-emerald-400 backdrop-blur-md">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        Live AI Tracking
      </div>
    </div>
  );
};

export default CameraTracker;
