'use client';

import { OnboardingEnhanced as Onboarding } from '@/src/pages/OnboardingEnhanced';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <Onboarding />
    </ProtectedRoute>
  );
}
