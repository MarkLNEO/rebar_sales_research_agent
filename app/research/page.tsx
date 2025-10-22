'use client';

import { ResearchHistory } from '@/src/pages/ResearchHistory';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function ResearchPage() {
  return (
    <ProtectedRoute>
      <ResearchHistory />
    </ProtectedRoute>
  );
}
