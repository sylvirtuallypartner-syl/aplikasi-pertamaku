"use client";

import { useCallback, useState } from "react";

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

const EMOJIS = ["🎉", "⭐", "🚀", "✨", "🏆"];
let nextId = 1;

export function useCelebrate() {
  const [particles, setParticles] = useState<Particle[]>([]);

  const celebrate = useCallback((origin?: HTMLElement | null) => {
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (origin) {
      const rect = origin.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top;
    }
    const id = nextId++;
    setParticles((prev) => [...prev, { id, emoji, x, y }]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, 1100);
  }, []);

  const layer = (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          className="celebrate"
          style={{ left: p.x, top: p.y }}
        >
          {p.emoji}
        </span>
      ))}
    </>
  );

  return { celebrate, celebrateLayer: layer };
}
