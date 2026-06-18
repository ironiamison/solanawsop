"use client";

import { useCallback, useEffect, useRef } from "react";

const STORAGE_KEY = "wsop_sound_enabled";

function readEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v !== "0";
  } catch {
    return true;
  }
}

function tone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.04
) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.value = gain;
  osc.connect(amp);
  amp.connect(ctx.destination);
  const now = ctx.currentTime;
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

export function useGameSounds() {
  const enabledRef = useRef(readEnabled());
  const ctxRef = useRef<AudioContext | null>(null);

  const ctx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      ctxRef.current = new Ctx();
    }
    if (ctxRef.current.state === "suspended") {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback(
    (kind: "turn" | "action" | "win" | "deal") => {
      if (!enabledRef.current) return;
      const audio = ctx();
      if (!audio) return;
      if (kind === "turn") {
        tone(audio, 660, 0.12);
        tone(audio, 880, 0.1, "triangle", 0.03);
      } else if (kind === "action") {
        tone(audio, 420, 0.08, "square", 0.025);
      } else if (kind === "win") {
        tone(audio, 523, 0.1);
        tone(audio, 659, 0.1);
        tone(audio, 784, 0.14, "triangle", 0.035);
      } else {
        tone(audio, 300, 0.06, "triangle", 0.02);
      }
    },
    [ctx]
  );

  const setEnabled = useCallback((on: boolean) => {
    enabledRef.current = on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    enabledRef.current = readEnabled();
  }, []);

  return { play, setEnabled, isEnabled: () => enabledRef.current };
}
