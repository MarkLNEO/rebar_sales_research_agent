'use client';

import { SignalSettings } from '@/src/pages/SignalSettings';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function SignalSettingsPage() {
  return (
    <ProtectedRoute>
      <SignalSettings />
    </ProtectedRoute>
  );
}
