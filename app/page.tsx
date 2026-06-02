import type { Metadata } from 'next';
import Script from 'next/script';
import LandingClient from '@/components/LandingClient';

const raw = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fittrack.sahari.io';
const APP_URL = raw.startsWith('http') ? raw : `https://${raw}`;

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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FitTrack — AI Calorie & Workout Tracker',
    description: 'Describe your meal and AI logs calories and macros instantly. Personal AI fitness coach included.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'FitTrack',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web, iOS, Android',
  description:
    'AI-powered calorie and workout tracker. Log meals by description, track macros, and chat with a personal AI fitness coach.',
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
      billingIncrement: 'P1M',
      name: 'Pro plan — Unlimited AI',
    },
  ],
  featureList: [
    'AI food logging by description',
    'AI workout tracking',
    'Personal AI fitness coach',
    'Macro and calorie tracking',
    'Progress charts',
    'Barcode scanner',
  ],
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
