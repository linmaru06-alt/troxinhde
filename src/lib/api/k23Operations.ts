import { supabase, isSupabaseConfigured } from '../supabase';
import { resolveUserIdToUuid } from './messages';
import { K23Issue, K23Expense, NetProfitMetrics } from '../../types/k23Operations';

// -------------------------------------------------------------------------
// MOCK DATA MẪU SỰ CỐ & SỔ QUỸ (Dành cho Demo & Offline Mode)
// -------------------------------------------------------------------------
const INITIAL_MOCK_ISSUES: K23Issue[] = [
  {
    id: 'issue_1',
    building_id: 'bld_1',
    building_name: 'Tòa Nhà Xanh Cầu Giấy',
    room_id: 'room_1',
    room_number: 'P.302',
    tenant_name: 'Nguyễn Văn An',
    tenant_phone: '0988 123 456',
    owner_id: 'user_owner_1',
    title: 'Hỏng van nước vòi sen nhà tắm rò rỉ liên tục',
    description: 'Vòi sen chảy nhỏ giọt cả đêm kêu tạch tạch rất khó ngủ, nhờ chủ nhà cho thợ qua sửa giúp.',
    image_urls: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
    ],
    status: 'in_progress',
    priority: 'high',
    repair_cost: 150000,
    assigned_to: 'Thợ điện nước anh Hùng (0912 345 678)',
    created_at: '2026-11-04T10:00:00Z',
  },
  {
    id: 'issue_2',
    building_id: 'bld_1',
    building_name: 'Tòa Nhà Xanh Cầu Giấy',
    room_id: 'room_2',
    room_number: 'P.303',
    tenant_name: 'Lê Thị Thu Mai',
    tenant_phone: '0977 654 321',
    owner_id: 'user_owner_1',
    title: 'Điều hòa không mát, chỉ ra gió',
    description: 'Bật 18 độ nửa tiếng vẫn không thấy lạnh, nghi hết ga hoặc hỏng tụ lốc máy ngoài.',
    status: 'pending',
    priority: 'urgent',
    repair_cost: 0,
    created_at: '2026-11-05T14:30:00Z',
  },
  {
    id: 'issue_3',
    building_id: 'bld_1',
    building_name: 'Tòa Nhà Xanh Cầu Giấy',
    room_id: 'room_3',
    room_number: 'P.304',
    tenant_name: 'Trần Minh Đức',
    tenant_phone: '0912 888 999',
    owner_id: 'user_owner_1',
    title: 'Bóng đèn tuýp ban công bị nhấp nháy',
    description: 'Bóng đèn cũ đã thay xong, hoạt động sáng tốt.',
    status: 'resolved',
    priority: 'low',
    repair_cost: 80000,
    assigned_to: 'Bảo vệ tòa nhà',
    created_at: '2026-11-01T08:00:00Z',
    resolved_at: '2026-11-01T15:00:00Z',
  },
];

const INITIAL_MOCK_EXPENSES: K23Expense[] = [
  {
    id: 'exp_1',
    owner_id: 'user_owner_1',
    building_id: 'bld_1',
    building_name: 'Tòa Nhà Xanh Cầu Giấy',
    category: 'utilities',
    category_name: 'Internet cáp quang tòa nhà',
    title: 'Cước mạng VNPT tốc độ cao 500Mbps tháng 11',
    amount: 550000,
    expense_date: '2026-11-02',
    created_at: '2026-11-02T09:00:00Z',
  },
  {
    id: 'exp_2',
    owner_id: 'user_owner_1',
    building_id: 'bld_1',
    building_name: 'Tòa Nhà Xanh Cầu Giấy',
    category: 'cleaning',
    category_name: 'Vệ sinh hành lang & đổ rác',
    title: 'Tiền dọn vệ sinh hành lang & rác thải tháng 11',
    amount: 400000,
    expense_date: '2026-11-03',
    created_at: '2026-11-03T10:00:00Z',
  },
  {
    id: 'exp_3',
    owner_id: 'user_owner_1',
    building_id: 'bld_1',
    building_name: 'Tòa Nhà Xanh Cầu Giấy',
    category: 'repair',
    category_name: 'Sửa chữa bảo dưỡng',
    title: 'Thay bóng đèn ban công P.304',
    amount: 80000,
    expense_date: '2026-11-01',
    issue_id: 'issue_3',
    created_at: '2026-11-01T15:00:00Z',
  },
];

let localIssues: K23Issue[] = [...INITIAL_MOCK_ISSUES];
let localExpenses: K23Expense[] = [...INITIAL_MOCK_EXPENSES];

/**
 * Lấy danh sách sự cố của chủ trọ
 */
export async function getOwnerIssues(ownerId: string): Promise<K23Issue[]> {
  if (!ownerId) return [];

  if (isSupabaseConfigured) {
    try {
      const cleanOwnerId = await resolveUserIdToUuid(ownerId);
      const { data, error } = await supabase
        .from('k23_issues')
        .select('*')
        .eq('owner_id', cleanOwnerId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as K23Issue[];
      }
    } catch {
      // fallback
    }
  }

  return localIssues;
}

/**
 * Tạo sự cố phòng mới
 */
export async function createK23Issue(issue: Omit<K23Issue, 'id' | 'created_at'>): Promise<K23Issue> {
  const newIssue: K23Issue = {
    ...issue,
    id: `issue_${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  localIssues.unshift(newIssue);

  if (isSupabaseConfigured) {
    try {
      const cleanOwnerId = await resolveUserIdToUuid(issue.owner_id);
      await supabase.from('k23_issues').insert({
        ...newIssue,
        owner_id: cleanOwnerId,
      });
    } catch {
      // ignore
    }
  }

  return newIssue;
}

/**
 * Cập nhật trạng thái sự cố (Tiếp nhận -> Giao thợ -> Nghiệm thu)
 */
export async function updateK23IssueStatus(
  issueId: string,
  status: K23Issue['status'],
  assignedTo?: string,
  repairCost?: number
): Promise<{ success: boolean }> {
  const item = localIssues.find((i) => i.id === issueId);
  if (item) {
    item.status = status;
    if (assignedTo !== undefined) item.assigned_to = assignedTo;
    if (repairCost !== undefined) item.repair_cost = repairCost;
    if (status === 'resolved') {
      item.resolved_at = new Date().toISOString();

      // Nếu có chi phí sửa chữa, tự động sinh bản ghi trong Sổ chi phí vận hành (P1-03)
      if (item.repair_cost > 0) {
        const autoExpense: K23Expense = {
          id: `exp_auto_${Date.now()}`,
          owner_id: item.owner_id,
          building_id: item.building_id,
          building_name: item.building_name,
          category: 'repair',
          category_name: 'Sửa chữa sự cố phòng',
          title: `Chi phí sửa: ${item.title} (${item.room_number || 'Phòng'})`,
          amount: item.repair_cost,
          expense_date: new Date().toISOString().split('T')[0],
          issue_id: item.id,
          created_at: new Date().toISOString(),
        };
        localExpenses.unshift(autoExpense);
      }
    }
  }

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('k23_issues')
        .update({
          status,
          assigned_to: assignedTo,
          repair_cost: repairCost,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        })
        .eq('id', issueId);
    } catch {
      // ignore
    }
  }

  return { success: true };
}

/**
 * Lấy danh sách chi phí vận hành
 */
export async function getOwnerExpenses(ownerId: string): Promise<K23Expense[]> {
  if (!ownerId) return [];

  if (isSupabaseConfigured) {
    try {
      const cleanOwnerId = await resolveUserIdToUuid(ownerId);
      const { data, error } = await supabase
        .from('k23_expenses')
        .select('*')
        .eq('owner_id', cleanOwnerId)
        .order('expense_date', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as K23Expense[];
      }
    } catch {
      // fallback
    }
  }

  return localExpenses;
}

/**
 * Tạo bản ghi chi phí vận hành mới
 */
export async function createK23Expense(expense: Omit<K23Expense, 'id' | 'created_at'>): Promise<K23Expense> {
  const newExp: K23Expense = {
    ...expense,
    id: `exp_${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  localExpenses.unshift(newExp);

  if (isSupabaseConfigured) {
    try {
      const cleanOwnerId = await resolveUserIdToUuid(expense.owner_id);
      await supabase.from('k23_expenses').insert({
        ...newExp,
        owner_id: cleanOwnerId,
      });
    } catch {
      // ignore
    }
  }

  return newExp;
}

/**
 * Xóa một bản ghi chi phí
 */
export async function deleteK23Expense(expenseId: string): Promise<{ success: boolean }> {
  localExpenses = localExpenses.filter((e) => e.id !== expenseId);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('k23_expenses').delete().eq('id', expenseId);
    } catch {
      // ignore
    }
  }

  return { success: true };
}

/**
 * P1-03: Tính toán Lợi Nhuận Ròng (Net Profit) = Thực Thu Tiền Phòng - Chi Phí Vận Hành
 */
export function calculateNetProfit(
  totalRevenueCollected: number,
  expenses: K23Expense[]
): NetProfitMetrics {
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenueCollected - totalExpenses;
  const profitMarginPercent = totalRevenueCollected > 0
    ? Math.round((netProfit / totalRevenueCollected) * 100)
    : 0;

  return {
    totalRevenueCollected,
    totalExpenses,
    netProfit,
    profitMarginPercent,
  };
}

