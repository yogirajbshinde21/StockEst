"use client";
import { cn } from "../../lib/utils";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { createNoise3D } from "simplex-noise";

// Animation start time to maintain continuity across re-renders
const animationStartTime = Date.now();

export const WavyBackground = React.memo(({
  children,
  className,
  containerClassName,
  colors,
  waveWidth = 112222280,
  backgroundFill = "#0f0f23",
  blur = 0,
  speed = "slow",
  waveOpacity = 0.95,
  ...props
}) => {
  // Use useMemo to create a stable noise instance
  const noise = useMemo(() => createNoise3D(), []);
  const canvasRef = useRef(null);

  useEffect(() => {
    let animationId;
    let w, h, ctx, canvas;
    
    const getSpeed = () => {
      switch (speed) {
        case "slow": 
          return 0.0003;
        case "fast": 
          return 0.0010;
        default: 
          return 0.0004;
      }
    };
    
    // Clean, professional color palette
    const waveColors = colors ?? [
      "#7c3aed", // Purple
      "#06b6d4", // Cyan
      "#f59e0b"  // Amber
    ];

    const drawWave = (n) => {
      // Use continuous time based on actual elapsed time
      const currentTime = Date.now();
      const elapsedTime = (currentTime - animationStartTime) * getSpeed();
      
      ctx.globalAlpha = waveOpacity;
      
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.lineWidth = waveWidth + (i * 2);
        ctx.strokeStyle = waveColors[i % waveColors.length];
        
        for (let x = 0; x < w; x += 8) {
          // Cleaner wave pattern with better spacing
          const y = noise(x / 1000, 0.5 * i, elapsedTime) * 60;
          ctx.lineTo(x, y + h * 0.5 + (i * 40));
        }
        ctx.stroke();
        ctx.closePath();
      }
    };
    
    const init = () => {
      canvas = canvasRef.current;
      if (!canvas) return;
      
      ctx = canvas.getContext("2d");
      w = ctx.canvas.width = window.innerWidth;
      h = ctx.canvas.height = window.innerHeight;
      ctx.filter = `blur(${blur}px)`;
      
      const handleResize = () => {
        if (ctx) {
          w = ctx.canvas.width = window.innerWidth;
          h = ctx.canvas.height = window.innerHeight;
          ctx.filter = `blur(${blur}px)`;
        }
      };
      
      window.addEventListener('resize', handleResize);
      render();
      
      // Return cleanup function for resize listener
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    };

    const render = () => {
      if (!ctx) return;
      
      // Clear and fill background
      ctx.fillStyle = backgroundFill;
      ctx.globalAlpha = 1;
      ctx.fillRect(0, 0, w, h);
      
      // Draw only 3 waves for cleaner look
      drawWave(3);
      animationId = requestAnimationFrame(render);
    };

    const cleanup = init();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, [blur, backgroundFill, waveOpacity, waveWidth, colors, speed, noise]);

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(
      typeof window !== "undefined" &&
        navigator.userAgent.includes("Safari") &&
        !navigator.userAgent.includes("Chrome")
    );
  }, []);

  return (
    <div
      className={cn(
        "h-screen flex flex-col items-center justify-center relative overflow-hidden",
        containerClassName
      )}
    >
      <canvas
        className="absolute inset-0 z-0"
        ref={canvasRef}
        id="canvas"
        style={{
          ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
        }}
      ></canvas>
      <div className={cn("relative z-10", className)} {...props}>
        {children}
      </div>
    </div>
  );
});