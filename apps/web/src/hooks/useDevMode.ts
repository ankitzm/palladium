"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "palladium-dev";

// Reads and toggles the global "dev mode" flag, mirrored to a `dev` class on
// <html> (CSS gates dev-only UI) and persisted to localStorage. The initial
// class is set by an inline script in the layout to avoid a flash.
export function useDevMode() {
  const [dev, setDev] = useState(false);

  useEffect(() => {
    setDev(document.documentElement.classList.contains("dev"));
  }, []);

  function toggle() {
    setDev((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dev", next);
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }

  return { dev, toggle };
}
