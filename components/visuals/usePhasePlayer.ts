"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Steps a visual through its phases: autoplays once on mount, can replay,
 * and can jump straight to a phase. With reduced motion it shows the last phase.
 */
export function usePhasePlayer(count: number, { stepMs = 2000, startDelayMs = 700 } = {}) {
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const play = useCallback(() => {
    clear();
    setPhase(0);
    setPlaying(true);
    for (let i = 1; i < count; i++) {
      timers.current.push(window.setTimeout(() => setPhase(i), startDelayMs + (i - 1) * stepMs));
    }
    timers.current.push(window.setTimeout(() => setPlaying(false), startDelayMs + (count - 1) * stepMs));
  }, [clear, count, stepMs, startDelayMs]);

  const goTo = useCallback(
    (i: number) => {
      clear();
      setPlaying(false);
      setPhase(i);
    },
    [clear],
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPhase(count - 1);
    else play();
    return clear;
  }, [clear, count, play]);

  return { phase, playing, play, goTo };
}
