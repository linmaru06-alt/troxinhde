import { supabase, isSupabaseConfigured } from '../supabase';
import { isSameUserId, resolveDemoAlias } from '../demoAliases';
import {
  ReportTargetType,
  ReportReasonCode,
  ReportStatusCode,
  REPORT_TARGET_LABELS,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  ReportRecord,
  GroupedReportItem,
} from '../../types/report';

export {
  REPORT_TARGET_LABELS,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
};
export type {
  ReportTargetType,
  ReportReasonCode,
  ReportStatusCode,
  ReportRecord,
  GroupedReportItem,
};

// Hằng số quy tắc nghiệp vụ
export const MAX_REPORTS_PER_DAY = 10;
export const MAX_REPORT_DESCRIPTION_LENGTH = 500;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * HẰNG SỐ CẤU HÌNH NGƯỠNG TỰ ĐỘNG KIỂM DUYỆT (AUTO-MODERATION THRESHOLD)
 * 
 * QUAN TRỌNG VỀ KIẾN TRÚC & NGUỒN QUYẾT ĐỊNH (SINGLE SOURCE OF TRUTH):
 * 1. Trigger PostgreSQL (public.handle_auto_moderation_on_reports trong migration 023)
 *    là NGUỒN QUYẾT ĐỊNH THỰC SỰ (Single Source of Truth) tại tầng cơ sở dữ liệu production.
 * 2. Hằng số AUTO_MODERATION_REPORT_THRESHOLD phía client chỉ phục vụ hiển thị giao diện,
 *    phản hồi tức thì (optimistic UI) và chạy bộ kiểm thử offline.
 * 3. BẮT BUỘC PHẢI ĐỔI ĐỒNG THỜI hằng số này cùng với biến c_auto_moderation_threshold
 *    trong file migration 023_auto_moderation_reported_items.sql khi thay đổi ngưỡng nghiệp vụ.
 */
export const AUTO_MODERATION_REPORT_THRESHOLD = 3;

// Bảng thông báo lỗi chuẩn xác tiếng Việt
export const REPORT_ERROR_MESSAGES = {
  MISSING_REPORTER: 'Thiếu thông tin người gửi báo cáo',
  MISSING_TARGET: 'Thiếu thông tin đối tượng báo cáo',
  INVALID_TARGET_TYPE: 'Đối tượng báo cáo không hợp lệ (chỉ chấp nhận: tin_dang, nguoi_dung, tin_nhan)',
  INVALID_REASON: 'Lý do báo cáo không hợp lệ (chỉ chấp nhận: lua_dao, hang_cam, sai_mo_ta, spam, khong_phu_hop, khac)',
  SELF_REPORT_USER: 'Không thể tự báo cáo chính mình',
  SELF_REPORT_OWNER: 'Không thể tự báo cáo tin đăng hoặc nội dung của chính mình',
  DUPLICATE_REPORT: 'Bạn đã gửi báo cáo cho đối tượng này rồi',
  DAILY_LIMIT_EXCEEDED: 'Bạn đã đạt giới hạn tối đa 10 báo cáo mỗi ngày',
  OTHER_REASON_REQUIRES_DESCRIPTION: 'Lý do "Khác" bắt buộc phải có mô tả chi tiết',
  DESCRIPTION_TOO_LONG: 'Mô tả báo cáo không được vượt quá 500 ký tự',
  INVALID_STATUS: 'Trạng thái báo cáo không hợp lệ (chỉ chấp nhận: moi, dang_xu_ly, da_xu_ly, bac_bo)',
};

/**
 * Bộ nhớ in-memory phục vụ môi trường kiểm thử và fallback offline
 */
const inMemoryReports: ReportRecord[] = [];

export function clearReportsStorage(): void {
  inMemoryReports.length = 0;
  if (typeof localStorage !== 'undefined' && localStorage) {
    try {
      localStorage.removeItem('troxinh_reports_data');
    } catch {}
  }
}

function getStoredReports(): ReportRecord[] {
  if (typeof localStorage !== 'undefined' && localStorage) {
    try {
      const raw = localStorage.getItem('troxinh_reports_data');
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return inMemoryReports;
}

function saveStoredReport(report: ReportRecord): void {
  inMemoryReports.push(report);
  if (typeof localStorage !== 'undefined' && localStorage) {
    try {
      localStorage.setItem('troxinh_reports_data', JSON.stringify(inMemoryReports));
    } catch {}
  }
}

/**
 * Kiểm tra xem người dùng đã báo cáo đối tượng này hay chưa
 */
export function hasUserReported(
  reporterId: string | undefined,
  targetType: string,
  targetId: string | undefined,
): boolean {
  if (!reporterId || !targetId) return false;
  try {
    const list = getStoredReports();
    const normType = normalizeTargetType(targetType);
    return list.some(
      (r) =>
        isSameUserId(r.reporter_id, reporterId) &&
        r.target_type === normType &&
        r.target_id === targetId,
    );
  } catch {
    return false;
  }
}

/**
 * Lấy danh sách (Set) các target_id mà người dùng đã báo cáo cho một loại đối tượng
 * Giúp giao diện tải một lần thay vì gọi hasUserReported cho từng phần tử
 */
export function getReportedTargetIds(
  reporterId: string | undefined,
  targetType: string,
): Set<string> {
  if (!reporterId) return new Set();
  try {
    const list = getStoredReports();
    const normType = normalizeTargetType(targetType);
    const result = new Set<string>();
    for (const r of list) {
      if (isSameUserId(r.reporter_id, reporterId) && r.target_type === normType) {
        result.add(r.target_id);
      }
    }
    return result;
  } catch {
    return new Set();
  }
}

/**
 * Chuẩn hóa đối tượng báo cáo (hỗ trợ cả alias cũ nếu có)
 */
export function normalizeTargetType(type: string): ReportTargetType {
  const clean = (type || '').trim().toLowerCase();
  if (clean === 'tin_dang' || clean === 'room' || clean === 'roommate' || clean === 'marketplace' || clean === 'listing' || clean === 'post') {
    return 'tin_dang';
  }
  if (clean === 'nguoi_dung' || clean === 'user' || clean === 'profile') {
    return 'nguoi_dung';
  }
  if (clean === 'tin_nhan' || clean === 'message') {
    return 'tin_nhan';
  }
  throw new Error(REPORT_ERROR_MESSAGES.INVALID_TARGET_TYPE);
}

/**
 * Kiểm tra mã lý do hợp lệ
 */
export function isValidReasonCode(reason: string): reason is ReportReasonCode {
  return ['lua_dao', 'hang_cam', 'sai_mo_ta', 'spam', 'khong_phu_hop', 'khac'].includes(reason);
}

/**
 * Kiểm tra mã trạng thái hợp lệ
 */
export function isValidStatusCode(status: string): status is ReportStatusCode {
  return ['moi', 'dang_xu_ly', 'da_xu_ly', 'bac_bo'].includes(status);
}

export interface CreateReportInput {
  reporter_id?: string;
  reporterId?: string;
  target_type: string;
  targetType?: string;
  target_id: string;
  targetId?: string;
  target_owner_id?: string;
  targetOwnerId?: string;
  reason: string;
  description?: string;
  detail?: string;
  content_snapshot?: string;
  targetContentSnapshot?: string;
  reporter_name?: string;
  reporter_phone?: string;
  now?: number; // Dành cho time-travel trong testing
}

/**
 * Kiểm tra toàn bộ quy tắc nghiệp vụ cho báo cáo:
 * 1. Mỗi người báo cáo một đối tượng một lần
 * 2. Không tự báo cáo mình / tin của mình
 * 3. Tối đa 10 báo cáo mỗi ngày
 * 4. Lý do "khac" bắt buộc mô tả
 * 5. Mô tả tối đa 500 ký tự
 */
export function validateReport(
  input: CreateReportInput,
  existingReports: ReportRecord[] = getStoredReports(),
): {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerId?: string;
  reason: ReportReasonCode;
  description?: string;
  contentSnapshot?: string;
} {
  const reporterId = (input.reporter_id || input.reporterId || '').trim();
  if (!reporterId) {
    throw new Error(REPORT_ERROR_MESSAGES.MISSING_REPORTER);
  }

  const rawTargetId = (input.target_id || input.targetId || '').trim();
  if (!rawTargetId) {
    throw new Error(REPORT_ERROR_MESSAGES.MISSING_TARGET);
  }

  const targetType = normalizeTargetType(input.target_type || input.targetType || '');
  const targetOwnerId = (input.target_owner_id || input.targetOwnerId || '').trim() || undefined;

  // 1. Quy tắc: Không tự báo cáo mình / tin của mình
  if (targetType === 'nguoi_dung') {
    if (isSameUserId(reporterId, rawTargetId)) {
      throw new Error(REPORT_ERROR_MESSAGES.SELF_REPORT_USER);
    }
  }

  if (targetOwnerId && isSameUserId(reporterId, targetOwnerId)) {
    throw new Error(REPORT_ERROR_MESSAGES.SELF_REPORT_OWNER);
  }

  // 2. Quy tắc: Kiểm tra mã lý do
  const rawReason = (input.reason || '').trim().toLowerCase();
  if (!isValidReasonCode(rawReason)) {
    throw new Error(REPORT_ERROR_MESSAGES.INVALID_REASON);
  }
  const reason: ReportReasonCode = rawReason;

  const description = (input.description || input.detail || '').trim();

  // 3. Quy tắc: Lý do "khac" bắt buộc mô tả
  if (reason === 'khac' && !description) {
    throw new Error(REPORT_ERROR_MESSAGES.OTHER_REASON_REQUIRES_DESCRIPTION);
  }

  // 4. Quy tắc: Mô tả tối đa 500 ký tự
  if (description.length > MAX_REPORT_DESCRIPTION_LENGTH) {
    throw new Error(REPORT_ERROR_MESSAGES.DESCRIPTION_TOO_LONG);
  }

  // 5. Quy tắc: Mỗi người báo cáo một đối tượng một lần
  const alreadyReported = existingReports.some(
    (r) =>
      isSameUserId(r.reporter_id, reporterId) &&
      r.target_type === targetType &&
      r.target_id === rawTargetId,
  );
  if (alreadyReported) {
    throw new Error(REPORT_ERROR_MESSAGES.DUPLICATE_REPORT);
  }

  // 6. Quy tắc: Tối đa 10 báo cáo mỗi ngày
  const currentTime = input.now || Date.now();
  const oneDayAgo = currentTime - ONE_DAY_MS;
  const recentReportsCount = existingReports.filter(
    (r) =>
      isSameUserId(r.reporter_id, reporterId) &&
      new Date(r.created_at).getTime() > oneDayAgo,
  ).length;

  if (recentReportsCount >= MAX_REPORTS_PER_DAY) {
    throw new Error(REPORT_ERROR_MESSAGES.DAILY_LIMIT_EXCEEDED);
  }

  const contentSnapshot = (input.content_snapshot || input.targetContentSnapshot || '').trim();

  return {
    reporterId,
    targetType,
    targetId: rawTargetId,
    targetOwnerId,
    reason,
    description: description || undefined,
    contentSnapshot: contentSnapshot || undefined,
  };
}

export interface AutoModerationEvaluation {
  shouldTrigger: boolean;
  distinctCount: number;
  threshold: number;
  targetId: string;
  reporterIds: string[];
}

/**
 * Đánh giá xem tin đăng có đạt ngưỡng báo cáo để tự động chuyển về chờ duyệt lại hay không
 * Ngưỡng mặc định là 3 người báo cáo khác nhau (AUTO_MODERATION_REPORT_THRESHOLD)
 * Chỉ tính các báo cáo có trạng thái 'moi' hoặc 'dang_xu_ly'
 */
export function evaluateAutoModeration(
  targetId: string,
  reports: ReportRecord[] = getStoredReports(),
  threshold: number = AUTO_MODERATION_REPORT_THRESHOLD,
): AutoModerationEvaluation {
  const validReports = reports.filter(
    (r) =>
      r.target_id === targetId &&
      r.target_type === 'tin_dang' &&
      (r.status === 'moi' || r.status === 'dang_xu_ly') &&
      Boolean(r.reporter_id && r.reporter_id.trim()),
  );

  const uniqueReporters = new Set<string>();
  for (const r of validReports) {
    uniqueReporters.add(r.reporter_id.trim());
  }

  return {
    shouldTrigger: uniqueReporters.size >= threshold,
    distinctCount: uniqueReporters.size,
    threshold,
    targetId,
    reporterIds: Array.from(uniqueReporters),
  };
}

export type AutoModerationListener = (data: {
  targetId: string;
  targetOwnerId?: string;
  distinctCount: number;
  threshold: number;
}) => void;

const autoModerationListeners = new Set<AutoModerationListener>();

export function onAutoModerationTriggered(listener: AutoModerationListener): () => void {
  autoModerationListeners.add(listener);
  return () => {
    autoModerationListeners.delete(listener);
  };
}

export function notifyAutoModerationListeners(data: {
  targetId: string;
  targetOwnerId?: string;
  distinctCount: number;
  threshold: number;
}): void {
  for (const listener of autoModerationListeners) {
    try {
      listener(data);
    } catch (err) {
      console.warn('[ReportsAPI] Error in autoModerationListener:', err);
    }
  }
}

/**
 * Tạo mới bản ghi báo cáo tuân thủ toàn bộ quy tắc nghiệp vụ
 * Trạng thái khởi tạo luôn là 'moi'
 */
export async function createReport(payload: CreateReportInput): Promise<ReportRecord> {
  const existingList = getStoredReports();
  const validated = validateReport(payload, existingList);

  const currentTime = payload.now ? new Date(payload.now).toISOString() : new Date().toISOString();
  const reportRecord: ReportRecord = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    reporter_id: validated.reporterId,
    target_type: validated.targetType,
    target_id: validated.targetId,
    target_owner_id: validated.targetOwnerId,
    reason: validated.reason,
    description: validated.description,
    content_snapshot: validated.contentSnapshot,
    status: 'moi',
    reporter_name: payload.reporter_name,
    reporter_phone: payload.reporter_phone,
    created_at: currentTime,
    updated_at: currentTime,
  };

  // 1. Lưu vào bộ nhớ cục bộ
  saveStoredReport(reportRecord);

  // 2. Kiểm tra tự động kiểm duyệt (Auto-moderation) khi đối tượng là tin đăng
  if (validated.targetType === 'tin_dang') {
    const autoMod = evaluateAutoModeration(
      validated.targetId,
      getStoredReports(),
      AUTO_MODERATION_REPORT_THRESHOLD,
    );

    // Kiểm tra xem tin đăng này đã từng bị tự động kiểm duyệt trước đó chưa (tránh gửi thông báo trùng khi có báo cáo thứ 4, 5...)
    const wasAlreadyModerated = existingList.some(
      (r) => r.target_id === validated.targetId && r.target_type === 'tin_dang' && r.auto_moderated
    );

    if (autoMod.shouldTrigger) {
      reportRecord.auto_moderated = true;

      // Chỉ gửi thông báo và phát sự kiện lần đầu tiên khi tin chuyển trạng thái
      if (!wasAlreadyModerated) {
        // Thông báo cho các listener (như Zustand store để ẩn tin ngay trên UI)
        notifyAutoModerationListeners({
          targetId: validated.targetId,
          targetOwnerId: validated.targetOwnerId,
          distinctCount: autoMod.distinctCount,
          threshold: autoMod.threshold,
        });

        // Đồng bộ chuyển trạng thái tin đăng và tạo thông báo trên Supabase
        if (isSupabaseConfigured) {
          try {
            await supabase
              .from('marketplace_items')
              .update({
                status: 'pending',
                moderation_status: 'pending',
                updated_at: new Date().toISOString(),
              })
              .eq('id', validated.targetId);

            if (validated.targetOwnerId) {
              await supabase.from('notifications').insert({
                user_id: validated.targetOwnerId,
                type: 'moderation',
                title: 'Tin đăng đang được xem xét lại',
                body: 'Tin đăng của bạn đang được xem xét lại do nhận được nhiều phản ánh từ cộng đồng và đã tạm thời được ẩn khỏi chợ.',
                cta_url: `/cho-do-cu/${validated.targetId}?edit=true`,
                cta_label: 'Sửa tin & gửi duyệt lại',
                is_read: false,
                created_at: new Date().toISOString(),
              });
            }
          } catch (autoErr) {
            console.warn('[ReportsAPI] Lỗi thực thi auto-moderation lên Supabase:', autoErr);
          }
        }
      }
    }
  }

  // 3. Đồng bộ lên Supabase nếu có cấu hình
  if (isSupabaseConfigured) {
    try {
      const validReporterId =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validated.reporterId)
          ? validated.reporterId
          : resolveDemoAlias(validated.reporterId) || null;

      const combinedDescription = validated.contentSnapshot
        ? `[Bản sao nội dung lúc báo cáo: "${validated.contentSnapshot}"]\n${validated.description || ''}`.trim()
        : validated.description || null;

      await supabase.from('reports').insert({
        reporter_id: validReporterId,
        target_type: validated.targetType,
        target_id: validated.targetId,
        reason: validated.reason,
        description: combinedDescription,
        status: 'moi',
        created_at: currentTime,
      });
    } catch (err) {
      console.warn('[ReportsAPI] Không thể đồng bộ báo cáo lên Supabase:', err);
    }
  }

  return reportRecord;
}

/**
 * Lấy toàn bộ báo cáo lưu trữ (dùng cho test và fallback offline)
 */
export function getAllStoredReports(): ReportRecord[] {
  return [...getStoredReports()];
}

/**
 * Gom các báo cáo cùng một đối tượng và tính số lượng báo cáo, số người báo cáo riêng biệt
 */
export function groupReportsByTarget(
  reports: ReportRecord[],
  extraMetadataMap?: Map<string, { target_owner?: any; target_content?: any }>,
): GroupedReportItem[] {
  const groupsMap = new Map<string, GroupedReportItem>();

  for (const report of reports) {
    const key = `${report.target_type}:${report.target_id}`;
    let item = groupsMap.get(key);

    if (!item) {
      const extra = extraMetadataMap?.get(key);
      item = {
        target_type: report.target_type,
        target_id: report.target_id,
        target_owner_id: report.target_owner_id,
        target_owner: extra?.target_owner,
        target_content:
          extra?.target_content ||
          (report.content_snapshot ? { content_snapshot: report.content_snapshot } : undefined),
        reports: [],
        total_reports: 0,
        distinct_reporters: 0,
        status: report.status,
        reasons: [],
        latest_created_at: report.created_at,
        earliest_created_at: report.created_at,
        resolved_by: report.resolved_by,
        resolved_by_name: report.resolved_by_name,
        resolved_at: report.resolved_at,
        admin_notes: report.admin_notes,
        auto_moderated: report.auto_moderated,
      };
      groupsMap.set(key, item);
    }

    item.reports.push(report);
    if (!item.reasons.includes(report.reason)) {
      item.reasons.push(report.reason);
    }

    if (report.auto_moderated) {
      item.auto_moderated = true;
    }

    // Cập nhật thông tin xử lý mới nhất nếu có
    if (report.resolved_at && (!item.resolved_at || new Date(report.resolved_at).getTime() > new Date(item.resolved_at).getTime())) {
      item.resolved_at = report.resolved_at;
      item.resolved_by = report.resolved_by;
      item.resolved_by_name = report.resolved_by_name;
      item.admin_notes = report.admin_notes || item.admin_notes;
    }

    // Cập nhật mốc thời gian báo cáo
    if (new Date(report.created_at).getTime() > new Date(item.latest_created_at).getTime()) {
      item.latest_created_at = report.created_at;
    }
    if (new Date(report.created_at).getTime() < new Date(item.earliest_created_at).getTime()) {
      item.earliest_created_at = report.created_at;
    }
  }

  // Tính số lượng và trạng thái tổng thể của từng nhóm
  const result: GroupedReportItem[] = [];
  for (const item of groupsMap.values()) {
    item.total_reports = item.reports.length;
    const uniqueReporters = new Set<string>();
    for (const r of item.reports) {
      if (r.reporter_id) uniqueReporters.add(r.reporter_id.trim());
    }
    item.distinct_reporters = uniqueReporters.size;
    if (item.distinct_reporters >= AUTO_MODERATION_REPORT_THRESHOLD && item.target_type === 'tin_dang') {
      item.auto_moderated = true;
    }

    // Trạng thái tổng hợp:
    // Nếu có ít nhất 1 báo cáo 'moi' -> 'moi'
    // Ngược lại nếu có 'dang_xu_ly' -> 'dang_xu_ly'
    // Ngược lại nếu tất cả là 'bac_bo' -> 'bac_bo'
    // Còn lại -> 'da_xu_ly'
    const hasMoi = item.reports.some((r) => r.status === 'moi');
    const hasDangXuLy = item.reports.some((r) => r.status === 'dang_xu_ly');
    const allBacBo = item.reports.length > 0 && item.reports.every((r) => r.status === 'bac_bo');

    if (hasMoi) {
      item.status = 'moi';
    } else if (hasDangXuLy) {
      item.status = 'dang_xu_ly';
    } else if (allBacBo) {
      item.status = 'bac_bo';
    } else {
      item.status = 'da_xu_ly';
    }

    result.push(item);
  }

  // Mặc định sắp xếp: mới nhất xếp đầu tiên
  result.sort((a, b) => new Date(b.latest_created_at).getTime() - new Date(a.latest_created_at).getTime());

  return result;
}

/**
 * Cập nhật trạng thái báo cáo (chỉ chấp nhận: moi, dang_xu_ly, da_xu_ly, bac_bo)
 * Hỗ trợ lưu admin_notes, resolved_by, resolved_at
 */
export function updateReportStatus(
  reportId: string,
  newStatus: ReportStatusCode,
  adminNotes?: string,
  resolvedBy?: string,
  resolvedByName?: string,
  resolvedAt?: string,
): ReportRecord {
  if (!isValidStatusCode(newStatus)) {
    throw new Error(REPORT_ERROR_MESSAGES.INVALID_STATUS);
  }

  const list = getStoredReports();
  const report = list.find((r) => r.id === reportId);
  if (!report) {
    throw new Error('Không tìm thấy báo cáo cần cập nhật');
  }

  report.status = newStatus;
  if (adminNotes !== undefined) {
    report.admin_notes = adminNotes;
  }
  if (resolvedBy !== undefined) {
    report.resolved_by = resolvedBy;
  }
  if (resolvedByName !== undefined) {
    report.resolved_by_name = resolvedByName;
  }
  report.resolved_at = resolvedAt || (newStatus === 'da_xu_ly' || newStatus === 'bac_bo' ? new Date().toISOString() : undefined);
  report.updated_at = new Date().toISOString();

  return report;
}
