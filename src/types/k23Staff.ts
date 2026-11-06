export type StaffRoleType = 'manager' | 'security' | 'accountant';

export interface StaffPermissions {
  can_record_meter: boolean;
  can_manage_issues: boolean;
  can_collect_cash: boolean;
  can_view_revenue: boolean;
}

export interface K23StaffAssignment {
  id: string;
  building_id: string;
  building_name?: string;
  staff_user_id: string;
  staff_name: string;
  staff_phone: string;
  owner_id: string;
  role_type: StaffRoleType;
  can_record_meter: boolean;
  can_manage_issues: boolean;
  can_collect_cash: boolean;
  can_view_revenue: boolean;
  created_at?: string;
}

export interface CreateStaffAssignmentParams {
  building_id: string;
  building_name?: string;
  staff_name: string;
  staff_phone: string;
  role_type: StaffRoleType;
  can_record_meter?: boolean;
  can_manage_issues?: boolean;
  can_collect_cash?: boolean;
  can_view_revenue?: boolean;
}

export const STAFF_ROLE_LABELS: Record<StaffRoleType, { label: string; desc: string; badgeColor: string }> = {
  manager: {
    label: 'Quản Lý Tòa Nhà',
    desc: 'Phụ trách vận hành trực tiếp, chốt số điện nước, xử lý sự cố phòng và ghi nhận thanh toán.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  security: {
    label: 'Bảo Vệ / Trông Xe',
    desc: 'Phụ trách an ninh, ghi nhận chỉ số công-tơ, kiểm tra vé xe và báo cáo hỏng hóc kỹ thuật.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  accountant: {
    label: 'Kế Toán Vận Hành',
    desc: 'Kiểm tra hóa đơn, đối soát tiền phòng và theo dõi sổ quỹ thu chi của chuỗi trọ.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
};

