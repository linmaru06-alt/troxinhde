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

export function getFallbackBuildingServices(buildingId: string): BuildingService[] {
  return DEFAULT_SERVICE_CATALOG.map((cat) => ({
    id: `bs_${buildingId}_${cat.id}`,
    building_id: buildingId,
    service_id: cat.id,
    custom_price: cat.default_price,
    is_active: true,
    owner_id: '00000000-0000-0000-0000-000000000002',
    service: cat,
  }));
}

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
  if (!buildingId) return [];
  if (!isSupabaseConfigured) return getFallbackBuildingServices(buildingId);

  try {
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

    if (error || !data || data.length === 0) {
      return getFallbackBuildingServices(buildingId);
    }
    return (data || []).map((row: any) => ({
      ...row,
      service: Array.isArray(row.service) ? row.service[0] : row.service,
    }));
  } catch {
    return getFallbackBuildingServices(buildingId);
  }
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
