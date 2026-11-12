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

// -------------------------------------------------------------
// K23 SUBSCRIPTION & PRICING TYPES
// -------------------------------------------------------------
export type K23PlanCode = 'basic' | 'standard' | 'chain' | 'starter' | 'pro' | 'enterprise';
export type K23SubscriptionStatus = 'unsubscribed' | 'trialing' | 'active' | 'grace_period' | 'suspended' | 'cancelled';
export type K23BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export interface K23Plan {
  id: string;
  code: K23PlanCode;
  name: string;
  description: string;
  price_monthly: number;
  price_quarterly?: number;
  price_yearly: number;
  max_rooms: number;      // -1 means unlimited
  max_buildings: number;  // -1 means unlimited
  max_managers: number;
  features: string[];
  is_active: boolean;
  display_order: number;
  is_popular?: boolean;
  badge_label?: string;
}

export interface K23Subscription {
  id: string;
  owner_id: string;
  plan_code: K23PlanCode;
  billing_cycle: K23BillingCycle;
  status: K23SubscriptionStatus;
  trial_start_at?: string;
  trial_end_at?: string;
  has_used_trial?: boolean;
  current_period_start: string;
  current_period_end: string;
  grace_period_end?: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  plan?: K23Plan;
}

export interface K23SubscriptionOrder {
  id: string;
  order_code: string;
  owner_id: string;
  plan_code: K23PlanCode;
  billing_cycle: K23BillingCycle;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  payment_method?: string;
  payment_time?: string;
  transaction_ref?: string;
  created_at: string;
}


