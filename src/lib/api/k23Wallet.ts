import { supabase, isSupabaseConfigured, getFirebaseIdToken } from '../supabase';

export type WalletTopupMethod = 'vietqr' | 'momo';

export interface WalletTopupPack {
  vnd: number;
  realXu: number;
  bonusXu: number;
  totalXu: number;
  bonusPercent: number;
  label: string;
  badge?: string;
  popular?: boolean;
}

export const WALLET_TOPUP_PACKS: WalletTopupPack[] = [
  { vnd: 50000, realXu: 50, bonusXu: 0, totalXu: 50, bonusPercent: 0, label: 'Gói Trải Nghiệm' },
  { vnd: 100000, realXu: 100, bonusXu: 0, totalXu: 100, bonusPercent: 0, label: 'Gói Tiêu Chuẩn' },
  { vnd: 200000, realXu: 200, bonusXu: 0, totalXu: 200, bonusPercent: 0, label: 'Gói Cơ Bản' },
  {
    vnd: 500000,
    realXu: 500,
    bonusXu: 50,
    totalXu: 550,
    bonusPercent: 10,
    label: 'Gói Tiết Kiệm',
    badge: 'Tặng 10% • Phổ biến nhất',
    popular: true,
  },
  {
    vnd: 1000000,
    realXu: 1000,
    bonusXu: 100,
    totalXu: 1100,
    bonusPercent: 10,
    label: 'Gói Đối Tác',
    badge: 'Tặng 10%',
  },
  {
    vnd: 2000000,
    realXu: 2000,
    bonusXu: 250,
    totalXu: 2250,
    bonusPercent: 12.5,
    label: 'Gói Siêu Ưu Đãi',
    badge: 'Tặng 12,5%',
  },
];

export interface WalletTopupOrder {
  id: string;
  orderCode: string;
  amountVnd: number;
  realXu: number;
  bonusXu: number;
  totalXu: number;
  bonusPercent: number;
  method: WalletTopupMethod;
  status: 'pending' | 'paid' | 'success' | 'expired' | 'failed';
  expiresAt: string;
  isSandbox: boolean;
  qrCode: string;
  deeplink?: string;
  transferContent: string;
  receiverInfo: {
    bankName: string;
    accountNumber: string;
    accountNumberLabel: string;
    accountName: string;
  };
}

export interface WalletTopupStatusResponse {
  success: boolean;
  orderCode: string;
  status: 'pending' | 'paid' | 'success' | 'expired' | 'failed';
  amount: number;
  paymentMethod: WalletTopupMethod;
  paidAt?: string | null;
  expiresAt?: string | null;
  metadata?: {
    real_xu?: number;
    bonus_xu?: number;
    total_xu?: number;
    is_sandbox?: boolean;
  };
  order?: WalletTopupOrder | null;
  wallet?: K23Wallet | null;
}

export function calculateTopupXuPreview(amountVnd: number): {
  realXu: number;
  bonusXu: number;
  totalXu: number;
  bonusPercent: number;
} {
  const safeVnd = Math.max(0, Math.floor(amountVnd / 1000) * 1000);
  const realXu = Math.floor(safeVnd / 1000);
  let bonusPercent = 0;
  if (safeVnd >= 2000000) {
    bonusPercent = 12.5;
  } else if (safeVnd >= 500000) {
    bonusPercent = 10;
  }
  const bonusXu = Math.floor((realXu * bonusPercent) / 100);
  return {
    realXu,
    bonusXu,
    totalXu: realXu + bonusXu,
    bonusPercent,
  };
}

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

      // Chưa có ví trong Supabase (ví được tạo tự động ở server khi nạp lần đầu)
      if (!error && !data) {
        return {
          id: `wallet_pending_${ownerId}`,
          owner_id: ownerId,
          balance_real_xu: 0,
          balance_bonus_xu: 0,
          total_xu: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
 * Tạo đơn nạp Xu ở Server (Vercel Serverless + Firebase JWT + Supabase pending order)
 * Tỷ giá cố định: 1 Xu = 1.000 VNĐ
 */
export async function createWalletTopupOrder({
  amountVnd,
  method,
}: {
  amountVnd: number;
  method: WalletTopupMethod;
}): Promise<WalletTopupOrder> {
  const idToken = await getFirebaseIdToken();
  if (!idToken) {
    throw new Error('Phiên đăng nhập chưa sẵn sàng. Vui lòng đăng nhập lại để tạo đơn nạp Xu.');
  }

  const response = await fetch('/api/wallet/create-topup-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ amountVnd, method }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success || !payload?.order) {
    throw new Error(payload?.error || 'Không thể khởi tạo đơn nạp Xu. Vui lòng thử lại.');
  }

  return payload.order as WalletTopupOrder;
}

/**
 * Tra cứu trạng thái đơn nạp Xu từ Server Database (Read-only, không tự duyệt paid)
 */
export async function getWalletTopupStatus(orderCode: string): Promise<WalletTopupStatusResponse> {
  const idToken = await getFirebaseIdToken();
  if (!idToken) {
    throw new Error('Phiên đăng nhập Firebase đã hết hạn.');
  }

  const response = await fetch(
    `/api/wallet/topup-status?orderCode=${encodeURIComponent(orderCode)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Không thể kiểm tra trạng thái giao dịch.');
  }

  return payload as WalletTopupStatusResponse;
}

/**
 * Xác nhận đơn nạp thử nghiệm dành RIÊNG cho tài khoản Demo Sandbox
 */
export async function confirmDemoWalletTopup(orderCode: string): Promise<{
  success: boolean;
  sandbox: boolean;
  result?: any;
}> {
  const idToken = await getFirebaseIdToken();
  if (!idToken) {
    throw new Error('Phiên đăng nhập Demo chưa sẵn sàng.');
  }

  const response = await fetch('/api/wallet/demo-topup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ orderCode }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Không thể hoàn tất giao dịch Demo Sandbox.');
  }

  return payload;
}

/**
 * @deprecated Không dùng để cộng Xu thật ở client trong production.
 * Chỉ giữ tương thích cho mô phỏng memory cục bộ khi chưa cấu hình backend.
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
  const { realXu, bonusXu } = calculateTopupXuPreview(amountVnd);
  const nowIso = new Date().toISOString();

  // Memory fallback (chỉ dùng nội bộ demo/test, không tự ghi số dư thật lên Supabase)
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
    reason: `Nạp ví qua ${gateway} (+${realXu.toLocaleString('vi-VN')} Xu${bonusXu > 0 ? `, +${bonusXu} Xu thưởng` : ''})`,
    reference_id: referenceCode,
    created_at: nowIso,
  });

  return { success: true, wallet: w, realXu, bonusXu };
}

/**
 * Trừ xu từ ví Trọ Xinh theo quy tắc:
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
  if (isSupabaseConfigured) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('spend_wallet_xu', {
        p_amount_xu: amountXu,
        p_reason: reason,
        p_reference_id: referenceId || null,
      });

      if (!rpcError && rpcData) {
        if (rpcData.success) {
          return {
            success: true,
            deductedBonus: Number(rpcData.deducted_bonus || 0),
            deductedReal: Number(rpcData.deducted_real || 0),
            remainingTotal: Number(rpcData.remaining_total || 0),
          };
        }
        if (rpcData.error === 'INSUFFICIENT_BALANCE' || rpcData.error === 'WALLET_NOT_FOUND') {
          return {
            success: false,
            deductedBonus: 0,
            deductedReal: 0,
            remainingTotal: Number(rpcData.remaining_total || 0),
            message: `Số dư không đủ. Cần ${amountXu.toLocaleString('vi-VN')} Xu nhưng ví hiện có ${Number(rpcData.remaining_total || 0).toLocaleString('vi-VN')} Xu.`,
          };
        }
      }
    } catch (err) {
      console.warn('[k23Wallet] Supabase RPC spend_wallet_xu fallback:', err);
    }
  }

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

  const deductedBonus = Math.min(wallet.balance_bonus_xu, amountXu);
  const deductedReal = amountXu - deductedBonus;
  const newBonus = wallet.balance_bonus_xu - deductedBonus;
  const newReal = wallet.balance_real_xu - deductedReal;
  const newTotal = newBonus + newReal;
  const nowIso = new Date().toISOString();

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

