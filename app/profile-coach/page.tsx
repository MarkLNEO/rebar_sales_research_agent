'use client';

import { CompanyProfile } from '@/src/page-components/CompanyProfile';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function ProfileCoachPage() {
  return (
    <ProtectedRoute>
      <CompanyProfile />
    </ProtectedRoute>
  );
}
