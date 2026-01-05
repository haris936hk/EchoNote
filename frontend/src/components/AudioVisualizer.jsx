import { useEffect, useRef } from 'react';

const AudioVisualizer = ({ stream, isActive = true }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (!stream || !isActive) {
      // Cleanup if no stream or not active
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

    // Set canvas size
    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    setCanvasSize();

    // Create Web Audio API context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    // Configure analyser
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Number of bars to display
    const barCount = 50;
    const barWidth = canvas.width / barCount / window.devicePixelRatio;
    const barGap = 2;

    // Animation function
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bars
      const canvasHeight = canvas.height / window.devicePixelRatio;
      const canvasWidth = canvas.width / window.devicePixelRatio;

      for (let i = 0; i < barCount; i++) {
        // Average multiple frequency bins for each bar
        const binSize = Math.floor(bufferLength / barCount);
        let sum = 0;
        for (let j = 0; j < binSize; j++) {
          sum += dataArray[i * binSize + j];
        }
        const average = sum / binSize;

        // Calculate bar height (normalize to 0-1, then scale to canvas height)
        const normalizedHeight = average / 255;
        const barHeight = normalizedHeight * canvasHeight * 0.8;

        // Calculate x position (centered)
        const x = i * (barWidth + barGap);

        // Calculate y position (centered vertically)
        const y = (canvasHeight - barHeight) / 2;

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(0, canvasHeight, 0, 0);

        // Color based on intensity
        if (normalizedHeight > 0.7) {
          // High intensity - red to orange
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)'); // red
          gradient.addColorStop(1, 'rgba(249, 115, 22, 1)'); // orange
        } else if (normalizedHeight > 0.4) {
          // Medium intensity - orange to yellow
          gradient.addColorStop(0, 'rgba(249, 115, 22, 0.8)'); // orange
          gradient.addColorStop(1, 'rgba(234, 179, 8, 1)'); // yellow
        } else {
          // Low intensity - blue to cyan
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)'); // blue
          gradient.addColorStop(1, 'rgba(6, 182, 212, 1)'); // cyan
        }

        ctx.fillStyle = gradient;

        // Draw rounded rectangle bar
        const radius = 3;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - barGap, barHeight, radius);
        ctx.fill();

        // Add glow effect for high intensity bars
        if (normalizedHeight > 0.6) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = normalizedHeight > 0.7 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(249, 115, 22, 0.5)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    };

    draw();

    // Handle window resize
    const handleResize = () => {
      setCanvasSize();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup function
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
    <div className="relative w-full h-32 bg-gradient-to-br from-black/40 to-black/20 rounded-2xl overflow-hidden border border-primary/10 shadow-inner">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center text-default-400 text-sm">
          Waiting for audio...
        </div>
      )}
    </div>
  );
};

export default AudioVisualizer;
