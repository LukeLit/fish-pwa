/**
 * Fish Editor Canvas - Playable test environment for AI-generated assets
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AnalogJoystick, { type AnalogJoystickOutput } from './AnalogJoystick';

interface FishEditorCanvasProps {
  background: string | null;
  playerFishSprite: string | null;
  spawnedFish: Array<{ id: string; sprite: string; type: string }>;
  chromaTolerance?: number;
  zoom?: number;
  enableWaterDistortion?: boolean;
  deformationIntensity?: number;
}

// Chroma key color - bright magenta for easy removal
const CHROMA_KEY = { r: 255, g: 0, b: 255 }; // #FF00FF

interface DrawFishOpts {
  /** Speed 0–1+; boosts tail motion when moving */
  speed?: number;
  /** 0–1 chomp phase; bulges front (head) when > 0 */
  chompPhase?: number;
}

// Draw fish sprite with spine-based deformation (warping/bending animation)
function drawFishWithDeformation(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  animTime: number,
  facingRight: boolean,
  verticalTilt: number,
  intensity: number,
  opts: DrawFishOpts = {}
) {
  const { speed = 0, chompPhase = 0 } = opts;
  // Movement-based animation: more tail motion when swimming
  const speedBoost = 1 + Math.min(1, speed) * 0.6;
  const effectiveIntensity = intensity * speedBoost;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facingRight ? verticalTilt : -verticalTilt);
  ctx.scale(facingRight ? 1 : -1, 1);

  const segments = 8;
  const segmentWidth = size / segments;

  for (let i = 0; i < segments; i++) {
    const waveStrength = 1 - i / segments; // 1 at tail, 0 at head
    const wave = Math.sin(animTime + i * 0.3) * 1.5 * waveStrength * effectiveIntensity;

    ctx.save();

    const segX = -size / 2 + i * segmentWidth;
    ctx.translate(segX, wave);

    const rotation = Math.sin(animTime + i * 0.3) * 0.025 * waveStrength * effectiveIntensity;
    ctx.rotate(rotation);

    // Chomp bulge: stretch front segments (head) horizontally
    let drawW = segmentWidth;
    let drawX = 0;
    if (chompPhase > 0) {
      const headAmount = i / segments; // 0 at tail, 1 at head
      const bulge = 1 + chompPhase * 0.4 * headAmount; // up to 40% wider at peak
      drawW = segmentWidth * bulge;
      drawX = facingRight ? -segmentWidth * (bulge - 1) * 0.5 : segmentWidth * (bulge - 1) * 0.5;
    }
    ctx.translate(drawX, 0);

    ctx.drawImage(
      sprite,
      (i / segments) * sprite.width,
      0,
      sprite.width / segments,
      sprite.height,
      0,
      -size / 2,
      drawW,
      size
    );

    ctx.restore();
  }

  ctx.restore();
}

// Advanced background removal - detects and removes background color automatically
function removeBackground(img: HTMLImageElement, tolerance: number = 50): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Sample corner colors to detect background
  const corners = [
    { x: 0, y: 0 },
    { x: canvas.width - 1, y: 0 },
    { x: 0, y: canvas.height - 1 },
    { x: canvas.width - 1, y: canvas.height - 1 },
  ];

  // Get average corner color (likely the background)
  let totalR = 0, totalG = 0, totalB = 0;
  corners.forEach(corner => {
    const idx = (corner.y * canvas.width + corner.x) * 4;
    totalR += data[idx];
    totalG += data[idx + 1];
    totalB += data[idx + 2];
  });

  const bgColor = {
    r: Math.round(totalR / corners.length),
    g: Math.round(totalG / corners.length),
    b: Math.round(totalB / corners.length),
  };

  console.log('Detected background color:', bgColor);

  // Remove background color
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate color difference from detected background
    const diff = Math.sqrt(
      Math.pow(r - bgColor.r, 2) +
      Math.pow(g - bgColor.g, 2) +
      Math.pow(b - bgColor.b, 2)
    );

    // If pixel is close to background color, make it transparent
    if (diff < tolerance) {
      data[i + 3] = 0; // Set alpha to 0
    } else if (diff < tolerance * 1.5) {
      // Feather edges for smoother transitions
      const alpha = ((diff - tolerance) / (tolerance * 0.5)) * 255;
      data[i + 3] = Math.min(data[i + 3], alpha);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export default function FishEditorCanvas({
  background,
  playerFishSprite,
  spawnedFish,
  chromaTolerance = 50,
  zoom = 1,
  enableWaterDistortion = false,
  deformationIntensity = 1,
}: FishEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const chromaToleranceRef = useRef<number>(chromaTolerance);
  const zoomRef = useRef<number>(zoom);
  const deformationRef = useRef<number>(deformationIntensity);

  // Update refs when props change
  useEffect(() => {
    chromaToleranceRef.current = chromaTolerance;
  }, [chromaTolerance]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    deformationRef.current = deformationIntensity;
  }, [deformationIntensity]);

  const eatenIdsRef = useRef<Set<string>>(new Set());

  // Game state
  const playerRef = useRef({
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    size: 80,
    baseSize: 80,
    sprite: null as HTMLCanvasElement | null,
    facingRight: true,
    verticalTilt: 0,
    animTime: 0,
    chompPhase: 0, // 0–1, drives bulge + CHOMP
    chompEndTime: 0,
  });

  const chompParticlesRef = useRef<Array<{
    x: number;
    y: number;
    life: number;
    scale: number;
    text: string;
  }>>([]);

  const bloodParticlesRef = useRef<Array<{
    x: number;
    y: number;
    life: number;
    radius: number;
  }>>([]);

  const fishListRef = useRef<Array<{
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    sprite: HTMLCanvasElement | null;
    type: string;
    facingRight: boolean;
    verticalTilt: number;
    animTime: number;
  }>>([]);

  const keyKeysRef = useRef<Set<string>>(new Set());
  const joystickVelocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const joystickActiveRef = useRef<boolean>(false);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const waterTimeRef = useRef<number>(0);
  const waterDistortionRef = useRef<HTMLCanvasElement | null>(null);

  const handleJoystickChange = useCallback((output: AnalogJoystickOutput) => {
    joystickVelocityRef.current = output.velocity;
    joystickActiveRef.current = output.isActive;
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load background image
  useEffect(() => {
    if (!background) {
      backgroundImageRef.current = null;
      return;
    }

    const img = new Image();
    img.onload = () => {
      backgroundImageRef.current = img;
    };
    img.onerror = () => {
      console.error('Failed to load background image');
      backgroundImageRef.current = null;
    };
    img.src = background;
  }, [background]);

  // Load player fish sprite
  useEffect(() => {
    if (!playerFishSprite) {
      playerRef.current.sprite = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Process to remove background
      playerRef.current.sprite = removeBackground(img, chromaToleranceRef.current);
    };
    img.onerror = () => {
      console.error('Failed to load player fish sprite');
      playerRef.current.sprite = null;
    };
    img.src = playerFishSprite;
  }, [playerFishSprite]);

  // Spawn new fish
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    spawnedFish.forEach((fishData) => {
      if (eatenIdsRef.current.has(fishData.id)) return;
      if (!fishListRef.current.find((f) => f.id === fishData.id)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const processedSprite = removeBackground(img, chromaToleranceRef.current);
          const vx = (Math.random() - 0.5) * 0.5; // Even slower - reduced from 1 to 0.5
          const vy = (Math.random() - 0.5) * 0.5;
          const newFish = {
            id: fishData.id,
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx,
            vy,
            size: fishData.type === 'prey' ? 60 : fishData.type === 'predator' ? 120 : 90, // Doubled all sizes
            sprite: processedSprite,
            type: fishData.type,
            facingRight: vx >= 0,
            verticalTilt: 0,
            animTime: Math.random() * Math.PI * 2,
          };
          fishListRef.current.push(newFish);
        };
        img.onerror = () => {
          console.error('Failed to load fish sprite:', fishData.id);
        };
        img.src = fishData.sprite;
      }
    });

    fishListRef.current = fishListRef.current.filter((fish) =>
      spawnedFish.find((f) => f.id === fish.id)
    );
    // Clear eaten set when user clears all fish
    if (spawnedFish.length === 0) eatenIdsRef.current.clear();
  }, [spawnedFish]);

  // Setup canvas and game loop
  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to fill available space
    const updateCanvasSize = () => {
      const container = containerRef.current;
      if (!container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keyKeysRef.current.add(key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keyKeysRef.current.delete(key);
    };

    const hasKey = (k: string) => keyKeysRef.current.has(k);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Game physics constants
    const MAX_SPEED = 1.5;
    const ACCELERATION = 0.15;
    const FRICTION = 0.92;

    const gameLoop = () => {
      const player = playerRef.current;

      // Use joystick if active, otherwise keyboard
      if (joystickActiveRef.current) {
        // Analog joystick control - smooth velocity
        player.vx = joystickVelocityRef.current.x * MAX_SPEED;
        player.vy = joystickVelocityRef.current.y * MAX_SPEED;
      } else {
        // Keyboard control with acceleration and friction
        if (hasKey('w') || hasKey('arrowup')) player.vy -= ACCELERATION;
        if (hasKey('s') || hasKey('arrowdown')) player.vy += ACCELERATION;
        if (hasKey('a') || hasKey('arrowleft')) player.vx -= ACCELERATION;
        if (hasKey('d') || hasKey('arrowright')) player.vx += ACCELERATION;
        player.vx *= FRICTION;
        player.vy *= FRICTION;
      }

      let speed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
      if (speed > MAX_SPEED) {
        player.vx = (player.vx / speed) * MAX_SPEED;
        player.vy = (player.vy / speed) * MAX_SPEED;
        speed = MAX_SPEED;
      }

      player.x += player.vx;
      player.y += player.vy;

      // Update facing direction based on horizontal velocity
      if (Math.abs(player.vx) > 0.1) {
        player.facingRight = player.vx > 0;
      }

      const maxTilt = Math.PI / 6;
      const targetTilt = Math.max(-maxTilt, Math.min(maxTilt, player.vy * 0.3));
      player.verticalTilt += (targetTilt - player.verticalTilt) * 0.1;

      // Movement-based animation: faster tail cycle when swimming
      const normalizedSpeed = Math.min(1, speed / MAX_SPEED);
      player.animTime += 0.05 + normalizedSpeed * 0.06;

      // Update chomp phase (decay over ~280ms)
      const now = performance.now();
      if (player.chompEndTime > now) {
        player.chompPhase = (player.chompEndTime - now) / 280;
      } else {
        player.chompPhase = 0;
      }

      // Collision: eat prey
      const playerR = player.size * 0.45;
      for (let idx = fishListRef.current.length - 1; idx >= 0; idx--) {
        const fish = fishListRef.current[idx];
        if (fish.type !== 'prey') continue;
        const fishR = fish.size * 0.45;
        const dx = fish.x - player.x;
        const dy = fish.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < playerR + fishR) {
          eatenIdsRef.current.add(fish.id);
          fishListRef.current.splice(idx, 1);
          player.size = Math.min(150, player.size + 10);
          player.chompPhase = 1;
          player.chompEndTime = now + 280;
          const eatX = (fish.x + player.x) * 0.5;
          const eatY = (fish.y + player.y) * 0.5;
          for (let k = 0; k < 6; k++) {
            chompParticlesRef.current.push({
              x: eatX + (Math.random() - 0.5) * 16,
              y: eatY + (Math.random() - 0.5) * 16,
              life: 1,
              scale: 1 + Math.random() * 0.5,
              text: k === 0 ? 'CHOMP' : ['!', '•', '*', '♥'][k % 4],
            });
          }
          for (let b = 0; b < 22; b++) {
            bloodParticlesRef.current.push({
              x: eatX + (Math.random() - 0.5) * fish.size * 1.2,
              y: eatY + (Math.random() - 0.5) * fish.size * 1.2,
              life: 1,
              radius: 4 + Math.random() * 10,
            });
          }
        }
      }

      chompParticlesRef.current = chompParticlesRef.current.filter((p) => {
        p.life -= 0.01;
        return p.life > 0;
      });

      bloodParticlesRef.current = bloodParticlesRef.current.filter((b) => {
        b.life -= 0.007;
        return b.life > 0;
      });

      // Wrap around screen
      if (player.x < 0) player.x = canvas.width;
      if (player.x > canvas.width) player.x = 0;
      if (player.y < 0) player.y = canvas.height;
      if (player.y > canvas.height) player.y = 0;

      // Update AI fish
      fishListRef.current.forEach((fish) => {
        fish.x += fish.vx;
        fish.y += fish.vy;

        // Update facing direction
        if (Math.abs(fish.vx) > 0.1) {
          fish.facingRight = fish.vx > 0;
        }

        // Update vertical tilt
        const maxTilt = Math.PI / 6;
        const targetTilt = Math.max(-maxTilt, Math.min(maxTilt, fish.vy * 0.3));
        fish.verticalTilt += (targetTilt - fish.verticalTilt) * 0.1;

        const fishSpeed = Math.sqrt(fish.vx ** 2 + fish.vy ** 2);
        fish.animTime += 0.04 + Math.min(0.04, (fishSpeed / 1.5) * 0.04);

        // Wrap around
        if (fish.x < 0) fish.x = canvas.width;
        if (fish.x > canvas.width) fish.x = 0;
        if (fish.y < 0) fish.y = canvas.height;
        if (fish.y > canvas.height) fish.y = 0;

        // Occasional direction change
        if (Math.random() < 0.01) {
          fish.vx = (Math.random() - 0.5) * 2;
          fish.vy = (Math.random() - 0.5) * 2;
        }
      });

      // Update water effect time
      waterTimeRef.current += 0.01;

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply zoom
      const currentZoom = zoomRef.current;
      ctx.save();
      ctx.scale(currentZoom, currentZoom);
      const scaledWidth = canvas.width / currentZoom;
      const scaledHeight = canvas.height / currentZoom;

      // Draw background
      if (backgroundImageRef.current) {
        ctx.save();
        ctx.filter = 'blur(6px)';
        ctx.drawImage(backgroundImageRef.current, 0, 0, scaledWidth, scaledHeight);
        ctx.restore();

        // Optional: Simple water shimmer overlay (much faster than pixel distortion)
        if (enableWaterDistortion) {
          ctx.save();
          ctx.globalAlpha = 0.03;
          const time = waterTimeRef.current;

          // Draw wavy overlay patterns (very lightweight)
          for (let y = 0; y < scaledHeight; y += 30) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = 0; x < scaledWidth; x += 10) {
              const wave = Math.sin(x * 0.01 + time * 2 + y * 0.02) * 5;
              if (x === 0) {
                ctx.moveTo(x, y + wave);
              } else {
                ctx.lineTo(x, y + wave);
              }
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      } else {
        // Default gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, scaledHeight);
        gradient.addColorStop(0, '#1e40af');
        gradient.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, scaledWidth, scaledHeight);
      }

      // Draw AI fish
      fishListRef.current.forEach((fish) => {
        if (fish.sprite) {
          const fishSpeed = Math.min(1, Math.sqrt(fish.vx ** 2 + fish.vy ** 2) / maxSpeed);
          drawFishWithDeformation(
            ctx,
            fish.sprite,
            fish.x,
            fish.y,
            fish.size,
            fish.animTime,
            fish.facingRight,
            fish.verticalTilt,
            deformationRef.current,
            { speed: fishSpeed }
          );
        } else {
          ctx.fillStyle = fish.type === 'prey' ? '#4ade80' : fish.type === 'predator' ? '#f87171' : '#a78bfa';
          ctx.beginPath();
          ctx.arc(fish.x, fish.y, fish.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw player
      const playerSpeed = Math.min(1, Math.sqrt(player.vx ** 2 + player.vy ** 2) / maxSpeed);
      if (player.sprite) {
        drawFishWithDeformation(
          ctx,
          player.sprite,
          player.x,
          player.y,
          player.size,
          player.animTime,
          player.facingRight,
          player.verticalTilt,
          deformationRef.current,
          { speed: playerSpeed, chompPhase: player.chompPhase }
        );
      } else {
        ctx.fillStyle = '#60a5fa';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Blood fog + CHOMP (world space, fixed at eat position — no movement)
      bloodParticlesRef.current.forEach((b) => {
        const alpha = Math.max(0, b.life) * 0.55;
        const r = Math.max(3, b.radius * b.life);
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
        g.addColorStop(0, `rgba(180, 40, 50, ${alpha})`);
        g.addColorStop(0.5, `rgba(140, 30, 40, ${alpha * 0.35})`);
        g.addColorStop(1, 'rgba(100, 20, 30, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      chompParticlesRef.current.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.font = `bold ${Math.round(16 * p.scale)}px sans-serif`;
        ctx.fillStyle = p.text === 'CHOMP' ? '#ffcc00' : '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1.5;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(p.text, 0, 0);
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
      });

      // Draw water effect overlay
      ctx.save();
      ctx.globalAlpha = 0.03; // Reduced from 0.1 to 0.03
      const time = waterTimeRef.current;

      // Create subtle wavy patterns
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;

        for (let x = 0; x < canvas.width; x += 10) {
          const wave = Math.sin(x * 0.01 + time + y * 0.02) * 5;
          if (x === 0) {
            ctx.moveTo(x, y + wave);
          } else {
            ctx.lineTo(x, y + wave);
          }
        }
        ctx.stroke();
      }

      // Add light rays from top
      ctx.globalAlpha = 0.02; // Reduced from 0.05 to 0.02
      const rayCount = 5;
      for (let i = 0; i < rayCount; i++) {
        const xPos = (i / rayCount) * canvas.width + Math.sin(time + i) * 50;
        const gradient = ctx.createLinearGradient(xPos, 0, xPos, canvas.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(xPos - 30, 0, 60, canvas.height);
      }

      ctx.restore();

      // Restore zoom transform
      ctx.restore();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '14px monospace';
      ctx.fillText('WASD / Arrows · Tap to move · D-pad (mobile)', 10, 20);
      ctx.fillText(`Zoom: ${(currentZoom * 100).toFixed(0)}%`, 10, 40);
      ctx.fillText(`Size: ${player.size} (eat prey to grow)`, 10, 60);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isClient]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-gray-400">Loading editor...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
      <AnalogJoystick onChange={handleJoystickChange} mode="on-touch" />
    </div>
  );
}
