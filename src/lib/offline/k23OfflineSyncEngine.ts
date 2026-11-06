// =====================================================================
// K23 PMS — PHASE 4: SIÊU HỆ SINH THÁI THÔNG MINH
// P3-05: K23 Mobile PWA & Offline Sync Engine Implementation
// =====================================================================

import { OfflineQueueItem, OfflineOperationType, CccdQrParsedData } from '../../types/k23MobileOffline';

const STORAGE_KEY = 'k23_offline_queue_v1';

/**
 * Lấy danh sách hàng đợi thao tác ngoại tuyến đang chờ gửi lên máy chủ
 */
export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Lưu danh sách hàng đợi vào LocalStorage
 */
function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('[K23 Offline] Không thể lưu hàng đợi:', err);
  }
}

/**
 * Thêm một thao tác vào hàng đợi ngoại tuyến khi đang mất sóng (ví dụ dưới tầng hầm)
 */
export function enqueueOfflineAction(
  operationType: OfflineOperationType,
  entityId: string,
  payload: Record<string, any>
): OfflineQueueItem {
  const item: OfflineQueueItem = {
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    operationType,
    entityId,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  };

  const queue = getOfflineQueue();
  queue.push(item);
  saveOfflineQueue(queue);

  console.log(`[K23 Offline] Đã lưu vào bộ nhớ đệm: ${operationType} cho ${entityId}`);
  return item;
}

/**
 * Đồng bộ toàn bộ hàng đợi ngoại tuyến lên máy chủ khi có mạng trở lại
 */
export async function flushOfflineQueue(
  syncExecutor?: (item: OfflineQueueItem) => Promise<boolean>
): Promise<{ successCount: number; failureCount: number; remainingCount: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { successCount: 0, failureCount: 0, remainingCount: 0 };
  }

  let successCount = 0;
  let failureCount = 0;
  const remaining: OfflineQueueItem[] = [];

  for (const item of queue) {
    try {
      let isSuccess = true;
      if (syncExecutor) {
        isSuccess = await syncExecutor(item);
      } else {
        // Giả lập đồng bộ nền lên Supabase Cloud
        await new Promise((r) => setTimeout(r, 200));
        isSuccess = true;
      }

      if (isSuccess) {
        successCount++;
      } else {
        item.retryCount++;
        item.status = 'failed';
        remaining.push(item);
        failureCount++;
      }
    } catch (err: any) {
      item.retryCount++;
      item.status = 'failed';
      item.errorMessage = err?.message || 'Lỗi mạng khi đồng bộ';
      remaining.push(item);
      failureCount++;
    }
  }

  saveOfflineQueue(remaining);
  return { successCount, failureCount, remainingCount: remaining.length };
}

/**
 * Xóa sạch hàng đợi
 */
export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Phát âm thanh thông báo tổng hợp "Ting! Đã nhận tiền phòng" bằng Web Audio API
 * Không cần tải file MP3 từ mạng, hoạt động 100% offline và không bị chặn CORS.
 */
export function playPaymentReceivedChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Âm 1: Nốt C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Âm 2: Nốt G5 (783.99 Hz) ngân vang hơn
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(783.99, now + 0.08);
    gain2.gain.setValueAtTime(0.3, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.9);
  } catch (e) {
    console.warn('[K23 Audio] Trình duyệt không hỗ trợ Web Audio:', e);
  }
}

/**
 * Giải mã chuỗi QR Code thẻ Căn cước công dân gắn chip (Bộ Công An)
 * Cấu trúc chuỗi QR chuẩn: CCCD|CMND_CŨ|HỌ_TÊN|NGÀY_SINH|GIỚI_TÍNH|ĐỊA_CHỈ|NGÀY_CẤP
 * Ví dụ: 001202018899|013665899|NGUYỄN VĂN AN|15082002|Nam|Số 12 Ngõ 68 Triều Khúc, Thanh Xuân, Hà Nội|10022021
 */
export function parseCccdQrString(qrRawString: string): CccdQrParsedData | null {
  if (!qrRawString || typeof qrRawString !== 'string') return null;

  const parts = qrRawString.split('|');
  if (parts.length < 5) {
    // Thử tách theo định dạng cách nhau dấu gạch chéo hoặc tab
    return null;
  }

  const cccdNumber = parts[0]?.trim();
  const oldCmndNumber = parts[1]?.trim() || undefined;
  const fullName = parts[2]?.trim();
  const rawDob = parts[3]?.trim();
  const genderRaw = parts[4]?.trim().toLowerCase();
  const permanentAddress = parts[5]?.trim() || '';
  const rawIssueDate = parts[6]?.trim() || undefined;

  // Format ngày sinh DD/MM/YYYY
  let dateOfBirth = rawDob;
  if (rawDob && rawDob.length === 8 && !rawDob.includes('/')) {
    dateOfBirth = `${rawDob.substring(0, 2)}/${rawDob.substring(2, 4)}/${rawDob.substring(4, 8)}`;
  }

  let issueDate = rawIssueDate;
  if (rawIssueDate && rawIssueDate.length === 8 && !rawIssueDate.includes('/')) {
    issueDate = `${rawIssueDate.substring(0, 2)}/${rawIssueDate.substring(2, 4)}/${rawIssueDate.substring(4, 8)}`;
  }

  const gender: 'Nam' | 'Nữ' = genderRaw === 'nam' ? 'Nam' : 'Nữ';

  return {
    cccdNumber,
    oldCmndNumber,
    fullName,
    dateOfBirth,
    gender,
    permanentAddress,
    issueDate,
  };
}
