import { supabase, isSupabaseConfigured } from '../supabase';
import { MeterReading } from '../../types/k23';

export async function getMeterReadings(params: {
  buildingId?: string;
  roomId?: string;
  month: number;
  year: number;
}): Promise<MeterReading[]> {
  if (!isSupabaseConfigured) return [];

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
  if (error) {
    console.warn('[k23MeterReadings] getMeterReadings error:', error);
    return [];
  }

  // Filter by buildingId if provided (through room.building_id)
  if (params.buildingId && data) {
    return data.filter((item) => item.room?.building_id === params.buildingId);
  }

  return data || [];
}

export async function getPreviousMeterReadings(params: {
  buildingId?: string;
  month: number;
  year: number;
}): Promise<MeterReading[]> {
  if (!isSupabaseConfigured) return [];

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
  if (!isSupabaseConfigured) return null;

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
        photo_url: reading.photo_url || null,
        read_at: new Date().toISOString(),
      },
      { onConflict: 'room_id,building_service_id,billing_month,billing_year' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
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
  if (!isSupabaseConfigured || readings.length === 0) return;

  const formatted = readings.map((r) => ({
    room_id: r.room_id,
    owner_id: r.owner_id,
    building_service_id: r.building_service_id,
    billing_month: r.billing_month,
    billing_year: r.billing_year,
    previous_reading: r.previous_reading,
    current_reading: r.current_reading,
    photo_url: r.photo_url || null,
    read_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('meter_readings')
    .upsert(formatted, {
      onConflict: 'room_id,building_service_id,billing_month,billing_year',
    });

  if (error) throw error;
}

