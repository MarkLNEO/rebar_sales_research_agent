'use client';

import { AllSignals } from '@/src/page-components/AllSignals';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function SignalsPage() {
  return (
    <ProtectedRoute>
      <AllSignals />
    </ProtectedRoute>
  );
}
