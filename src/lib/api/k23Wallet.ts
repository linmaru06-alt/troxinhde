import { supabase, isSupabaseConfigured } from '../supabase';

export interface K23Wallet {
  id: string;
  owner_id: string;
  balance_real_xu: number;
  balance_bonus_xu: number;
  total_xu: number;
  created_at?: string;
  updated_at?: string;
}

export interface K23WalletTransaction {
  id: string;
  wallet_id?: string;
  owner_id: string;
  amount_real_xu: number;
  amount_bonus_xu: number;
  total_amount_xu: number;
  transaction_type: 'deposit' | 'spend' | 'reward' | 'refund';
  reason: string;
  reference_id?: string;
  created_at: string;
}

export interface K23ListingVerification {
  id: string;
  room_id: string;
  owner_id: string;
  owner_name?: string;
  document_urls: string[];
  id_card_url?: string;
  video_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  reward_boost_hours: number;
  verified_at?: string;
  created_at: string;
}

// In-memory fallback cho môi trường dev/demo khi chưa kết nối Supabase
const memoryWallets: Record<string, K23Wallet> = {};
const memoryTransactions: K23WalletTransaction[] = [];
const memoryVerifications: K23ListingVerification[] = [];

/**
 * Lấy thông tin ví Xu của chủ trọ
 * Tỷ giá cố định: 1 Xu = 1.000 VNĐ
 */
export async function getWallet(ownerId: string): Promise<K23Wallet> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('k23_wallets')
        .select('*')
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          owner_id: data.owner_id,
          balance_real_xu: data.balance_real_xu || 0,
          balance_bonus_xu: data.balance_bonus_xu || 0,
          total_xu: (data.balance_real_xu || 0) + (data.balance_bonus_xu || 0),
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }

      // Nếu chưa có ví trong Supabase, khởi tạo ví 0 Xu
      const { data: newWallet, error: createError } = await supabase
        .from('k23_wallets')
        .insert({
          owner_id: ownerId,
          balance_real_xu: 0,
          balance_bonus_xu: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!createError && newWallet) {
        return {
          id: newWallet.id,
          owner_id: newWallet.owner_id,
          balance_real_xu: 0,
          balance_bonus_xu: 0,
          total_xu: 0,
          created_at: newWallet.created_at,
          updated_at: newWallet.updated_at,
        };
      }
    } catch (err) {
      console.warn('[k23Wallet] Supabase query fallback:', err);
    }
  }

  // Fallback memory
  if (!memoryWallets[ownerId]) {
    memoryWallets[ownerId] = {
      id: `wallet_${ownerId}`,
      owner_id: ownerId,
      balance_real_xu: 0,
      balance_bonus_xu: 0,
      total_xu: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return memoryWallets[ownerId];
}

/**
 * Nạp xu vào ví Trọ Xinh
 * Quy tắc:
 * - 1 Xu = 1.000 VNĐ
 * - Nạp >= 500.000 VNĐ tặng thêm 10% Xu thưởng (bonus_xu)
 */
export async function depositWalletXu({
  ownerId,
  amountVnd,
  referenceCode,
  gateway = 'VietQR',
}: {
  ownerId: string;
  amountVnd: number;
  referenceCode?: string;
  gateway?: string;
}): Promise<{ success: boolean; wallet: K23Wallet; realXu: number; bonusXu: number }> {
  const realXu = Math.floor(amountVnd / 1000);
  const bonusXu = amountVnd >= 500000 ? Math.floor(realXu * 0.1) : 0;
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      const current = await getWallet(ownerId);
      const newReal = current.balance_real_xu + realXu;
      const newBonus = current.balance_bonus_xu + bonusXu;

      await supabase
        .from('k23_wallets')
        .update({
          balance_real_xu: newReal,
          balance_bonus_xu: newBonus,
          updated_at: nowIso,
        })
        .eq('id', current.id);

      await supabase.from('k23_wallet_transactions').insert({
        wallet_id: current.id,
        owner_id: ownerId,
        amount_real_xu: realXu,
        amount_bonus_xu: bonusXu,
        transaction_type: 'deposit',
        reason: `Nạp ví qua ${gateway} (+${realXu.toLocaleString('vi-VN')} Xu thật${bonusXu > 0 ? `, +${bonusXu} Xu thưởng 10%` : ''})`,
        reference_id: referenceCode,
        created_at: nowIso,
      });

      return {
        success: true,
        wallet: {
          ...current,
          balance_real_xu: newReal,
          balance_bonus_xu: newBonus,
          total_xu: newReal + newBonus,
          updated_at: nowIso,
        },
        realXu,
        bonusXu,
      };
    } catch (err) {
      console.warn('[k23Wallet] Supabase deposit fallback:', err);
    }
  }

  // Memory fallback
  const w = await getWallet(ownerId);
  w.balance_real_xu += realXu;
  w.balance_bonus_xu += bonusXu;
  w.total_xu = w.balance_real_xu + w.balance_bonus_xu;
  w.updated_at = nowIso;

  memoryTransactions.unshift({
    id: `tx_${Date.now()}`,
    wallet_id: w.id,
    owner_id: ownerId,
    amount_real_xu: realXu,
    amount_bonus_xu: bonusXu,
    total_amount_xu: realXu + bonusXu,
    transaction_type: 'deposit',
    reason: `Nạp ví qua ${gateway} (+${realXu.toLocaleString('vi-VN')} Xu${bonusXu > 0 ? `, +${bonusXu} Xu thưởng 10%` : ''})`,
    reference_id: referenceCode,
    created_at: nowIso,
  });

  return { success: true, wallet: w, realXu, bonusXu };
}

/**
 * Trừ xu từ ví Trọ Xinh theo quy tắc PDF:
 * "Xu thưởng (bonus_xu) dùng để trừ phí trước xu tiền thật (real_xu)"
 */
export async function deductWalletXu({
  ownerId,
  amountXu,
  reason,
  referenceId,
}: {
  ownerId: string;
  amountXu: number;
  reason: string;
  referenceId?: string;
}): Promise<{
  success: boolean;
  deductedBonus: number;
  deductedReal: number;
  remainingTotal: number;
  message?: string;
}> {
  const wallet = await getWallet(ownerId);

  if (wallet.total_xu < amountXu) {
    return {
      success: false,
      deductedBonus: 0,
      deductedReal: 0,
      remainingTotal: wallet.total_xu,
      message: `Số dư không đủ. Cần ${amountXu.toLocaleString('vi-VN')} Xu nhưng ví hiện có ${wallet.total_xu.toLocaleString('vi-VN')} Xu.`,
    };
  }

  // Cơ chế trừ: ưu tiên trừ Xu thưởng trước, Xu thật sau
  let deductedBonus = 0;
  let deductedReal = 0;

  if (wallet.balance_bonus_xu >= amountXu) {
    deductedBonus = amountXu;
  } else {
    deductedBonus = wallet.balance_bonus_xu;
    deductedReal = amountXu - deductedBonus;
  }

  const newBonus = wallet.balance_bonus_xu - deductedBonus;
  const newReal = wallet.balance_real_xu - deductedReal;
  const newTotal = newBonus + newReal;
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('k23_wallets')
        .update({
          balance_real_xu: newReal,
          balance_bonus_xu: newBonus,
          updated_at: nowIso,
        })
        .eq('id', wallet.id);

      await supabase.from('k23_wallet_transactions').insert({
        wallet_id: wallet.id,
        owner_id: ownerId,
        amount_real_xu: -deductedReal,
        amount_bonus_xu: -deductedBonus,
        transaction_type: 'spend',
        reason,
        reference_id: referenceId,
        created_at: nowIso,
      });

      return {
        success: true,
        deductedBonus,
        deductedReal,
        remainingTotal: newTotal,
      };
    } catch (err) {
      console.warn('[k23Wallet] Supabase deduct fallback:', err);
    }
  }

  // Memory fallback
  wallet.balance_bonus_xu = newBonus;
  wallet.balance_real_xu = newReal;
  wallet.total_xu = newTotal;
  wallet.updated_at = nowIso;

  memoryTransactions.unshift({
    id: `tx_${Date.now()}`,
    wallet_id: wallet.id,
    owner_id: ownerId,
    amount_real_xu: -deductedReal,
    amount_bonus_xu: -deductedBonus,
    total_amount_xu: -amountXu,
    transaction_type: 'spend',
    reason,
    reference_id: referenceId,
    created_at: nowIso,
  });

  return {
    success: true,
    deductedBonus,
    deductedReal,
    remainingTotal: newTotal,
  };
}

export const spendWalletXu = deductWalletXu;

/**
 * Lấy lịch sử biến động số dư ví Xu
 */
export async function getWalletTransactions(ownerId: string, limit = 50): Promise<K23WalletTransaction[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('k23_wallet_transactions')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data.map((item) => ({
          id: item.id,
          wallet_id: item.wallet_id,
          owner_id: item.owner_id,
          amount_real_xu: item.amount_real_xu || 0,
          amount_bonus_xu: item.amount_bonus_xu || 0,
          total_amount_xu: (item.amount_real_xu || 0) + (item.amount_bonus_xu || 0),
          transaction_type: item.transaction_type,
          reason: item.reason || '',
          reference_id: item.reference_id,
          created_at: item.created_at,
        }));
      }
    } catch (err) {
      console.warn('[k23Wallet] Supabase transactions fallback:', err);
    }
  }

  return memoryTransactions.filter((t) => t.owner_id === ownerId).slice(0, limit);
}

/**
 * Gửi hồ sơ Xác thực tin chính chủ Batdongsan
 * Nhận Tick Xanh + Tự động tặng 48 giờ Đẩy tin VIP
 */
export async function submitListingVerification({
  roomId,
  ownerId,
  ownerName,
  documentUrls,
  idCardUrl,
  videoUrl,
}: {
  roomId: string;
  ownerId: string;
  ownerName?: string;
  documentUrls: string[];
  idCardUrl?: string;
  videoUrl?: string;
}): Promise<K23ListingVerification> {
  const nowIso = new Date().toISOString();

  const record: K23ListingVerification = {
    id: `verif_${Date.now()}`,
    room_id: roomId,
    owner_id: ownerId,
    owner_name: ownerName,
    document_urls: documentUrls,
    id_card_url: idCardUrl,
    video_url: videoUrl,
    status: 'pending',
    reward_boost_hours: 48,
    created_at: nowIso,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('k23_listing_verifications')
        .insert({
          room_id: roomId,
          owner_id: ownerId,
          owner_name: ownerName,
          document_urls: documentUrls,
          id_card_url: idCardUrl,
          video_url: videoUrl,
          status: 'pending',
          reward_boost_hours: 48,
          created_at: nowIso,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          room_id: data.room_id,
          owner_id: data.owner_id,
          owner_name: data.owner_name,
          document_urls: data.document_urls || [],
          id_card_url: data.id_card_url,
          video_url: data.video_url,
          status: data.status,
          reward_boost_hours: data.reward_boost_hours || 48,
          verified_at: data.verified_at,
          created_at: data.created_at,
        };
      }
    } catch (err) {
      console.warn('[k23Wallet] Supabase submit verification fallback:', err);
    }
  }

  memoryVerifications.push(record);
  return record;
}

/**
 * Phê duyệt Xác thực tin chính chủ Batdongsan: Cấp Tick xanh & Tặng 48h VIP
 */
export async function approveListingVerification(
  verificationId: string,
  roomId: string
): Promise<{ success: boolean; boostHours: number }> {
  const now = new Date();
  const nowIso = now.toISOString();
  const boostUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  if (isSupabaseConfigured) {
    try {
      // 1. Cập nhật trạng thái xác thực
      await supabase
        .from('k23_listing_verifications')
        .update({
          status: 'approved',
          verified_at: nowIso,
        })
        .eq('id', verificationId);

      // 2. Cập nhật phòng: gắn Tick xanh và kích hoạt 48h VIP
      await supabase
        .from('rooms')
        .update({
          is_verified_listing: true,
          verified_at: nowIso,
          is_golden_hour_boosted: true,
          boost_expires_at: boostUntil,
          updated_at: nowIso,
        })
        .eq('id', roomId);

      return { success: true, boostHours: 48 };
    } catch (err) {
      console.warn('[k23Wallet] Supabase approve verification fallback:', err);
    }
  }

  // Memory fallback
  const v = memoryVerifications.find((item) => item.id === verificationId);
  if (v) {
    v.status = 'approved';
    v.verified_at = nowIso;
  }

  return { success: true, boostHours: 48 };
}

