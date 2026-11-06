import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  K23StaffAssignment,
  CreateStaffAssignmentParams,
  StaffPermissions,
} from '../../types/k23Staff';
import {
  getStaffAssignments,
  createStaffAssignment,
  updateStaffPermissions,
  deleteStaffAssignment,
} from '../../lib/api/k23Staff';

export function useK23StaffPermissions() {
  const { currentUser, showToast } = useAppStore();
  const ownerId = currentUser?.id || 'user_owner_1';

  const [assignments, setAssignments] = useState<K23StaffAssignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getStaffAssignments(ownerId);
      setAssignments(data);
    } catch (err) {
      console.error('[useK23StaffPermissions] Failed to load staff:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const addStaff = async (params: CreateStaffAssignmentParams) => {
    try {
      const created = await createStaffAssignment(ownerId, params);
      setAssignments((prev) => [created, ...prev]);
      showToast('Đã phân công nhân sự! 🛡️', `Đã cấp quyền cho ${params.staff_name} thành công.`, 'success');
      return created;
    } catch (err: any) {
      showToast('Lỗi phân công nhân sự', err?.message || 'Vui lòng thử lại', 'error');
      throw err;
    }
  };

  const updatePermissions = async (assignmentId: string, permissions: Partial<StaffPermissions>) => {
    try {
      await updateStaffPermissions(assignmentId, permissions);
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, ...permissions } : a))
      );
      showToast('Đã cập nhật quyền hạn', 'Thay đổi quyền nhân sự có hiệu lực ngay lập tức.', 'success');
    } catch (err: any) {
      showToast('Lỗi cập nhật', err?.message || 'Vui lòng thử lại', 'error');
    }
  };

  const removeStaff = async (assignmentId: string) => {
    try {
      await deleteStaffAssignment(assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      showToast('Đã thu hồi quyền nhân sự', 'Nhân viên này không còn quyền truy cập tòa nhà.', 'info');
    } catch (err: any) {
      showToast('Lỗi xóa nhân sự', err?.message || 'Vui lòng thử lại', 'error');
    }
  };

  return {
    assignments,
    isLoading,
    refresh: loadAssignments,
    addStaff,
    updatePermissions,
    removeStaff,
  };
}

