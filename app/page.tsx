import type { Metadata } from 'next';
import LandingClient from '@/components/LandingClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fittrack.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'FitTrack — AI Calorie & Workout Tracker',
  description:
    'Log food and workouts with AI. Just describe your meal — AI calculates calories and macros instantly. Chat with your personal AI fitness coach. Free to start.',
  keywords: [
    'calorie tracker', 'AI food logging', 'workout tracker', 'macro tracker',
    'fitness app', 'AI fitness coach', 'nutrition tracker', 'calorie counter',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'FitTrack',
    title: 'FitTrack — AI Calorie & Workout Tracker',
    description:
      'Describe your meal and AI logs the calories and macros. Get a personal AI fitness coach. Free forever.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'FitTrack — AI Fitness Tracker' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FitTrack — AI Calorie & Workout Tracker',
    description: 'Describe your meal and AI logs calories and macros instantly. Personal AI fitness coach included.',
    images: ['/og-image.png'],
  },
};

export default function LandingPage() {
  return <LandingClient />;
}
