import { supabase, isSupabaseConfigured } from '../supabase';
import { resolveUserIdToUuid } from './messages';

export interface BlockedUserRecord {
  id: string;
  blocked_id: string;
  created_at: string;
  reason?: string;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
    phone?: string;
    role?: string;
  };
}

export interface HiddenItemRecord {
  id: string;
  item_id: string;
  created_at: string;
  item?: {
    id: string;
    title: string;
    price: number;
    images?: string[];
    category?: string;
    district?: string;
    condition?: string;
    status?: string;
    seller_name?: string;
  };
}

/**
 * Chặn một người dùng (người bán hoặc liên hệ)
 */
export async function blockUser(
  blockedId: string,
  reason: string = 'Người dùng báo cáo hoặc chủ động chặn'
): Promise<{ success: boolean; error?: string }> {
  if (!blockedId) {
    return { success: false, error: 'Thiếu mã người dùng cần chặn.' };
  }

  const cleanBlockedId = await resolveUserIdToUuid(blockedId);
  if (!cleanBlockedId) {
    return { success: false, error: 'Mã người dùng không hợp lệ.' };
  }

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data: myProfileId } = await supabase.rpc('current_profile_id');
    if (!myProfileId) {
      return { success: false, error: 'Vui lòng đăng nhập để thực hiện chặn liên hệ.' };
    }

    if (myProfileId === cleanBlockedId) {
      return { success: false, error: 'Không thể tự chặn chính mình.' };
    }

    const { error } = await supabase
      .from('user_blocks')
      .upsert(
        {
          blocker_id: myProfileId,
          blocked_id: cleanBlockedId,
          reason,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'blocker_id,blocked_id' }
      );

    if (error) {
      // Bỏ qua nếu đã tồn tại bản ghi (tránh báo lỗi trùng)
      if (error.code === '23505') {
        return { success: true };
      }
      throw error;
    }

    return { success: true };
  } catch (err: any) {
    console.error('[blockUser] Lỗi chặn người dùng:', err);
    return { success: false, error: err?.message || 'Không thể chặn người dùng lúc này.' };
  }
}

/**
 * Bỏ chặn một người dùng
 */
export async function unblockUser(blockedId: string): Promise<{ success: boolean; error?: string }> {
  if (!blockedId) {
    return { success: false, error: 'Thiếu mã người dùng cần bỏ chặn.' };
  }

  const cleanBlockedId = await resolveUserIdToUuid(blockedId);
  if (!cleanBlockedId) {
    return { success: false, error: 'Mã người dùng không hợp lệ.' };
  }

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data: myProfileId } = await supabase.rpc('current_profile_id');
    if (!myProfileId) {
      return { success: false, error: 'Vui lòng đăng nhập để thực hiện thao tác.' };
    }

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', myProfileId)
      .eq('blocked_id', cleanBlockedId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[unblockUser] Lỗi bỏ chặn:', err);
    return { success: false, error: err?.message || 'Không thể bỏ chặn người dùng lúc này.' };
  }
}

/**
 * Tải danh sách người dùng mà tài khoản này đã chặn
 * (Tuân thủ quyền riêng tư: chỉ người chặn mới lấy được danh sách mình đã chặn)
 */
export async function fetchBlockedUsers(userId: string): Promise<BlockedUserRecord[]> {
  if (!isSupabaseConfigured || !userId) return [];

  try {
    const cleanUserId = await resolveUserIdToUuid(userId);
    if (!cleanUserId) return [];

    const { data, error } = await supabase
      .from('user_blocks')
      .select(`
        id,
        blocked_id,
        created_at,
        reason,
        profiles:blocked_id (
          id,
          name,
          avatar_url,
          phone,
          role
        )
      `)
      .eq('blocker_id', cleanUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      blocked_id: row.blocked_id,
      created_at: row.created_at,
      reason: row.reason,
      user: row.profiles
        ? {
            id: row.profiles.id,
            name: row.profiles.name || 'Người dùng Trọ Xinh',
            avatarUrl: row.profiles.avatar_url,
            phone: row.profiles.phone,
            role: row.profiles.role,
          }
        : undefined,
    }));
  } catch (err) {
    console.warn('[fetchBlockedUsers] Lỗi tải danh sách người bị chặn:', err);
    return [];
  }
}

/**
 * Gọi RPC can_message(p_other_id) kiểm tra quyền nhắn tin 2 chiều.
 * Người bị chặn không thấy được danh sách chặn, chỉ nhận boolean canMessage.
 */
export async function canMessage(otherId: string): Promise<boolean> {
  if (!otherId || !isSupabaseConfigured) return true;

  try {
    const cleanOtherId = await resolveUserIdToUuid(otherId);
    if (!cleanOtherId) return true;

    const { data, error } = await supabase.rpc('can_message', {
      p_other_id: cleanOtherId,
    });

    if (error) {
      console.warn('[canMessage] RPC can_message gặp lỗi, kiểm tra an toàn:', error);
      return true;
    }

    return Boolean(data);
  } catch (err) {
    console.warn('[canMessage] Exception khi kiểm tra can_message:', err);
    return true;
  }
}

/**
 * Ẩn một tin đăng chợ đồ cũ khỏi danh sách cá nhân
 */
export async function hideMarketplaceItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  if (!itemId) {
    return { success: false, error: 'Thiếu mã tin đăng cần ẩn.' };
  }

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data: myProfileId } = await supabase.rpc('current_profile_id');
    if (!myProfileId) {
      return { success: false, error: 'Vui lòng đăng nhập để ẩn tin này.' };
    }

    const { error } = await supabase
      .from('user_hidden_items')
      .upsert(
        {
          user_id: myProfileId,
          item_id: itemId,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,item_id' }
      );

    if (error) {
      if (error.code === '23505') {
        return { success: true };
      }
      throw error;
    }

    return { success: true };
  } catch (err: any) {
    console.error('[hideMarketplaceItem] Lỗi ẩn tin:', err);
    return { success: false, error: err?.message || 'Không thể ẩn tin này lúc này.' };
  }
}

/**
 * Bỏ ẩn tin đăng chợ đồ cũ
 */
export async function unhideMarketplaceItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  if (!itemId) {
    return { success: false, error: 'Thiếu mã tin đăng cần bỏ ẩn.' };
  }

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data: myProfileId } = await supabase.rpc('current_profile_id');
    if (!myProfileId) {
      return { success: false, error: 'Vui lòng đăng nhập để thao tác.' };
    }

    const { error } = await supabase
      .from('user_hidden_items')
      .delete()
      .eq('user_id', myProfileId)
      .eq('item_id', itemId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[unhideMarketplaceItem] Lỗi bỏ ẩn tin:', err);
    return { success: false, error: err?.message || 'Không thể bỏ ẩn tin lúc này.' };
  }
}

/**
 * Lấy danh sách ID các tin đăng chợ đồ cũ mà người dùng này đã ẩn
 */
export async function fetchHiddenItemIds(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured || !userId) return [];

  try {
    const cleanUserId = await resolveUserIdToUuid(userId);
    if (!cleanUserId) return [];

    const { data, error } = await supabase
      .from('user_hidden_items')
      .select('item_id')
      .eq('user_id', cleanUserId);

    if (error) throw error;
    return (data || []).map((row: any) => row.item_id).filter(Boolean);
  } catch (err) {
    console.warn('[fetchHiddenItemIds] Lỗi tải ID tin đã ẩn:', err);
    return [];
  }
}

/**
 * Lấy danh sách chi tiết các tin đã ẩn (phục vụ mục Quản lý trong trang cá nhân)
 * Lưu ý: Nhờ ON DELETE CASCADE, nếu tin bị xóa thì dòng ẩn tự mất, dữ liệu luôn khớp thực tế.
 */
export async function fetchHiddenItems(userId: string): Promise<HiddenItemRecord[]> {
  if (!isSupabaseConfigured || !userId) return [];

  try {
    const cleanUserId = await resolveUserIdToUuid(userId);
    if (!cleanUserId) return [];

    const { data, error } = await supabase
      .from('user_hidden_items')
      .select(`
        id,
        item_id,
        created_at,
        marketplace_items:item_id (
          id,
          title,
          price,
          images,
          image_urls,
          category,
          district,
          condition,
          status,
          seller_name
        )
      `)
      .eq('user_id', cleanUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || [])
      .filter((row: any) => row.marketplace_items) // Chỉ lấy các tin còn tồn tại trong DB
      .map((row: any) => {
        const item = row.marketplace_items;
        const images = item.images || item.image_urls || [];
        return {
          id: row.id,
          item_id: row.item_id,
          created_at: row.created_at,
          item: {
            id: item.id,
            title: item.title || 'Món đồ thanh lý',
            price: Number(item.price) || 0,
            images: Array.isArray(images) ? images : [],
            category: item.category,
            district: item.district,
            condition: item.condition,
            status: item.status,
            seller_name: item.seller_name,
          },
        };
      });
  } catch (err) {
    console.warn('[fetchHiddenItems] Lỗi tải danh sách tin đã ẩn:', err);
    return [];
  }
}
