'use client';

import { useEffect, useRef } from 'react';

const COLS = 18;
const ROWS = 10;
const CELL_SIZE = 72;

interface Cell { col: number; row: number; opacity: number; target: number; speed: number }

export default function AppBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    let raf: number;

    // Randomly lit grid cells
    const cells: Cell[] = [];
    for (let i = 0; i < 22; i++) {
      cells.push({
        col: Math.floor(Math.random() * COLS),
        row: Math.floor(Math.random() * ROWS),
        opacity: 0,
        target: Math.random() * 0.18 + 0.04,
        speed: Math.random() * 0.004 + 0.002,
      });
    }

    function resize() {
      if (!canvas) return;
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);

      const cols = Math.ceil(W / CELL_SIZE) + 1;
      const rows = Math.ceil(H / CELL_SIZE) + 1;

      // Dot grid
      ctx.fillStyle = 'rgba(148,163,184,0.09)';
      for (let c = 0; c <= cols; c++) {
        for (let r = 0; r <= rows; r++) {
          ctx.beginPath();
          ctx.arc(c * CELL_SIZE, r * CELL_SIZE, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Animated glowing cells
      for (const cell of cells) {
        // drift toward target opacity
        if (Math.abs(cell.opacity - cell.target) < 0.003) {
          // flip direction when reached
          cell.target = cell.target > 0.01
            ? 0
            : Math.random() * 0.18 + 0.04;
          if (cell.target === 0) {
            // teleport to new random position after fade out
            setTimeout(() => {
              cell.col = Math.floor(Math.random() * (Math.ceil(W / CELL_SIZE)));
              cell.row = Math.floor(Math.random() * (Math.ceil(H / CELL_SIZE)));
            }, 0);
          }
        }
        cell.opacity += (cell.target - cell.opacity) * cell.speed;

        const x = cell.col * CELL_SIZE;
        const y = cell.row * CELL_SIZE;

        // Glowing cell rectangle
        const grad = ctx.createRadialGradient(
          x + CELL_SIZE / 2, y + CELL_SIZE / 2, 0,
          x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE * 0.8
        );
        grad.addColorStop(0, `rgba(59,130,246,${cell.opacity})`);
        grad.addColorStop(1, 'rgba(59,130,246,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Border glow
        ctx.strokeStyle = `rgba(59,130,246,${cell.opacity * 0.6})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
      }

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.5 }}
    />
  );
}
