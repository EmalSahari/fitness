import type { Metadata } from 'next';
import Script from 'next/script';
import LandingClient from '@/components/LandingClient';

const raw = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fittrack.sahari.io';
const APP_URL = raw.startsWith('http') ? raw : `https://${raw}`;

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'FitTrack — AI Calorie & Fitness Tracker',
  description:
    'Log food and workouts with AI. Describe your meal and AI calculates calories and macros instantly. Water tracking, streak counter, saved meals, weekly summary, and a personal AI coach. Free to start.',
  keywords: [
    'calorie tracker', 'AI food logging', 'workout tracker', 'macro tracker',
    'fitness app', 'AI fitness coach', 'nutrition tracker', 'calorie counter',
    'water intake tracker', 'meal logger', 'food diary', 'weight loss app',
    'photo food logging', 'AI calorie counter', 'streak tracker', 'fitness tracker',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'FitTrack',
    title: 'FitTrack — AI Calorie & Fitness Tracker',
    description:
      'Describe your meal and AI logs calories and macros. Water tracking, saved meals, streak counter, and a personal AI coach. Free to start.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FitTrack — AI Calorie & Fitness Tracker',
    description: 'Describe your meal and AI logs calories and macros instantly. Water tracking, streaks, and a personal AI coach included.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'FitTrack',
  applicationCategory: 'HealthApplication',
  applicationSubCategory: 'Fitness & Nutrition',
  operatingSystem: 'Web, iOS, Android',
  description:
    'AI-powered calorie and fitness tracker. Log meals by description or photo, track macros, monitor water intake, build streaks, and chat with a personal AI fitness coach.',
  url: APP_URL,
  offers: [
    {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      name: 'Free plan — 10 AI actions/day',
    },
    {
      '@type': 'Offer',
      price: '5.99',
      priceCurrency: 'USD',
      billingPeriod: 'P1M',
      name: 'Pro plan — Unlimited AI + photo logging',
    },
  ],
  featureList: [
    'AI food logging by text description',
    'AI food logging from photo (Pro)',
    'AI workout tracking',
    'Personal AI fitness coach',
    'Macro and calorie tracking',
    'Water intake tracking',
    'Daily streak counter with milestones',
    'Saved meals and favourites',
    'Weekly nutrition summary',
    'Progress charts and weight log',
    'Barcode scanner for packaged foods',
    'Log any past day with AI',
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5',
    ratingCount: '1',
  },
};

export default function LandingPage() {
  return (
    <>
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingClient />
    </>
  );
}
