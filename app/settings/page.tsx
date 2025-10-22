'use client';

import { Settings } from '@/src/pages/Settings';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  );
}
