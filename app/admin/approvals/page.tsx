'use client';

import { AdminApprovals } from '@/src/pages/AdminApprovals';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function AdminApprovalsPage() {
  return (
    <ProtectedRoute>
      <AdminApprovals />
    </ProtectedRoute>
  );
}
