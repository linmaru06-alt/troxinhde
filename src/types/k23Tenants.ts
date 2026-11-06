export interface K23Tenant {
  id: string;
  owner_id: string;
  full_name: string;
  phone: string;
  email?: string;
  id_card_number?: string; // Số CCCD
  id_card_date?: string;   // Ngày cấp
  id_card_place?: string;  // Nơi cấp
  hometown?: string;       // Quê quán
  vehicle_plate?: string;  // Biển số xe
  id_card_front_url?: string;
  id_card_back_url?: string;
  notes?: string;
  created_at?: string;
}

export type K23ContractStatus = 'active' | 'expiring_soon' | 'expired' | 'terminated';

export interface K23Contract {
  id: string;
  contract_code: string;
  owner_id: string;
  room_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit_amount: number;
  payment_cycle_months: number;
  payment_due_day: number; // Ngày nộp tiền hàng tháng (mặc định: ngày 5 hoặc 10)
  status: K23ContractStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;

  // Joined fields
  room?: {
    id: string;
    room_number: string;
    title: string;
    building_id?: string;
    building_name?: string;
  };
  tenant?: K23Tenant;
}

export interface CreateContractParams {
  owner_id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit_amount: number;
  payment_cycle_months?: number;
  payment_due_day?: number;
  notes?: string;

  // Tenant info (nếu tạo mới hoặc chọn)
  tenant_id?: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_email?: string;
  tenant_id_card?: string;
  tenant_id_card_date?: string;
  tenant_id_card_place?: string;
  tenant_hometown?: string;
  tenant_vehicle_plate?: string;
  tenant_id_front_url?: string;
  tenant_id_back_url?: string;
}

