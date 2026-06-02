import type { MetadataRoute } from 'next';

const raw = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fittrack.sahari.io';
const APP_URL = raw.startsWith('http') ? raw : `https://${raw}`;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${APP_URL}/auth/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];
}
