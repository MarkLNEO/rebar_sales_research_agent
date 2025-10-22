'use client';

import { ResearchHistory } from '@/src/page-components/ResearchHistory';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function ResearchPage() {
  return (
    <ProtectedRoute>
      <ResearchHistory />
    </ProtectedRoute>
  );
}
