"use client";

import React, { useRef, useEffect, useCallback } from "react";

interface Spark {
  x: number;
  y: number;
  angle: number;
  velocity: number;
  radius: number;
  opacity: number;
}

export interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: string;
  extraScale?: number;
  children?: React.ReactNode;
}

/**
 * ClickSpark: Komponen animasi kembang api (sparks) saat diklik.
 * Terinspirasi dari React Bits (reactbits.dev).
 */
export function ClickSpark({
  sparkColor = "#fff",
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  extraScale = 1,
  children,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const drawSparks = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let allDead = true;

      sparksRef.current.forEach((spark) => {
        if (progress >= 1) return;
        allDead = false;

        const currentRadius = spark.radius * (1 - easeOut);
        const distance = (sparkRadius * extraScale * easeOut) + (spark.velocity * easeOut * 20);
        const currentX = spark.x + Math.cos(spark.angle) * distance;
        const currentY = spark.y + Math.sin(spark.angle) * distance;
        
        // Memudar (fade out)
        const currentOpacity = spark.opacity * (1 - easeOut);

        ctx.beginPath();
        
        // Menggambar garis spark (seperti kembang api)
        const lineLength = sparkSize * (1 - progress);
        const startX = currentX - Math.cos(spark.angle) * lineLength;
        const startY = currentY - Math.sin(spark.angle) * lineLength;
        
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        
        ctx.strokeStyle = sparkColor;
        ctx.globalAlpha = currentOpacity;
        ctx.lineWidth = currentRadius;
        ctx.lineCap = "round";
        ctx.stroke();
      });

      if (!allDead && progress < 1) {
        animationRef.current = requestAnimationFrame(drawSparks);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        sparksRef.current = [];
        startTimeRef.current = null;
      }
    },
    [duration, sparkColor, sparkRadius, sparkSize, extraScale]
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newSparks: Spark[] = [];
      const angleStep = (Math.PI * 2) / sparkCount;

      for (let i = 0; i < sparkCount; i++) {
        // Sedikit variasi acak agar terlihat natural
        const randomAngleOffset = (Math.random() - 0.5) * 0.5;
        const randomVelocity = 0.5 + Math.random();
        
        newSparks.push({
          x,
          y,
          angle: i * angleStep + randomAngleOffset,
          velocity: randomVelocity,
          radius: 2 + Math.random() * 1.5,
          opacity: 0.8 + Math.random() * 0.2,
        });
      }

      sparksRef.current = newSparks;
      startTimeRef.current = null; // Reset animasi
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(drawSparks);
    },
    [sparkCount, drawSparks]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Resize canvas to match window
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("click", handleClick);
    
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", handleClick);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [handleClick]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50 h-screen w-screen"
        aria-hidden="true"
      />
      {children}
    </>
  );
}
