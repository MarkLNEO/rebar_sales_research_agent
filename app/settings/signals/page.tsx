'use client';

import { SignalSettings } from '@/src/page-components/SignalSettings';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function SignalSettingsPage() {
  return (
    <ProtectedRoute>
      <SignalSettings />
    </ProtectedRoute>
  );
}
