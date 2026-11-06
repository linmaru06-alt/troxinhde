/**
 * K23 PMS — Types cho Sự cố phòng (Issues) & Sổ quỹ vận hành (Expenses)
 * (P1-03 & P1-04)
 */

export type IssueStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';
export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface K23Issue {
  id: string;
  building_id: string;
  building_name?: string;
  room_id: string;
  room_number?: string;
  tenant_id?: string;
  tenant_name?: string;
  tenant_phone?: string;
  owner_id: string;
  title: string;
  description?: string;
  image_urls?: string[];
  status: IssueStatus;
  priority: IssuePriority;
  repair_cost: number;
  assigned_to?: string;
  created_at: string;
  resolved_at?: string;
}

export interface K23Expense {
  id: string;
  owner_id: string;
  building_id: string;
  building_name?: string;
  category: 'repair' | 'cleaning' | 'utilities' | 'management' | 'other';
  category_name?: string;
  title: string;
  amount: number;
  expense_date: string;
  invoice_proof_url?: string;
  issue_id?: string;
  created_at: string;
}

export interface NetProfitMetrics {
  totalRevenueCollected: number; // Tổng thực thu tiền phòng
  totalExpenses: number;         // Tổng chi phí vận hành
  netProfit: number;             // Lợi nhuận ròng = Doanh thu - Chi phí
  profitMarginPercent: number;   // Tỷ suất sinh lời = (Lãi ròng / Doanh thu) * 100
}

