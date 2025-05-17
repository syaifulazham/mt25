'use client';

import { useEffect, useRef } from 'react';

interface HoneycombPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number; // acceleration x
  ay: number; // acceleration y
  accelerating: boolean;
  accelerationTimer: number;
  connected: number[];
}

interface AnimatedHoneycombProps {
  color?: string;
  density?: number;
  speed?: number;
  lineWidth?: number;
  dotSize?: number;
  maxConnections?: number;
  className?: string;
}

export default function AnimatedHoneycomb({
  color = 'rgba(255, 255, 255, 0.3)',
  density = 100,
  speed = 0.5,
  lineWidth = 0.4,
  dotSize = 1.5,
  maxConnections = 3,
  className = '',
}: AnimatedHoneycombProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<HoneycombPoint[]>([]);
  const requestRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Initialize the canvas and animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create and configure resize observer
    resizeObserverRef.current = new ResizeObserver(() => {
      if (canvas) {
        setupCanvas(canvas);
        pointsRef.current = createPoints(canvas.width, canvas.height, density);
      }
    });
    
    // Observe the canvas element
    resizeObserverRef.current.observe(canvas);

    // Setup canvas and create initial points
    setupCanvas(canvas);
    pointsRef.current = createPoints(canvas.width, canvas.height, density);

    // Start animation loop
    const animate = () => {
      if (!canvas || !ctx) return;
      
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw points
      updatePoints(canvas.width, canvas.height, speed);
      drawHoneycombNetwork(ctx, color, lineWidth, dotSize, maxConnections);
      
      // Continue animation
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [color, density, speed, lineWidth, dotSize, maxConnections]);
  
  // Set canvas dimensions based on parent size
  const setupCanvas = (canvas: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1;
    const parentRect = canvas.parentElement?.getBoundingClientRect();
    
    if (parentRect) {
      const width = parentRect.width;
      const height = parentRect.height;
      
      // Set display size (css pixels)
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      // Set actual size in memory (scaled to account for dpr)
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      // Normalize coordinate system to use css pixels
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
  };
  
  // Create an array of points for the honeycomb network
  const createPoints = (width: number, height: number, density: number): HoneycombPoint[] => {
    const points: HoneycombPoint[] = [];
    const count = Math.floor((width * height) / (10000 / density));
    
    for (let i = 0; i < count; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        ax: 0,
        ay: 0,
        accelerating: false,
        accelerationTimer: 0,
        connected: []
      });
    }
    
    return points;
  };
  
  // Update point positions
  const updatePoints = (width: number, height: number, speed: number) => {
    const points = pointsRef.current;
    
    points.forEach(point => {
      // Randomly start acceleration for some particles
      if (!point.accelerating && Math.random() < 0.005) { // 0.5% chance per frame
        point.accelerating = true;
        point.accelerationTimer = Math.random() * 60 + 30; // 0.5-1.5 seconds at 60fps
        point.ax = (Math.random() - 0.5) * 0.05; // Random acceleration
        point.ay = (Math.random() - 0.5) * 0.05;
      }
      
      // Apply acceleration if active
      if (point.accelerating) {
        point.vx += point.ax;
        point.vy += point.ay;
        
        // Limit maximum velocity
        const maxVelocity = speed * 3;
        const currentVelocity = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
        if (currentVelocity > maxVelocity) {
          const scale = maxVelocity / currentVelocity;
          point.vx *= scale;
          point.vy *= scale;
        }
        
        // Decrease acceleration timer
        point.accelerationTimer--;
        if (point.accelerationTimer <= 0) {
          point.accelerating = false;
          point.ax = 0;
          point.ay = 0;
          
          // Reset velocity to normal range
          const normalizeTime = 30; // frames to normalize
          point.vx = point.vx * (1 - 1/normalizeTime) + ((Math.random() - 0.5) * speed) * (1/normalizeTime);
          point.vy = point.vy * (1 - 1/normalizeTime) + ((Math.random() - 0.5) * speed) * (1/normalizeTime);
        }
      }
      
      // Move points
      point.x += point.vx;
      point.y += point.vy;
      
      // Bounce off edges
      if (point.x < 0 || point.x > width) {
        point.vx = -point.vx;
        point.accelerating = false; // Stop acceleration when hitting edges
      }
      
      if (point.y < 0 || point.y > height) {
        point.vy = -point.vy;
        point.accelerating = false; // Stop acceleration when hitting edges
      }
      
      // Reset connections (will be recalculated in draw phase)
      point.connected = [];
    });
  };
  
  // Calculate distance between two points
  const getDistance = (p1: HoneycombPoint, p2: HoneycombPoint): number => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Draw the honeycomb network
  const drawHoneycombNetwork = (
    ctx: CanvasRenderingContext2D, 
    color: string,
    lineWidth: number,
    dotSize: number,
    maxConnections: number
  ) => {
    const points = pointsRef.current;
    const connectionDistance = ctx.canvas.width / 8; // Dynamic based on canvas size
    
    // Draw connections between points
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      
      // Limit connections per point for more honeycomb-like appearance
      let connections = 0;
      
      for (let j = 0; j < points.length; j++) {
        if (i === j) continue; // Skip self
        
        const otherPoint = points[j];
        const distance = getDistance(point, otherPoint);
        
        if (distance < connectionDistance && connections < maxConnections && !point.connected.includes(j)) {
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(otherPoint.x, otherPoint.y);
          
          // Mark as connected both ways
          point.connected.push(j);
          otherPoint.connected.push(i);
          
          connections++;
          if (connections >= maxConnections) break;
        }
      }
    }
    
    ctx.stroke();
    
    // Draw points
    for (const point of points) {
      // Use different sizes for accelerating particles
      const actualDotSize = point.accelerating ? dotSize * 1.5 : dotSize;
      
      // Use different colors for accelerating particles
      ctx.fillStyle = point.accelerating ? 'rgba(255, 255, 255, 0.18)' : color;
      
      ctx.beginPath();
      ctx.arc(point.x, point.y, actualDotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  return (
    <canvas 
      ref={canvasRef} 
      className={`absolute inset-0 w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
}
