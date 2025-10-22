'use client';

import { OnboardingEnhanced as Onboarding } from '@/src/page-components/OnboardingEnhanced';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <Onboarding />
    </ProtectedRoute>
  );
}
