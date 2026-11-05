import { supabase, isSupabaseConfigured } from '../supabase';
import { MeterReading } from '../../types/k23';
import { DEFAULT_SERVICE_CATALOG } from './k23Services';

// Mock readings cho demo tài khoản chủ trọ
function getFallbackReadings(params: {
  buildingId?: string;
  roomId?: string;
  month: number;
  year: number;
}): MeterReading[] {
  const rooms = [
    { id: 'room_1', number: 'P.302', elec: 1450, water: 42 },
    { id: 'room_2', number: 'P.303', elec: 1120, water: 28 },
    { id: 'room_3', number: 'P.304', elec: 980, water: 35 },
    { id: 'room_4', number: 'P.401', elec: 1640, water: 51 },
    { id: 'room_5', number: 'P.402', elec: 1310, water: 39 },
  ];

  const elecCat = DEFAULT_SERVICE_CATALOG[0];
  const waterCat = DEFAULT_SERVICE_CATALOG[1];

  const result: MeterReading[] = [];

  for (const r of rooms) {
    if (params.roomId && params.roomId !== r.id) continue;

    // Số điện
    result.push({
      id: `mr_elec_${r.id}_${params.month}_${params.year}`,
      room_id: r.id,
      owner_id: '00000000-0000-0000-0000-000000000002',
      building_service_id: `bs_${params.buildingId || 'bld_1'}_srv_elec`,
      billing_month: params.month,
      billing_year: params.year,
      previous_reading: r.elec - 65,
      current_reading: r.elec,
      usage: 65,
      room: {
        id: r.id,
        room_number: r.number,
        title: `Phòng ${r.number}`,
      },
      building_service: {
        id: `bs_${params.buildingId || 'bld_1'}_srv_elec`,
        building_id: params.buildingId || 'bld_1',
        service_id: 'srv_elec',
        custom_price: 3500,
        is_active: true,
        owner_id: '00000000-0000-0000-0000-000000000002',
        service: elecCat,
      },
    });

    // Số nước
    result.push({
      id: `mr_water_${r.id}_${params.month}_${params.year}`,
      room_id: r.id,
      owner_id: '00000000-0000-0000-0000-000000000002',
      building_service_id: `bs_${params.buildingId || 'bld_1'}_srv_water`,
      billing_month: params.month,
      billing_year: params.year,
      previous_reading: Math.max(0, r.water - 5),
      current_reading: r.water,
      usage: 5,
      room: {
        id: r.id,
        room_number: r.number,
        title: `Phòng ${r.number}`,
      },
      building_service: {
        id: `bs_${params.buildingId || 'bld_1'}_srv_water`,
        building_id: params.buildingId || 'bld_1',
        service_id: 'srv_water',
        custom_price: 25000,
        is_active: true,
        owner_id: '00000000-0000-0000-0000-000000000002',
        service: waterCat,
      },
    });
  }

  return result;
}

export async function getMeterReadings(params: {
  buildingId?: string;
  roomId?: string;
  month: number;
  year: number;
}): Promise<MeterReading[]> {
  if (!isSupabaseConfigured) {
    return getFallbackReadings(params);
  }

  try {
    let query = supabase
      .from('meter_readings')
      .select(`
        *,
        room:rooms(id, room_number, title, building_id),
        building_service:building_services(*, service:service_catalog(*))
      `)
      .eq('billing_month', params.month)
      .eq('billing_year', params.year);

    if (params.roomId) {
      query = query.eq('room_id', params.roomId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return getFallbackReadings(params);
    }

    if (params.buildingId && data) {
      const filtered = data.filter((item) => item.room?.building_id === params.buildingId);
      return filtered.length > 0 ? filtered : getFallbackReadings(params);
    }

    return data || [];
  } catch {
    return getFallbackReadings(params);
  }
}

export async function getPreviousMeterReadings(params: {
  buildingId?: string;
  month: number;
  year: number;
}): Promise<MeterReading[]> {
  // Calculate previous month & year
  let prevMonth = params.month - 1;
  let prevYear = params.year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  return getMeterReadings({
    buildingId: params.buildingId,
    month: prevMonth,
    year: prevYear,
  });
}

export async function saveMeterReading(reading: {
  room_id: string;
  owner_id: string;
  building_service_id: string;
  billing_month: number;
  billing_year: number;
  previous_reading: number;
  current_reading: number;
  photo_url?: string;
}): Promise<MeterReading | null> {
  if (!isSupabaseConfigured) {
    return {
      id: `mr_mock_${Date.now()}`,
      ...reading,
      usage: reading.current_reading - reading.previous_reading,
    };
  }

  try {
    const { data, error } = await supabase
      .from('meter_readings')
      .upsert(
        {
          room_id: reading.room_id,
          owner_id: reading.owner_id,
          building_service_id: reading.building_service_id,
          billing_month: reading.billing_month,
          billing_year: reading.billing_year,
          previous_reading: reading.previous_reading,
          current_reading: reading.current_reading,
          photo_url: reading.photo_url,
          read_at: new Date().toISOString(),
        },
        { onConflict: 'room_id,building_service_id,billing_month,billing_year' }
      )
      .select()
      .single();

    if (error) {
      console.warn('[k23MeterReadings] saveMeterReading error:', error);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function batchSaveMeterReadings(
  readings: Array<{
    room_id: string;
    owner_id: string;
    building_service_id: string;
    billing_month: number;
    billing_year: number;
    previous_reading: number;
    current_reading: number;
    photo_url?: string;
  }>
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const rows = readings.map((r) => ({
    room_id: r.room_id,
    owner_id: r.owner_id,
    building_service_id: r.building_service_id,
    billing_month: r.billing_month,
    billing_year: r.billing_year,
    previous_reading: r.previous_reading,
    current_reading: r.current_reading,
    photo_url: r.photo_url,
    read_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('meter_readings')
    .upsert(rows, { onConflict: 'room_id,building_service_id,billing_month,billing_year' });

  if (error) throw error;
}
