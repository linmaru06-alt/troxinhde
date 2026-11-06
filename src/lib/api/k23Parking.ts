import { supabase, isSupabaseConfigured } from '../supabase';
import { K23ParkingPermit, CreateParkingPermitParams } from '../../types/k23Parking';

const MOCK_PARKING_PERMITS: K23ParkingPermit[] = [
  {
    id: 'pkg_1',
    building_id: 'bld_1',
    room_id: 'room_1',
    room_number: 'P.302',
    tenant_name: 'Nguyễn Văn An',
    tenant_phone: '0988 123 456',
    vehicle_type: 'motorbike',
    license_plate: '17B2-688.99',
    vehicle_brand: 'Honda AirBlade',
    vehicle_color: 'Đen nhám',
    monthly_fee: 100000,
    is_active: true,
    registered_at: '2026-08-01T08:00:00Z',
  },
  {
    id: 'pkg_2',
    building_id: 'bld_1',
    room_id: 'room_2',
    room_number: 'P.303',
    tenant_name: 'Lê Thị Thu Mai',
    tenant_phone: '0977 654 321',
    vehicle_type: 'motorbike',
    license_plate: '34C1-345.67',
    vehicle_brand: 'Yamaha Grande',
    vehicle_color: 'Trắng',
    monthly_fee: 100000,
    is_active: true,
    registered_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'pkg_3',
    building_id: 'bld_1',
    room_id: 'room_3',
    room_number: 'P.304',
    tenant_name: 'Trần Minh Đức',
    tenant_phone: '0912 888 999',
    vehicle_type: 'motorbike',
    license_plate: '14P9-999.88',
    vehicle_brand: 'Honda SH 150i',
    vehicle_color: 'Đỏ mận',
    monthly_fee: 100000,
    is_active: true,
    registered_at: '2026-05-01T08:00:00Z',
  },
];

let inMemoryPermits = [...MOCK_PARKING_PERMITS];

export async function getParkingPermits(buildingId: string = 'bld_1'): Promise<K23ParkingPermit[]> {
  if (isSupabaseConfigured && !buildingId.startsWith('bld_')) {
    try {
      const { data, error } = await supabase
        .from('k23_parking_permits')
        .select('*')
        .eq('building_id', buildingId)
        .order('registered_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as K23ParkingPermit[];
      }
    } catch (err) {
      console.warn('[k23Parking] Supabase fetch error, fallback memory:', err);
    }
  }

  return inMemoryPermits.filter((p) => p.building_id === buildingId || buildingId === 'bld_1');
}

export async function createParkingPermit(params: CreateParkingPermitParams): Promise<K23ParkingPermit> {
  const newPermit: K23ParkingPermit = {
    id: 'pkg_' + Date.now(),
    building_id: params.building_id,
    room_id: params.room_id,
    room_number: params.room_number,
    tenant_name: params.tenant_name,
    tenant_phone: params.tenant_phone,
    vehicle_type: params.vehicle_type,
    license_plate: params.license_plate.toUpperCase().trim(),
    vehicle_brand: params.vehicle_brand,
    vehicle_color: params.vehicle_color,
    monthly_fee: params.monthly_fee ?? 100000,
    is_active: true,
    registered_at: new Date().toISOString(),
    notes: params.notes,
  };

  if (isSupabaseConfigured && !params.building_id.startsWith('bld_')) {
    try {
      const { data, error } = await supabase
        .from('k23_parking_permits')
        .insert({
          building_id: newPermit.building_id,
          room_id: newPermit.room_id,
          license_plate: newPermit.license_plate,
          vehicle_type: newPermit.vehicle_type,
          monthly_fee: newPermit.monthly_fee,
          is_active: true,
        })
        .select()
        .single();

      if (!error && data) {
        return data as K23ParkingPermit;
      }
    } catch (err) {
      console.warn('[k23Parking] Supabase insert error, fallback memory:', err);
    }
  }

  inMemoryPermits.unshift(newPermit);
  return newPermit;
}

export async function toggleParkingPermitStatus(permitId: string, isActive: boolean): Promise<boolean> {
  inMemoryPermits = inMemoryPermits.map((p) => (p.id === permitId ? { ...p, is_active: isActive } : p));
  return true;
}

export async function deleteParkingPermit(permitId: string): Promise<boolean> {
  inMemoryPermits = inMemoryPermits.filter((p) => p.id !== permitId);
  return true;
}

