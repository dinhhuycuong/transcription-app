'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const TranscriptionApp = dynamic(
  () => import('../components/TranscriptionApp'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    ),
  }
);

export default function Page() {
  return (
    <main className="min-h-screen p-4">
      <TranscriptionApp />
    </main>
  );
}