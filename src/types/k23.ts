export type ServiceChargeType = 'per_unit' | 'flat_monthly' | 'per_person';

export interface ServiceCatalogItem {
  id: string;
  name: string;
  unit: string;
  charge_type: ServiceChargeType;
  default_price: number;
  icon?: string;
  sort_order?: number;
  created_at?: string;
}

export interface BuildingService {
  id: string;
  building_id: string;
  service_id: string;
  custom_price: number;
  is_active: boolean;
  owner_id: string;
  created_at?: string;
  // Joined fields
  service?: ServiceCatalogItem;
}

export interface MeterReading {
  id: string;
  room_id: string;
  owner_id: string;
  building_service_id: string;
  billing_month: number;
  billing_year: number;
  previous_reading: number;
  current_reading: number;
  usage: number; // generated: current - previous
  photo_url?: string;
  read_at?: string;
  // Joined fields
  room?: {
    id: string;
    room_number?: string;
    title?: string;
  };
  building_service?: BuildingService;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue';
export type InvoiceItemType = 'rent' | 'service' | 'extra' | 'deduction';

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_type: InvoiceItemType;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number; // quantity * unit_price (or negative for deduction)
}

export interface Invoice {
  id: string;
  contract_id?: string | null;
  room_id: string;
  tenant_id?: string | null;
  owner_id: string;
  invoice_code: string;
  billing_month: number;
  billing_year: number;
  due_date?: string | null;
  total_amount: number;
  paid_amount: number;
  remaining: number; // total - paid
  status: InvoiceStatus;
  payment_method?: string | null;
  payment_proof_url?: string | null;
  vietqr_data?: string | null;
  notes?: string | null;
  paid_at?: string | null;
  created_at?: string;
  // Joined fields
  room?: {
    id: string;
    room_number?: string;
    title?: string;
    building_id?: string;
    price?: number;
  };
  tenant?: {
    id: string;
    full_name: string;
    phone?: string;
  } | null;
  items?: InvoiceItem[];
}

export interface RoomReadingRow {
  roomId: string;
  roomNumber: string;
  roomTitle: string;
  tenantName?: string;
  baseRent: number;
  // Electricity
  electricityOld: number;
  electricityNew: number;
  electricityUsage: number;
  electricityPrice: number;
  electricityPhoto?: string;
  // Water
  waterOld: number;
  waterNew: number;
  waterUsage: number;
  waterPrice: number;
  waterPhoto?: string;
}

