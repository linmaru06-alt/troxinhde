import { supabase, isSupabaseConfigured } from '../supabase';
import { MarketplaceItem } from '../../types';
import {
  mapMarketplaceRow,
  toMarketplaceDbFields,
  MarketplaceItemInput,
  MarketplaceSellerStatus,
} from '../marketplaceStatus';

const ITEM_SELECT = '*, profiles:seller_id(id, full_name, avatar_url, phone)';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isMarketplaceItemId(id?: string | null): id is string {
  return Boolean(id && UUID_RE.test(id));
}

/**
 * Chuẩn hóa lỗi Supabase thành thông báo tiếng Việt hiển thị được trên giao diện.
 */
function toMarketplaceError(error: any, fallback: string): Error {
  const message: string = error?.message || '';
  if (error?.code === 'PGRST202' || /could not find the function/i.test(message)) {
    return new Error('Máy chủ chưa hỗ trợ chức năng quản lý tin (thiếu migration 025). Vui lòng báo quản trị viên.');
  }
  if (error?.code === '42501' && /row-level security/i.test(message)) {
    return new Error('Bạn không có quyền thực hiện thao tác này với tin đăng.');
  }
  return new Error(message || fallback);
}

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Chưa cấu hình kết nối máy chủ dữ liệu (Supabase).');
  }
}

export async function getMarketplaceItems(category?: string, district?: string) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('marketplace_items')
    .select(`
      id,
      title,
      price,
      is_free,
      condition,
      category,
      district,
      image_urls,
      status,
      created_at,
      seller_name,
      seller_avatar,
      seller_phone,
      show_phone
    `)
    .eq('status', 'available');

  if (category && category !== 'Tất cả') {
    query = query.eq('category', category);
  }
  if (district && district !== 'Tất cả quận') {
    query = query.eq('district', district);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map((item: any) => ({
    ...item,
    seller: {
      full_name: item.seller_name || 'Sinh viên Trọ Xinh',
      avatar_url: item.seller_avatar || '/images/user-avatar.jpg',
      phone: item.seller_phone || '',
    },
  }));
}

/**
 * Tải toàn bộ tin mà người xem được phép thấy (RLS quyết định: khách thấy tin đã duyệt,
 * người bán thấy thêm tin của mình, admin thấy tất cả).
 */
export async function fetchMarketplaceItems(): Promise<MarketplaceItem[]> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('marketplace_items')
    .select(ITEM_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw toMarketplaceError(error, 'Không thể tải danh sách chợ đồ cũ');
  return (data || []).map(mapMarketplaceRow).filter((item): item is MarketplaceItem => item !== null);
}

/**
 * Lấy một tin theo id. Trả về null nếu tin không tồn tại, đã xóa hoặc người xem không có quyền xem.
 */
export async function getMarketplaceItemById(id: string): Promise<MarketplaceItem | null> {
  if (!isSupabaseConfigured || !isMarketplaceItemId(id)) return null;

  const { data, error } = await supabase
    .from('marketplace_items')
    .select(ITEM_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw toMarketplaceError(error, 'Không thể tải thông tin món đồ');
  return mapMarketplaceRow(data);
}

/**
 * Đăng tin mới. Máy chủ luôn đưa tin vào trạng thái chờ duyệt.
 */
export async function createMarketplaceItem(sellerId: string, input: MarketplaceItemInput): Promise<MarketplaceItem> {
  ensureConfigured();
  if (!isMarketplaceItemId(sellerId)) {
    throw new Error('Tài khoản chưa được đồng bộ hồ sơ. Vui lòng đăng xuất và đăng nhập lại trước khi đăng tin.');
  }

  const { data, error } = await supabase
    .from('marketplace_items')
    .insert({ ...toMarketplaceDbFields(input), seller_id: sellerId })
    .select(ITEM_SELECT)
    .single();

  if (error) throw toMarketplaceError(error, 'Không thể đăng tin lúc này');
  const item = mapMarketplaceRow(data);
  if (!item) throw new Error('Máy chủ không trả về tin vừa đăng');
  return item;
}

async function reloadAfterRpc(id: string, row: any, fallback: string): Promise<MarketplaceItem> {
  const fresh = await getMarketplaceItemById(id);
  const item = fresh || mapMarketplaceRow(row);
  if (!item) throw new Error(fallback);
  return item;
}

/**
 * Sửa nội dung tin. Người bán sửa thì tin chuyển về chờ duyệt lại.
 */
export async function updateMarketplaceItemContent(id: string, input: MarketplaceItemInput): Promise<MarketplaceItem> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('marketplace_update_item', {
    p_item_id: id,
    p_changes: toMarketplaceDbFields(input),
  });
  if (error) throw toMarketplaceError(error, 'Không thể lưu thay đổi tin đăng');
  return reloadAfterRpc(id, data, 'Không thể tải lại tin sau khi cập nhật');
}

/**
 * Đánh dấu đã bán, đóng tin hoặc mở lại tin (available).
 */
export async function setMarketplaceItemStatus(id: string, status: MarketplaceSellerStatus): Promise<MarketplaceItem> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('marketplace_set_item_status', {
    p_item_id: id,
    p_status: status,
  });
  if (error) throw toMarketplaceError(error, 'Không thể cập nhật trạng thái tin đăng');
  return reloadAfterRpc(id, data, 'Không thể tải lại tin sau khi cập nhật trạng thái');
}

/**
 * Xóa mềm tin đăng (giữ hội thoại, tin nhắn và báo cáo liên quan).
 */
export async function deleteMarketplaceItem(id: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('marketplace_delete_item', { p_item_id: id });
  if (error) throw toMarketplaceError(error, 'Không thể xóa tin đăng');
}
