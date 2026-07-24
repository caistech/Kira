import type { MetadataRoute } from 'next';

// Web app manifest (served at /manifest.webmanifest, auto-linked by Next). Makes Kira installable —
// one home-screen icon that opens straight to the mic (start_url = /talk) in a standalone window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kira — your fractional exec',
    short_name: 'Kira',
    description: 'Talk to Kira — your fractional exec. One tap, and she picks up where you left off.',
    start_url: '/talk',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fffbeb',
    theme_color: '#fb7185',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
