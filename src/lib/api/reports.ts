import { supabase, isSupabaseConfigured } from '../supabase';

export interface CreateReportPayload {
  reporter_id?: string;
  target_type: string;
  target_id: string;
  reason: string;
  description?: string;
  reporter_name?: string;
  reporter_phone?: string;
}

export async function createReport(payload: CreateReportPayload) {
  if (!isSupabaseConfigured) {
    return {
      id: `rep_${Date.now()}`,
      ...payload,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
  }

  // Đảm bảo reporter_id phải là UUID hợp lệ nếu có, nếu không thì null
  const validReporterId =
    payload.reporter_id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.reporter_id)
      ? payload.reporter_id
      : null;

  let finalDescription = payload.description || '';
  if (payload.reporter_phone) {
    finalDescription = finalDescription
      ? `${finalDescription} (SĐT người báo: ${payload.reporter_phone})`
      : `SĐT người báo: ${payload.reporter_phone}`;
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: validReporterId,
      target_type: payload.target_type,
      target_id: payload.target_id,
      reason: payload.reason,
      description: finalDescription || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('[Reports API] Lỗi createReport:', error);
    throw error;
  }

  return data;
}
