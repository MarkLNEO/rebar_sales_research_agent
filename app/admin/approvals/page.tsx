'use client';

import { AdminApprovals } from '@/src/page-components/AdminApprovals';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';

export default function AdminApprovalsPage() {
  return (
    <ProtectedRoute>
      <AdminApprovals />
    </ProtectedRoute>
  );
}
