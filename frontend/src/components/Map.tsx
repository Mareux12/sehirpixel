import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

const MAP_WIDTH = 450;
const MAP_HEIGHT = 200;
const PIXEL_SIZE = 4; // Base size of each pixel on canvas

export const Map: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { pixels, cities, user, socket, cooldownRemaining, setCooldown } = useGameStore();

  const scale = useRef(1);
  const offset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mousedownPos = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>(0);
  const hoveredPixel = useRef<{ x: number; y: number } | null>(null);

  // Center map initially
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const w = canvas.parentElement?.clientWidth || canvas.width;
      const h = canvas.parentElement?.clientHeight || canvas.height;
      const initialScale = Math.min(
        w / (MAP_WIDTH * PIXEL_SIZE),
        h / (MAP_HEIGHT * PIXEL_SIZE)
      ) * 0.9;
      
      scale.current = initialScale;
      offset.current = {
        x: (w - MAP_WIDTH * PIXEL_SIZE * initialScale) / 2,
        y: (h - MAP_HEIGHT * PIXEL_SIZE * initialScale) / 2,
      };
    }
  }, []);

  // Create offscreen canvas for caching
  const cachedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isCanvasGenerated = useRef(false);

  useEffect(() => {
    if (pixels.length === 0 || isCanvasGenerated.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = MAP_WIDTH * PIXEL_SIZE;
    canvas.height = MAP_HEIGHT * PIXEL_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colorMap: Record<number, string> = {};
    cities.forEach(c => colorMap[c.id] = c.color);

    pixels.forEach(p => {
      ctx.fillStyle = colorMap[p.cityId] || '#ffffff';
      ctx.fillRect(p.x * PIXEL_SIZE, p.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    });

    cachedCanvasRef.current = canvas;
    isCanvasGenerated.current = true;
  }, [pixels, cities]);

  // Incremental update for single pixels
  const { lastUpdatedPixel } = useGameStore();
  
  useEffect(() => {
    if (lastUpdatedPixel && cachedCanvasRef.current) {
      const ctx = cachedCanvasRef.current.getContext('2d');
      if (!ctx) return;
      const city = cities.find(c => c.id === lastUpdatedPixel.cityId);
      if (city) {
         ctx.fillStyle = city.color;
         ctx.fillRect(lastUpdatedPixel.x * PIXEL_SIZE, lastUpdatedPixel.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      }
    }
  }, [lastUpdatedPixel, cities]);

  // Render Map via requestAnimationFrame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.translate(offset.current.x, offset.current.y);
      ctx.scale(scale.current, scale.current);

      ctx.imageSmoothingEnabled = false;

      if (cachedCanvasRef.current) {
        ctx.drawImage(cachedCanvasRef.current, 0, 0);
      }

      // Draw hover highlight
      const hp = hoveredPixel.current;
      if (hp) {
        const px = hp.x * PIXEL_SIZE;
        const py = hp.y * PIXEL_SIZE;
        
        // White border exactly around the pixel
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 / scale.current;
        ctx.strokeRect(px, py, PIXEL_SIZE, PIXEL_SIZE);
      }

      ctx.restore();
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  // Handle Resize with DPR support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cooldown Timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => setCooldown(cooldownRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining, setCooldown]);

  // Convert screen coords to grid coords
  const screenToGrid = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const canvasX = (mouseX - offset.current.x) / scale.current;
    const canvasY = (mouseY - offset.current.y) / scale.current;
    const gridX = Math.floor(canvasX / PIXEL_SIZE);
    const gridY = Math.floor(canvasY / PIXEL_SIZE);
    if (gridX >= 0 && gridX < MAP_WIDTH && gridY >= 0 && gridY < MAP_HEIGHT) {
      return { x: gridX, y: gridY };
    }
    return null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(0.5, scale.current * (1 + delta)), 5);
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newOffsetX = mouseX - (mouseX - offset.current.x) * (newScale / scale.current);
      const newOffsetY = mouseY - (mouseY - offset.current.y) * (newScale / scale.current);

      scale.current = newScale;
      offset.current = { x: newOffsetX, y: newOffsetY };
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    mousedownPos.current = { x: e.clientX, y: e.clientY };
    dragStart.current = { x: e.clientX - offset.current.x, y: e.clientY - offset.current.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      offset.current = {
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      };
      hoveredPixel.current = null;
    } else {
      // Update hovered pixel
      const grid = screenToGrid(e.clientX, e.clientY);
      if (grid) {
        const isLand = pixels.some(p => p.x === grid.x && p.y === grid.y);
        hoveredPixel.current = isLand ? grid : null;
      } else {
        hoveredPixel.current = null;
      }
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    hoveredPixel.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    const dist = Math.hypot(e.clientX - mousedownPos.current.x, e.clientY - mousedownPos.current.y);
    if (dist > 5) return;
    if (!user || !socket || cooldownRemaining > 0) return;

    const grid = screenToGrid(e.clientX, e.clientY);
    if (!grid) return;

    const isLand = pixels.some(p => p.x === grid.x && p.y === grid.y);
    if (isLand) {
      socket.emit('place_pixel', {
        userId: user.id,
        x: grid.x,
        y: grid.y,
        cityId: user.cityId
      });
      setCooldown(30);
    }
  };

  return (
    <div className="flex-1 relative overflow-hidden cursor-crosshair" style={{ background: 'radial-gradient(ellipse at 50% 40%, #0F1B3D 0%, #080E1F 50%, #050810 100%)' }}>
      {/* Cooldown indicator */}
      {cooldownRemaining > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 glass rounded-2xl px-6 py-3 z-20 flex items-center gap-4 animate-slide-up shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <div className="text-slate-400 text-sm font-medium">Sonraki hamle</div>
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#6366F1" strokeWidth="2.5"
                strokeDasharray={`${(cooldownRemaining / 30) * 94.25} 94.25`}
                strokeLinecap="round" className="transition-all duration-1000"
              />
            </svg>
            <span className="text-sm font-bold text-white">{cooldownRemaining}</span>
          </div>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
    </div>
  );
};
