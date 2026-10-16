"use client";

import { useEffect, useRef } from "react";

/**
 * Plays the brand intro audio once, on the visitor's first interaction with
 * the site (click / tap / key). Browsers block autoplay before a gesture, so
 * we wait for one — then never again for the session.
 */
export default function IntroAudio() {
  const started = useRef(false);

  useEffect(() => {
    const audio = new Audio("/audio/aravowintro.mp3");
    audio.volume = 0.85;

    const stop = () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("touchend", start);
      window.removeEventListener("keydown", start);
    };

    function start() {
      if (started.current) return;
      started.current = true;
      stop();
      audio.play().catch(() => {
        // Gesture cancelled or blocked — allow the next interaction to retry.
        started.current = false;
      });
    }

    window.addEventListener("pointerdown", start);
    window.addEventListener("touchend", start);
    window.addEventListener("keydown", start);
    return () => {
      stop();
      audio.pause();
    };
  }, []);

  return null;
}
