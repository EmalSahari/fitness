import type { MetadataRoute } from 'next';

const raw = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fittrack.sahari.io';
const APP_URL = raw.startsWith('http') ? raw : `https://${raw}`;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/food', '/workouts', '/coach', '/progress', '/weight', '/account', '/onboarding', '/api/'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
