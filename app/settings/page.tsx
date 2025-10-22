'use client';

import { Settings } from '@/src/page-components/Settings';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  );
}
