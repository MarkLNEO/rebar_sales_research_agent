'use client';

import { HomeGate } from '@/src/components/HomeGate';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomeGate />
    </ProtectedRoute>
  );
}
