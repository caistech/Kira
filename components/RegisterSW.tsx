'use client';

// Registers the minimal service worker so Kira is installable as a PWA. Fail-soft: any error (no SW
// support, blocked) is swallowed — the app works identically without it.
import { useEffect } from 'react';

export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
