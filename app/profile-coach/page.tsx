'use client';

import { CompanyProfile } from '@/src/pages/CompanyProfile';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function ProfileCoachPage() {
  return (
    <ProtectedRoute>
      <CompanyProfile />
    </ProtectedRoute>
  );
}
