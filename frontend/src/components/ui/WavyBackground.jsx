"use client";
import { cn } from "../../lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";

export const WavyBackground = ({
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
  const noise = createNoise3D();
  const canvasRef = useRef(null);

  useEffect(() => {
    let animationId;
    let w, h, nt, i, x, ctx, canvas;
    
    const getSpeed = () => {
      switch (speed) {
        case "slow": 
          return 0.0013;
        case "fast": 
          return 0.0015;
        default: 
          return 0.0008;
      }
    };
    
    // Clean, professional color palette
    const waveColors = colors ?? [
      "#7c3aed", // Purple
      "#06b6d4", // Cyan
      "#f59e0b"  // Amber
    ];

    const drawWave = (n) => {
      nt += getSpeed();
      ctx.globalAlpha = waveOpacity;
      
      for (i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.lineWidth = waveWidth + (i * 2);
        ctx.strokeStyle = waveColors[i % waveColors.length];
        
        for (x = 0; x < w; x += 8) {
          // Cleaner wave pattern with better spacing
          const y = noise(x / 1000, 0.5 * i, nt) * 60;
          ctx.lineTo(x, y + h * 0.5 + (i * 40));
        }
        ctx.stroke();
        ctx.closePath();
      }
    };
    
    const init = () => {
      canvas = canvasRef.current;
      ctx = canvas.getContext("2d");
      w = ctx.canvas.width = window.innerWidth;
      h = ctx.canvas.height = window.innerHeight;
      ctx.filter = `blur(${blur}px)`;
      nt = 0;
      window.onresize = function () {
        w = ctx.canvas.width = window.innerWidth;
        h = ctx.canvas.height = window.innerHeight;
        ctx.filter = `blur(${blur}px)`;
      };
      render();
    };

    const render = () => {
      // Clear and fill background
      ctx.fillStyle = backgroundFill;
      ctx.globalAlpha = 1;
      ctx.fillRect(0, 0, w, h);
      
      // Draw only 3 waves for cleaner look
      drawWave(3);
      animationId = requestAnimationFrame(render);
    };

    init();
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [blur, backgroundFill, waveOpacity, waveWidth, colors, speed, noise]); // Added dependencies

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
};