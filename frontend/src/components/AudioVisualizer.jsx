import { useEffect, useRef } from 'react';

/**
 * AudioVisualizer — real-time waveform display
 * Stitch design: thin vertical bars, indigo/violet color palette, OLED-optimised
 * All audio stream analysis logic preserved exactly.
 */
const AudioVisualizer = ({ stream, isActive = true }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (!stream || !isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    setCanvasSize();

    // Create Web Audio API context (logic unchanged)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Stitch spec: clean minimal bars — more bars, thinner gaps
    const barCount = 48;
    const barGap = 2;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const canvasHeight = canvas.height / window.devicePixelRatio;
      const canvasWidth = canvas.width / window.devicePixelRatio;
      const barWidth = (canvasWidth - barGap * (barCount - 1)) / barCount;

      // Clear with transparent fill — crisp on OLED
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      for (let i = 0; i < barCount; i++) {
        const binSize = Math.floor(bufferLength / barCount);
        let sum = 0;
        for (let j = 0; j < binSize; j++) {
          sum += dataArray[i * binSize + j];
        }
        const average = sum / binSize;

        const normalizedHeight = average / 255;
        // Minimum bar height of 3px so all bars are always visible
        const barHeight = Math.max(3, normalizedHeight * canvasHeight * 0.85);

        const x = i * (barWidth + barGap);
        const y = (canvasHeight - barHeight) / 2;

        // Stitch palette: indigo-400 (#818CF8) → violet-400 (#A78BFA)
        // High intensity: brighter indigo; low: dimmer violet
        const gradient = ctx.createLinearGradient(0, y + barHeight, 0, y);

        if (normalizedHeight > 0.65) {
          // High — bright indigo
          gradient.addColorStop(0, 'rgba(129, 140, 248, 1)'); // indigo-400
          gradient.addColorStop(1, 'rgba(167, 139, 250, 1)'); // violet-400
        } else if (normalizedHeight > 0.35) {
          // Medium — indigo at 80% opacity
          gradient.addColorStop(0, 'rgba(129, 140, 248, 0.75)');
          gradient.addColorStop(1, 'rgba(167, 139, 250, 0.85)');
        } else {
          // Low — subdued violet
          gradient.addColorStop(0, 'rgba(129, 140, 248, 0.30)');
          gradient.addColorStop(1, 'rgba(167, 139, 250, 0.45)');
        }

        ctx.fillStyle = gradient;

        // Thin rounded bars — radius 2px for the slim aesthetic
        const radius = Math.min(2, barWidth / 2);
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();

        // Subtle glow only on high-intensity bars
        if (normalizedHeight > 0.65) {
          ctx.save();
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(129, 140, 248, 0.5)';
          ctx.fill();
          ctx.restore();
        }
      }
    };

    draw();

    const handleResize = () => setCanvasSize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, isActive]);

  return (
    <div className="relative h-16 w-full overflow-hidden rounded-btn border border-white/[0.06] bg-echo-surface">
      <canvas ref={canvasRef} className="size-full" style={{ display: 'block' }} />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
          {/* Static placeholder bars when no stream */}
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-accent-primary/20"
              style={{ height: `${Math.sin(i * 0.5) * 40 + 20}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioVisualizer;
