import { supabase, isSupabaseConfigured } from '../supabase';
import { ServiceCatalogItem, BuildingService } from '../../types/k23';

export const DEFAULT_SERVICE_CATALOG: ServiceCatalogItem[] = [
  { id: 'srv_elec', name: 'Tiền điện', unit: 'kWh', charge_type: 'per_unit', default_price: 3500, icon: 'zap', sort_order: 1 },
  { id: 'srv_water', name: 'Tiền nước', unit: 'm³', charge_type: 'per_unit', default_price: 25000, icon: 'droplets', sort_order: 2 },
  { id: 'srv_trash', name: 'Rác sinh hoạt', unit: 'phòng', charge_type: 'flat_monthly', default_price: 20000, icon: 'trash-2', sort_order: 3 },
  { id: 'srv_wifi', name: 'Wifi Internet', unit: 'phòng', charge_type: 'flat_monthly', default_price: 50000, icon: 'wifi', sort_order: 4 },
  { id: 'srv_park', name: 'Gửi xe máy', unit: 'xe', charge_type: 'per_unit', default_price: 100000, icon: 'bike', sort_order: 5 },
  { id: 'srv_lift', name: 'Thang máy', unit: 'phòng', charge_type: 'flat_monthly', default_price: 50000, icon: 'arrow-up', sort_order: 6 },
  { id: 'srv_sec', name: 'Bảo vệ / An ninh', unit: 'phòng', charge_type: 'flat_monthly', default_price: 30000, icon: 'shield', sort_order: 7 },
];

export async function getServiceCatalog(): Promise<ServiceCatalogItem[]> {
  if (!isSupabaseConfigured) return DEFAULT_SERVICE_CATALOG;

  try {
    const { data, error } = await supabase
      .from('service_catalog')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_SERVICE_CATALOG;
    }
    return data;
  } catch {
    return DEFAULT_SERVICE_CATALOG;
  }
}

export async function getBuildingServices(buildingId: string): Promise<BuildingService[]> {
  if (!isSupabaseConfigured || !buildingId) return [];

  const { data, error } = await supabase
    .from('building_services')
    .select(`
      id,
      building_id,
      service_id,
      custom_price,
      is_active,
      owner_id,
      created_at,
      service:service_catalog(*)
    `)
    .eq('building_id', buildingId);

  if (error) {
    console.warn('[k23Services] Error fetching building services:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    ...row,
    service: Array.isArray(row.service) ? row.service[0] : row.service,
  }));
}

export async function saveBuildingServices(
  buildingId: string,
  ownerId: string,
  services: Array<{ service_id: string; custom_price: number; is_active: boolean }>
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const rows = services.map((s) => ({
    building_id: buildingId,
    service_id: s.service_id,
    custom_price: s.custom_price,
    is_active: s.is_active,
    owner_id: ownerId,
  }));

  const { error } = await supabase
    .from('building_services')
    .upsert(rows, { onConflict: 'building_id,service_id' });

  if (error) throw error;
}

export interface BuildingBankAccount {
  bankId: string;
  accountNo: string;
  accountName: string;
}

export async function getBuildingBankAccount(buildingId: string): Promise<BuildingBankAccount | null> {
  if (!isSupabaseConfigured || !buildingId) return null;

  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('bank_id, bank_account_no, bank_account_name')
      .eq('id', buildingId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      bankId: data.bank_id || 'TCB',
      accountNo: data.bank_account_no || '',
      accountName: data.bank_account_name || '',
    };
  } catch {
    return null;
  }
}

export async function saveBuildingBankAccount(
  buildingId: string,
  bank: BuildingBankAccount
): Promise<void> {
  if (!isSupabaseConfigured || !buildingId) return;

  const { error } = await supabase
    .from('buildings')
    .update({
      bank_id: (bank.bankId || 'TCB').trim().toUpperCase(),
      bank_account_no: (bank.accountNo || '').trim(),
      bank_account_name: (bank.accountName || '').trim().toUpperCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', buildingId);

  if (error) {
    // Nếu cột mới chưa kịp chạy migration SQL thì cảnh báo rõ ràng cho quản trị viên
    const missingCol =
      error.code === '42703' ||
      error.code === 'PGRST204' ||
      /column .* does not exist|schema cache/i.test(error.message || '');
    if (!missingCol) {
      throw error;
    }
    console.warn('[k23Services] Bảng buildings chưa có cột bank_id/bank_account_no (cần chạy migration 052):', error.message);
  }
}

