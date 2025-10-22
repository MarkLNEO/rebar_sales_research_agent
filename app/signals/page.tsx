'use client';

import { AllSignals } from '@/src/pages/AllSignals';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function SignalsPage() {
  return (
    <ProtectedRoute>
      <AllSignals />
    </ProtectedRoute>
  );
}
