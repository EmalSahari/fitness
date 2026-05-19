import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FitTrack',
    short_name: 'FitTrack',
    description: 'Track nutrition and workouts with an AI coach',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#2563eb',
    orientation: 'portrait',
    categories: ['health', 'fitness'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Log Food',
        short_name: 'Food',
        url: '/food',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Log Workout',
        short_name: 'Workout',
        url: '/workouts',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
