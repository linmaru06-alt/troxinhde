export type VehicleType = 'motorbike' | 'bicycle' | 'car';

export interface K23ParkingPermit {
  id: string;
  building_id: string;
  room_id: string;
  room_number: string;
  tenant_id?: string;
  tenant_name: string;
  tenant_phone: string;
  vehicle_type: VehicleType;
  license_plate: string;
  vehicle_brand?: string; // Ví dụ: Honda Vision, Wave Alpha, VinFast VF3...
  vehicle_color?: string;
  monthly_fee: number;
  is_active: boolean;
  registered_at: string;
  notes?: string;
}

export interface CreateParkingPermitParams {
  building_id: string;
  room_id: string;
  room_number: string;
  tenant_name: string;
  tenant_phone: string;
  vehicle_type: VehicleType;
  license_plate: string;
  vehicle_brand?: string;
  vehicle_color?: string;
  monthly_fee?: number;
  notes?: string;
}

export const VEHICLE_TYPE_META: Record<VehicleType, { label: string; defaultFee: number; badgeColor: string }> = {
  motorbike: {
    label: 'Xe Máy',
    defaultFee: 100000,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  bicycle: {
    label: 'Xe Đạp',
    defaultFee: 50000,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  car: {
    label: 'Ô Tô',
    defaultFee: 800000,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
};

