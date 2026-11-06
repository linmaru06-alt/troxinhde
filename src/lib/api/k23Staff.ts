import { supabase, isSupabaseConfigured } from '../supabase';
import { K23StaffAssignment, CreateStaffAssignmentParams, StaffPermissions } from '../../types/k23Staff';

// Mock data ban đầu phục vụ Demo Giai đoạn 3 (P2)
const MOCK_STAFF_ASSIGNMENTS: K23StaffAssignment[] = [
  {
    id: 'staff_1',
    building_id: 'bld_1',
    building_name: 'Tòa Nhà Xanh Trọ Xinh (Triều Khúc)',
    staff_user_id: 'user_staff_hung',
    staff_name: 'Nguyễn Văn Hùng',
    staff_phone: '0912 345 678',
    owner_id: 'user_owner_1',
    role_type: 'manager',
    can_record_meter: true,
    can_manage_issues: true,
    can_collect_cash: true,
    can_view_revenue: false, // Ẩn doanh thu tổng để bảo vệ bí mật kinh doanh của chủ
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'staff_2',
    building_id: 'bld_1',
    building_name: 'Tòa Nhà Xanh Trọ Xinh (Triều Khúc)',
    staff_user_id: 'user_staff_duc',
    staff_name: 'Trần Văn Đức (Bác Bảo Vệ)',
    staff_phone: '0983 112 233',
    owner_id: 'user_owner_1',
    role_type: 'security',
    can_record_meter: true,
    can_manage_issues: true,
    can_collect_cash: false,
    can_view_revenue: false,
    created_at: '2026-10-15T09:30:00Z',
  },
  {
    id: 'staff_3',
    building_id: 'bld_2',
    building_name: 'Căn Hộ Dịch Vụ Cầu Giấy (Duy Tân)',
    staff_user_id: 'user_staff_lan',
    staff_name: 'Phạm Thị Lan',
    staff_phone: '0971 889 900',
    owner_id: 'user_owner_1',
    role_type: 'accountant',
    can_record_meter: false,
    can_manage_issues: false,
    can_collect_cash: true,
    can_view_revenue: true,
    created_at: '2026-11-01T14:00:00Z',
  },
];

let inMemoryStaff = [...MOCK_STAFF_ASSIGNMENTS];

/**
 * Lấy danh sách nhân viên được phân công cho các tòa nhà của chủ trọ
 */
export async function getStaffAssignments(ownerId: string): Promise<K23StaffAssignment[]> {
  if (isSupabaseConfigured && !ownerId.startsWith('user_owner_')) {
    try {
      const { data, error } = await supabase
        .from('k23_staff_assignments')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as K23StaffAssignment[];
      }
    } catch (err) {
      console.warn('[k23Staff] Supabase fetch error, fallback to memory:', err);
    }
  }

  return inMemoryStaff.filter(
    (s) => s.owner_id === ownerId || ownerId === 'user_owner_1' || ownerId === '00000000-0000-0000-0000-000000000002'
  );
}

/**
 * Thêm mới nhân sự và phân bổ vào tòa nhà
 */
export async function createStaffAssignment(
  ownerId: string,
  params: CreateStaffAssignmentParams
): Promise<K23StaffAssignment> {
  const newStaff: K23StaffAssignment = {
    id: 'staff_' + Date.now(),
    building_id: params.building_id,
    building_name: params.building_name || 'Tòa nhà quản lý',
    staff_user_id: 'staff_user_' + Math.random().toString(36).substring(2, 9),
    staff_name: params.staff_name,
    staff_phone: params.staff_phone,
    owner_id: ownerId,
    role_type: params.role_type,
    can_record_meter: params.can_record_meter ?? true,
    can_manage_issues: params.can_manage_issues ?? true,
    can_collect_cash: params.can_collect_cash ?? false,
    can_view_revenue: params.can_view_revenue ?? false,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && !ownerId.startsWith('user_owner_')) {
    try {
      const { data, error } = await supabase
        .from('k23_staff_assignments')
        .insert({
          building_id: newStaff.building_id,
          staff_user_id: newStaff.staff_user_id,
          owner_id: newStaff.owner_id,
          role_type: newStaff.role_type,
          can_record_meter: newStaff.can_record_meter,
          can_manage_issues: newStaff.can_manage_issues,
          can_collect_cash: newStaff.can_collect_cash,
          can_view_revenue: newStaff.can_view_revenue,
        })
        .select()
        .single();

      if (!error && data) {
        return data as K23StaffAssignment;
      }
    } catch (err) {
      console.warn('[k23Staff] Supabase insert error, fallback memory:', err);
    }
  }

  inMemoryStaff.unshift(newStaff);
  return newStaff;
}

/**
 * Cập nhật ma trận quyền hạn của nhân sự
 */
export async function updateStaffPermissions(
  assignmentId: string,
  permissions: Partial<StaffPermissions>
): Promise<boolean> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('k23_staff_assignments')
        .update(permissions)
        .eq('id', assignmentId);

      if (!error) return true;
    } catch (err) {
      console.warn('[k23Staff] Supabase update error, fallback memory:', err);
    }
  }

  inMemoryStaff = inMemoryStaff.map((s) => (s.id === assignmentId ? { ...s, ...permissions } : s));
  return true;
}

/**
 * Thu hồi quyền / xóa nhân viên khỏi tòa nhà
 */
export async function deleteStaffAssignment(assignmentId: string): Promise<boolean> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('k23_staff_assignments').delete().eq('id', assignmentId);
      if (!error) return true;
    } catch (err) {
      console.warn('[k23Staff] Supabase delete error:', err);
    }
  }

  inMemoryStaff = inMemoryStaff.filter((s) => s.id !== assignmentId);
  return true;
}

