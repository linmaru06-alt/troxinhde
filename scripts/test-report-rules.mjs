import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// ==============================================================================
// ĐỊNH NGHĨA DỮ LIỆU & BẢNG NHÃN TIẾNG VIỆT CHO HỆ THỐNG BÁO CÁO (REPORT SYSTEM)
// ==============================================================================

/**
 * 1. Danh mục đối tượng báo cáo
 */
export const REPORT_TARGET_LABELS = {
  tin_dang: 'Tin đăng',
  nguoi_dung: 'Người dùng',
  tin_nhan: 'Tin nhắn',
};

/**
 * 2. Danh mục mã lý do báo cáo
 */
export const REPORT_REASON_LABELS = {
  lua_dao: 'Lừa đảo',
  hang_cam: 'Hàng cấm',
  sai_mo_ta: 'Sai mô tả',
  spam: 'Spam',
  khong_phu_hop: 'Không phù hợp',
  khac: 'Khác',
};

/**
 * 3. Danh mục mã trạng thái báo cáo
 */
export const REPORT_STATUS_LABELS = {
  moi: 'Mới',
  dang_xu_ly: 'Đang xử lý',
  da_xu_ly: 'Đã xử lý',
  bac_bo: 'Bác bỏ',
};

// Hằng số quy tắc nghiệp vụ
export const MAX_REPORTS_PER_DAY = 10;
export const MAX_REPORT_DESCRIPTION_LENGTH = 500;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Ngưỡng số người báo cáo khác nhau để tự động đưa tin về trạng thái chờ duyệt lại và ẩn khỏi chợ
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

// Bộ nhớ mô phỏng Database cho Báo cáo, Tin đăng Chợ và Thông báo
const dbReports = [];
const dbMarketplaceItems = [];
const dbNotifications = [];

export function clearReportsStorage() {
  dbReports.length = 0;
  dbMarketplaceItems.length = 0;
  dbNotifications.length = 0;
}

export function registerMockMarketplaceItem(item) {
  const existingIndex = dbMarketplaceItems.findIndex((m) => m.id === item.id);
  if (existingIndex >= 0) {
    dbMarketplaceItems[existingIndex] = { ...item };
  } else {
    dbMarketplaceItems.push({ ...item });
  }
}

export function getMockMarketplaceItems() {
  return dbMarketplaceItems;
}

export function getMockNotifications() {
  return dbNotifications;
}

export function normalizeTargetType(type) {
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

export function isValidReasonCode(reason) {
  return ['lua_dao', 'hang_cam', 'sai_mo_ta', 'spam', 'khong_phu_hop', 'khac'].includes(reason);
}

export function isValidStatusCode(status) {
  return ['moi', 'dang_xu_ly', 'da_xu_ly', 'bac_bo'].includes(status);
}

export function hasUserReported(reporterId, targetType, targetId) {
  if (!reporterId || !targetId) return false;
  try {
    const normType = normalizeTargetType(targetType);
    return dbReports.some(
      (r) =>
        isSameUserId(r.reporter_id, reporterId) &&
        r.target_type === normType &&
        r.target_id === targetId,
    );
  } catch {
    return false;
  }
}

export function getReportedTargetIds(reporterId, targetType) {
  if (!reporterId) return new Set();
  try {
    const normType = normalizeTargetType(targetType);
    const result = new Set();
    for (const r of dbReports) {
      if (isSameUserId(r.reporter_id, reporterId) && r.target_type === normType) {
        result.add(r.target_id);
      }
    }
    return result;
  } catch {
    return new Set();
  }
}

function isSameUserId(id1, id2) {
  if (!id1 || !id2) return false;
  return String(id1).trim() === String(id2).trim();
}

/**
 * Kiểm tra toàn bộ quy tắc nghiệp vụ cho báo cáo:
 * 1. Mỗi người báo cáo một đối tượng một lần
 * 2. Không tự báo cáo mình / tin của mình
 * 3. Tối đa 10 báo cáo mỗi ngày
 * 4. Lý do "khac" bắt buộc mô tả
 * 5. Mô tả tối đa 500 ký tự
 */
export function validateReport(input, existingReports = dbReports) {
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
  const reason = rawReason;

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

export function evaluateAutoModeration(
  targetId,
  reports = dbReports,
  threshold = AUTO_MODERATION_REPORT_THRESHOLD,
) {
  const validReports = reports.filter(
    (r) =>
      r.target_id === targetId &&
      r.target_type === 'tin_dang' &&
      (r.status === 'moi' || r.status === 'dang_xu_ly') &&
      Boolean(r.reporter_id && r.reporter_id.trim()),
  );

  const uniqueReporters = new Set();
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

export function mockFilterMarketplaceItems(items, viewMode = 'public') {
  if (viewMode === 'public') {
    return items.filter(
      (item) => item.status !== 'Chờ duyệt' && item.moderationStatus !== 'pending' && item.status !== 'pending'
    );
  }
  return items;
}

export async function createReport(payload) {
  const validated = validateReport(payload, dbReports);

  const currentTime = payload.now ? new Date(payload.now).toISOString() : new Date().toISOString();
  const reportRecord = {
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

  dbReports.push(reportRecord);

  // Tự động kiểm duyệt khi đối tượng là tin đăng
  if (validated.targetType === 'tin_dang') {
    const autoMod = evaluateAutoModeration(validated.targetId, dbReports, AUTO_MODERATION_REPORT_THRESHOLD);
    
    // Kiểm tra tin đã từng bị auto-moderate chưa (tránh gửi trùng lặp khi nhận thêm báo cáo thứ 4, 5...)
    const wasAlreadyModerated = dbReports.filter((r) => r.target_id === validated.targetId && r.target_type === 'tin_dang').some((r) => r.auto_moderated);

    if (autoMod.shouldTrigger) {
      reportRecord.auto_moderated = true;

      // Chỉ cập nhật và gửi thông báo LẦN ĐẦU TIÊN
      if (!wasAlreadyModerated) {
        // Cập nhật trạng thái tin đăng trong mock database
        const foundItem = dbMarketplaceItems.find((m) => m.id === validated.targetId);
        if (foundItem) {
          foundItem.status = 'Chờ duyệt';
          foundItem.moderationStatus = 'pending';
          foundItem.rejectionReason = 'Tạm ẩn để xem xét lại do nhận nhiều phản ánh vi phạm';
        }

        // Gửi thông báo cho người đăng
        const targetOwner = validated.targetOwnerId || foundItem?.userId;
        if (targetOwner) {
          dbNotifications.push({
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: targetOwner,
            type: 'moderation',
            title: 'Tin đăng đang được xem xét lại',
            body: `Tin đăng "${foundItem?.name || 'của bạn'}" của bạn đang được xem xét lại do nhận được nhiều phản ánh từ cộng đồng và đã tạm thời được ẩn khỏi chợ.`,
            createdAt: currentTime,
            read: false,
            ctaUrl: `/cho-do-cu/${validated.targetId}?edit=true`,
            ctaLabel: 'Sửa tin & gửi duyệt lại',
          });
        }
      }
    }
  }

  return reportRecord;
}

export function approveMarketplaceItemMock(itemId) {
  const item = dbMarketplaceItems.find((m) => m.id === itemId);
  if (item) {
    item.status = 'Còn trống';
    item.moderationStatus = 'approved';
    item.rejectionReason = undefined;
  }
}

export function updateReportStatus(reportId, newStatus, adminNotes) {
  if (!isValidStatusCode(newStatus)) {
    throw new Error(REPORT_ERROR_MESSAGES.INVALID_STATUS);
  }

  const report = dbReports.find((r) => r.id === reportId);
  if (!report) {
    throw new Error('Không tìm thấy báo cáo cần cập nhật');
  }

  report.status = newStatus;
  if (adminNotes !== undefined) {
    report.admin_notes = adminNotes;
  }
  report.updated_at = new Date().toISOString();

  return report;
}

// ==============================================================================
// TEST SUITE ĐẦY ĐỦ CÁC QUY TẮC BÁO CÁO
// ==============================================================================
console.log('======================================================================');
console.log('  BẮT ĐẦU CHẠY TEST SUITE NODE.JS CHO HỆ THỐNG BÁO CÁO (REPORT RULES)');
console.log('======================================================================\n');

let totalPassed = 0;
let totalFailed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    totalFailed++;
  }
}

async function runAllReportTests() {
  clearReportsStorage();

  // Test 1: Bảng nhãn tiếng Việt cho 3 loại đối tượng (tin_dang, nguoi_dung, tin_nhan)
  await runTest('Bảng nhãn tiếng Việt cho 3 loại đối tượng (tin_dang, nguoi_dung, tin_nhan)', async () => {
    assert.strictEqual(REPORT_TARGET_LABELS.tin_dang, 'Tin đăng');
    assert.strictEqual(REPORT_TARGET_LABELS.nguoi_dung, 'Người dùng');
    assert.strictEqual(REPORT_TARGET_LABELS.tin_nhan, 'Tin nhắn');
    assert.strictEqual(Object.keys(REPORT_TARGET_LABELS).length, 3);
  });

  // Test 2: Bảng nhãn tiếng Việt cho 6 mã lý do theo yêu cầu
  await runTest('Bảng nhãn tiếng Việt cho 6 mã lý do (lua_dao, hang_cam, sai_mo_ta, spam, khong_phu_hop, khac)', async () => {
    assert.strictEqual(REPORT_REASON_LABELS.lua_dao, 'Lừa đảo');
    assert.strictEqual(REPORT_REASON_LABELS.hang_cam, 'Hàng cấm');
    assert.strictEqual(REPORT_REASON_LABELS.sai_mo_ta, 'Sai mô tả');
    assert.strictEqual(REPORT_REASON_LABELS.spam, 'Spam');
    assert.strictEqual(REPORT_REASON_LABELS.khong_phu_hop, 'Không phù hợp');
    assert.strictEqual(REPORT_REASON_LABELS.khac, 'Khác');
    assert.strictEqual(Object.keys(REPORT_REASON_LABELS).length, 6);
  });

  // Test 3: Bảng nhãn tiếng Việt cho 4 mã trạng thái theo yêu cầu
  await runTest('Bảng nhãn tiếng Việt cho 4 mã trạng thái (moi, dang_xu_ly, da_xu_ly, bac_bo)', async () => {
    assert.strictEqual(REPORT_STATUS_LABELS.moi, 'Mới');
    assert.strictEqual(REPORT_STATUS_LABELS.dang_xu_ly, 'Đang xử lý');
    assert.strictEqual(REPORT_STATUS_LABELS.da_xu_ly, 'Đã xử lý');
    assert.strictEqual(REPORT_STATUS_LABELS.bac_bo, 'Bác bỏ');
    assert.strictEqual(Object.keys(REPORT_STATUS_LABELS).length, 4);
  });

  // Test 4: Quy tắc - Không tự báo cáo chính mình
  await runTest('Quy tắc: Không thể tự báo cáo chính mình (target_type: nguoi_dung)', async () => {
    let threw = false;
    try {
      await createReport({
        reporter_id: 'user_123',
        target_type: 'nguoi_dung',
        target_id: 'user_123', // trùng với reporter_id
        reason: 'spam',
      });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.message, REPORT_ERROR_MESSAGES.SELF_REPORT_USER);
    }
    assert.strictEqual(threw, true, 'Phải ném lỗi khi tự báo cáo chính mình');
  });

  // Test 5: Quy tắc - Không tự báo cáo tin đăng của chính mình
  await runTest('Quy tắc: Không thể tự báo cáo tin đăng của chính mình', async () => {
    let threw = false;
    try {
      await createReport({
        reporter_id: 'user_owner_456',
        target_type: 'tin_dang',
        target_id: 'listing_999',
        target_owner_id: 'user_owner_456', // trùng với reporter_id
        reason: 'sai_mo_ta',
      });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.message, REPORT_ERROR_MESSAGES.SELF_REPORT_OWNER);
    }
    assert.strictEqual(threw, true, 'Phải ném lỗi khi tự báo cáo tin của mình');
  });

  // Test 6: Quy tắc - Không tự báo cáo tin nhắn của chính mình
  await runTest('Quy tắc: Không thể tự báo cáo tin nhắn do chính mình gửi', async () => {
    let threw = false;
    try {
      await createReport({
        reporter_id: 'user_sender_789',
        target_type: 'tin_nhan',
        target_id: 'msg_001',
        target_owner_id: 'user_sender_789', // người gửi là chính reporter
        reason: 'khong_phu_hop',
      });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.message, REPORT_ERROR_MESSAGES.SELF_REPORT_OWNER);
    }
    assert.strictEqual(threw, true, 'Phải ném lỗi khi tự báo cáo tin nhắn của mình');
  });

  // Test 7: Quy tắc - Lý do "khac" bắt buộc có mô tả
  await runTest('Quy tắc: Lý do "khac" bắt buộc mô tả chi tiết', async () => {
    let threw = false;
    try {
      await createReport({
        reporter_id: 'reporter_001',
        target_type: 'tin_dang',
        target_id: 'listing_001',
        reason: 'khac',
        description: '   ', // rỗng hoặc toàn khoảng trắng
      });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.message, REPORT_ERROR_MESSAGES.OTHER_REASON_REQUIRES_DESCRIPTION);
    }
    assert.strictEqual(threw, true, 'Phải ném lỗi khi chọn "khac" mà không có mô tả');

    // Khi có mô tả thì thành công
    const validOtherReport = await createReport({
      reporter_id: 'reporter_001',
      target_type: 'tin_dang',
      target_id: 'listing_001',
      reason: 'khac',
      description: 'Mô tả lý do chi tiết ở đây...',
    });
    assert.ok(validOtherReport.id);
    assert.strictEqual(validOtherReport.status, 'moi');
  });

  // Test 8: Quy tắc - Các lý do khác ngoài "khac" không bắt buộc mô tả
  await runTest('Quy tắc: Các lý do xác định trước (lua_dao, spam, ...) không bắt buộc mô tả', async () => {
    const report = await createReport({
      reporter_id: 'reporter_002',
      target_type: 'nguoi_dung',
      target_id: 'bad_user_001',
      reason: 'lua_dao',
    });
    assert.ok(report.id);
    assert.strictEqual(report.reason, 'lua_dao');
    assert.strictEqual(report.status, 'moi');
  });

  // Test 9: Quy tắc - Mô tả tối đa 500 ký tự
  await runTest('Quy tắc: Mô tả tối đa 500 ký tự (500 ký tự pass, 501 ký tự fail)', async () => {
    // 500 ký tự: Hợp lệ
    const text500 = 'A'.repeat(500);
    const validReport = await createReport({
      reporter_id: 'reporter_003',
      target_type: 'tin_nhan',
      target_id: 'msg_500_char',
      reason: 'spam',
      description: text500,
    });
    assert.strictEqual(validReport.description?.length, 500);

    // 501 ký tự: Lỗi
    const text501 = 'A'.repeat(501);
    let threw = false;
    try {
      await createReport({
        reporter_id: 'reporter_003',
        target_type: 'tin_nhan',
        target_id: 'msg_501_char',
        reason: 'spam',
        description: text501,
      });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.message, REPORT_ERROR_MESSAGES.DESCRIPTION_TOO_LONG);
    }
    assert.strictEqual(threw, true, 'Phải ném lỗi khi mô tả vượt quá 500 ký tự');
  });

  // Test 10: Quy tắc - Mỗi người báo cáo một đối tượng một lần
  await runTest('Quy tắc: Mỗi người báo cáo một đối tượng một lần (chống trùng lặp)', async () => {
    const reporterA = 'reporter_unique_A';
    const targetItem = 'item_target_unique';

    // Lần 1: Thành công
    const rep1 = await createReport({
      reporter_id: reporterA,
      target_type: 'tin_dang',
      target_id: targetItem,
      reason: 'hang_cam',
    });
    assert.ok(rep1.id);

    // Lần 2: Cùng reporter báo cáo lại cùng target -> Bị từ chối
    let threw = false;
    try {
      await createReport({
        reporter_id: reporterA,
        target_type: 'tin_dang',
        target_id: targetItem,
        reason: 'lua_dao',
      });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.message, REPORT_ERROR_MESSAGES.DUPLICATE_REPORT);
    }
    assert.strictEqual(threw, true, 'Phải chặn người dùng báo cáo trùng đối tượng');

    // Người khác (reporterB) báo cáo đối tượng này -> Thành công
    const repOther = await createReport({
      reporter_id: 'reporter_unique_B',
      target_type: 'tin_dang',
      target_id: targetItem,
      reason: 'sai_mo_ta',
    });
    assert.ok(repOther.id);

    // Cùng reporterA báo cáo đối tượng khác -> Thành công
    const repDiffItem = await createReport({
      reporter_id: reporterA,
      target_type: 'tin_dang',
      target_id: 'item_target_different',
      reason: 'hang_cam',
    });
    assert.ok(repDiffItem.id);
  });

  // Test 11: Quy tắc - Tối đa 10 báo cáo mỗi ngày
  await runTest('Quy tắc: Tối đa 10 báo cáo mỗi ngày cho mỗi người', async () => {
    const dailyReporter = 'reporter_rate_daily';
    const baseTime = Date.now();

    // Gửi liên tiếp 10 báo cáo cho 10 đối tượng khác nhau -> Cả 10 lần thành công
    for (let i = 1; i <= 10; i++) {
      const res = await createReport({
        reporter_id: dailyReporter,
        target_type: 'tin_dang',
        target_id: `daily_target_${i}`,
        reason: 'spam',
        now: baseTime + i * 1000,
      });
      assert.ok(res.id, `Báo cáo thứ ${i} phải thành công`);
    }

    // Báo cáo thứ 11 trong ngày -> Bị chặn
    let threw = false;
    try {
      await createReport({
        reporter_id: dailyReporter,
        target_type: 'tin_dang',
        target_id: 'daily_target_11',
        reason: 'spam',
        now: baseTime + 11000,
      });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.message, REPORT_ERROR_MESSAGES.DAILY_LIMIT_EXCEEDED);
    }
    assert.strictEqual(threw, true, 'Phải chặn báo cáo thứ 11 trong cùng ngày');

    // Sau 24 giờ trôi qua (sang ngày mới) -> Mở khóa và gửi được báo cáo tiếp
    const nextDayTime = baseTime + 24 * 60 * 60 * 1000 + 10000;
    const resNextDay = await createReport({
      reporter_id: dailyReporter,
      target_type: 'tin_dang',
      target_id: 'daily_target_11',
      reason: 'spam',
      now: nextDayTime,
    });
    assert.ok(resNextDay.id, 'Sau 24 giờ, người dùng gửi báo cáo mới thành công');
  });

  // Test 12: Chu trình cập nhật trạng thái (moi -> dang_xu_ly -> da_xu_ly / bac_bo)
  await runTest('Chu trình cập nhật trạng thái (moi -> dang_xu_ly -> da_xu_ly / bac_bo)', async () => {
    const rep = await createReport({
      reporter_id: 'admin_test_reporter',
      target_type: 'tin_nhan',
      target_id: 'msg_for_status_test',
      reason: 'khong_phu_hop',
    });
    assert.strictEqual(rep.status, 'moi');

    // Chuyển sang dang_xu_ly
    const updating = updateReportStatus(rep.id, 'dang_xu_ly', 'Đang xác minh tin nhắn');
    assert.strictEqual(updating.status, 'dang_xu_ly');
    assert.strictEqual(updating.admin_notes, 'Đang xác minh tin nhắn');

    // Chuyển sang da_xu_ly
    const resolved = updateReportStatus(rep.id, 'da_xu_ly', 'Đã thu hồi tin nhắn');
    assert.strictEqual(resolved.status, 'da_xu_ly');

    // Thử cập nhật trạng thái không hợp lệ -> Bị từ chối
    let threw = false;
    try {
      updateReportStatus(rep.id, 'invalid_status_xyz');
    } catch (err) {
      threw = true;
      assert.strictEqual(err.message, REPORT_ERROR_MESSAGES.INVALID_STATUS);
    }
    assert.strictEqual(threw, true, 'Phải ném lỗi khi cập nhật trạng thái không hợp lệ');
  });

  // Test 13: hasUserReported trả về đúng trạng thái "Đã báo cáo"
  await runTest('hasUserReported trả về true khi đã báo cáo và false khi chưa báo cáo', async () => {
    const userCheck = 'user_check_reported_1';
    const itemTarget = 'item_target_check_1';

    // Chưa báo cáo
    assert.strictEqual(hasUserReported(userCheck, 'tin_dang', itemTarget), false);

    // Gửi báo cáo
    await createReport({
      reporter_id: userCheck,
      target_type: 'tin_dang',
      target_id: itemTarget,
      reason: 'spam',
    });

    // Sau khi gửi -> hasUserReported trả về true
    assert.strictEqual(hasUserReported(userCheck, 'tin_dang', itemTarget), true);

    // Người dùng khác kiểm tra đối tượng này -> vẫn là false
    assert.strictEqual(hasUserReported('user_other_visitor', 'tin_dang', itemTarget), false);
  });

  // Test 14: Người đăng tin không thể tự báo cáo tin đăng của chính mình
  await runTest('Người đăng tin không thể tự báo cáo tin của mình (isOwner bảo vệ)', async () => {
    const ownerId = 'seller_owner_identity';
    const itemId = 'item_belonging_to_owner';

    let threw = false;
    try {
      await createReport({
        reporter_id: ownerId,
        target_type: 'tin_dang',
        target_id: itemId,
        target_owner_id: ownerId,
        reason: 'lua_dao',
      });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.message, REPORT_ERROR_MESSAGES.SELF_REPORT_OWNER);
    }
    assert.strictEqual(threw, true, 'Chủ tin đăng không thể gửi báo cáo tin của chính mình');
  });

  // Test 15: Kiểm tra tham số returnUrl khi chuyển hướng đăng nhập
  await runTest('Kiểm tra tạo returnUrl chuyển hướng sang đăng nhập và quay lại trang', async () => {
    const currentPath = '/cho-do-cu/item-quat-101';
    const currentSearch = '?tab=detail';
    const returnUrl = encodeURIComponent(currentPath + currentSearch);
    const loginRedirectPath = `/dang-nhap?returnUrl=${returnUrl}`;

    assert.ok(loginRedirectPath.includes('returnUrl=%2Fcho-do-cu%2Fitem-quat-101%3Ftab%3Ddetail'));
    assert.strictEqual(decodeURIComponent(returnUrl), '/cho-do-cu/item-quat-101?tab=detail');
  });

  // Test 16: Báo cáo người bán / người dùng (nguoi_dung) và chặn tự báo cáo mình
  await runTest('Báo cáo người bán / người dùng (nguoi_dung) và chặn tự báo cáo mình', async () => {
    const buyerId = 'buyer_student_101';
    const sellerId = 'seller_student_202';

    // 1. Người mua báo cáo người bán thành công
    const repSeller = await createReport({
      reporter_id: buyerId,
      target_type: 'nguoi_dung',
      target_id: sellerId,
      target_owner_id: sellerId,
      reason: 'lua_dao',
      description: 'Người bán không giao hàng đúng hẹn',
    });
    assert.ok(repSeller.id);
    assert.strictEqual(repSeller.target_type, 'nguoi_dung');
    assert.strictEqual(hasUserReported(buyerId, 'nguoi_dung', sellerId), true);

    // 2. Chặn tự báo cáo chính mình
    let threwSelf = false;
    try {
      await createReport({
        reporter_id: sellerId,
        target_type: 'nguoi_dung',
        target_id: sellerId,
        reason: 'spam',
      });
    } catch (err) {
      threwSelf = true;
      assert.strictEqual(err.message, REPORT_ERROR_MESSAGES.SELF_REPORT_USER);
    }
    assert.strictEqual(threwSelf, true, 'Người dùng không thể tự báo cáo chính mình');
  });

  // Test 17: Báo cáo tin nhắn (tin_nhan) của đối phương thành công
  await runTest('Báo cáo tin nhắn (tin_nhan) của đối phương trong cuộc trò chuyện', async () => {
    const reporterId = 'chat_buyer_user';
    const otherId = 'chat_seller_user';
    const messageId = 'msg_suspicious_content_001';

    const repMsg = await createReport({
      reporter_id: reporterId,
      target_type: 'tin_nhan',
      target_id: messageId,
      target_owner_id: otherId,
      reason: 'spam',
      description: 'Gửi tin nhắn quảng cáo link độc hại',
    });
    assert.ok(repMsg.id);
    assert.strictEqual(repMsg.target_type, 'tin_nhan');
    assert.strictEqual(hasUserReported(reporterId, 'tin_nhan', messageId), true);
  });

  // Test 18: Không cho phép tự báo cáo tin nhắn của chính mình
  await runTest('Không cho phép người dùng tự báo cáo tin nhắn của chính mình', async () => {
    const myUserId = 'user_author_of_message';
    const myMessageId = 'msg_sent_by_myself_002';

    let threw = false;
    try {
      await createReport({
        reporter_id: myUserId,
        target_type: 'tin_nhan',
        target_id: myMessageId,
        target_owner_id: myUserId, // Người sở hữu tin nhắn chính là người gửi báo cáo
        reason: 'khong_phu_hop',
      });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.message, REPORT_ERROR_MESSAGES.SELF_REPORT_OWNER);
    }
    assert.strictEqual(threw, true, 'Hệ thống phải chặn không cho báo cáo tin nhắn của chính mình');
  });

  // Test 19: Chặn báo cáo trùng một tin nhắn
  await runTest('Chặn báo cáo trùng lặp cho cùng một tin nhắn', async () => {
    const reporterId = 'user_reporter_duplicate_check';
    const msgId = 'msg_duplicate_target_003';

    await createReport({
      reporter_id: reporterId,
      target_type: 'tin_nhan',
      target_id: msgId,
      target_owner_id: 'other_sender_id',
      reason: 'spam',
    });

    let threw = false;
    try {
      await createReport({
        reporter_id: reporterId,
        target_type: 'tin_nhan',
        target_id: msgId,
        target_owner_id: 'other_sender_id',
        reason: 'lua_dao',
      });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.message, REPORT_ERROR_MESSAGES.DUPLICATE_REPORT);
    }
    assert.strictEqual(threw, true, 'Không được phép gửi 2 lần báo cáo cho cùng một tin nhắn');
  });

  // Test 20: Tải một lần getReportedTargetIds trả về Set các target_id đã báo cáo
  await runTest('Tải một lần getReportedTargetIds trả về Set các tin nhắn đã báo cáo', async () => {
    const userBatch = 'user_batch_loader';
    const msg1 = 'batch_msg_01';
    const msg2 = 'batch_msg_02';

    // Ban đầu tập hợp rỗng
    const initialSet = getReportedTargetIds(userBatch, 'tin_nhan');
    assert.strictEqual(initialSet.size, 0);

    // Gửi báo cáo msg1
    await createReport({
      reporter_id: userBatch,
      target_type: 'tin_nhan',
      target_id: msg1,
      target_owner_id: 'sender_other_1',
      reason: 'spam',
    });

    // Gửi báo cáo msg2
    await createReport({
      reporter_id: userBatch,
      target_type: 'tin_nhan',
      target_id: msg2,
      target_owner_id: 'sender_other_2',
      reason: 'lua_dao',
    });

    // Lấy lại danh sách -> Set có chứa cả 2 id
    const resultSet = getReportedTargetIds(userBatch, 'tin_nhan');
    assert.strictEqual(resultSet.size, 2);
    assert.strictEqual(resultSet.has(msg1), true);
    assert.strictEqual(resultSet.has(msg2), true);
    assert.strictEqual(resultSet.has('batch_msg_other_not_reported'), false);
  });

  // Test 21: Lưu kèm bản sao nội dung tin nhắn (content_snapshot) và xử lý preview 80 ký tự / [Hình ảnh]
  await runTest('Lưu kèm bản sao nội dung tin nhắn và format preview tối đa 80 ký tự', async () => {
    const reporter = 'user_snapshot_tester';
    const longContent = 'Đây là nội dung tin nhắn rất dài nhằm mục đích kiểm tra xem hệ thống có cắt tối đa đúng 80 ký tự hay không và thêm dấu ba chấm vào cuối chuỗi văn bản.';
    const rawImageMsg = 'https://example.com/uploads/photo123.jpg';

    // 1. Kiểm tra lưu content_snapshot
    const rep = await createReport({
      reporter_id: reporter,
      target_type: 'tin_nhan',
      target_id: 'msg_snapshot_test_01',
      target_owner_id: 'sender_suspicious',
      content_snapshot: longContent,
      reason: 'khong_phu_hop',
      description: 'Nội dung phản cảm',
    });

    assert.strictEqual(rep.content_snapshot, longContent, 'Bản sao nội dung tin nhắn phải được lưu nguyên vẹn');

    // 2. Kiểm tra hàm preview tin nhắn
    const formatPreview = (text, type = 'text') => {
      if (type === 'image' || !text?.trim()) return '[Hình ảnh]';
      const clean = text.trim();
      if (/^https?:\/\/.*\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(clean)) return '[Hình ảnh]';
      if (clean.length <= 80) return clean;
      return clean.slice(0, 80) + '...';
    };

    assert.strictEqual(formatPreview(rawImageMsg), '[Hình ảnh]');
    assert.strictEqual(formatPreview('', 'image'), '[Hình ảnh]');
    assert.strictEqual(formatPreview('   '), '[Hình ảnh]');

    const shortText = 'Xin chào bạn nhé!';
    assert.strictEqual(formatPreview(shortText), 'Xin chào bạn nhé!');

    const formattedLong = formatPreview(longContent);
    assert.strictEqual(formattedLong.length, 83); // 80 ký tự + "..."
    assert.ok(formattedLong.endsWith('...'));
  });

  // ==============================================================
  // NHÓM TEST QUY TẮC TỰ ĐỘNG KIỂM DUYỆT (AUTO-MODERATION) KHI NHẬN 3 BÁO CÁO
  // ==============================================================

  // Test 22: 3 báo cáo từ CÙNG MỘT NGƯỜI KHÔNG kích hoạt chuyển tin chờ duyệt lại và KHÔNG ẩn khỏi chợ
  await runTest('3 báo cáo từ CÙNG MỘT NGƯỜI KHÔNG kích hoạt tự chuyển tin chờ duyệt', async () => {
    clearReportsStorage();
    const itemId = 'item_same_reporter_test';
    const sellerId = 'seller_user_01';

    // Đăng ký tin ban đầu ở trạng thái hoạt động công khai
    registerMockMarketplaceItem({
      id: itemId,
      name: 'Nồi cơm điện Cuckoo',
      userId: sellerId,
      status: 'Còn trống',
      moderationStatus: 'approved',
    });

    // Giả lập 3 báo cáo từ cùng 1 người (cùng reporter_id)
    const sameReporterId = 'spammer_user_001';
    dbReports.push(
      {
        id: 'rep_same_1',
        reporter_id: sameReporterId,
        target_type: 'tin_dang',
        target_id: itemId,
        target_owner_id: sellerId,
        reason: 'lua_dao',
        status: 'moi',
      },
      {
        id: 'rep_same_2',
        reporter_id: sameReporterId,
        target_type: 'tin_dang',
        target_id: itemId,
        target_owner_id: sellerId,
        reason: 'sai_mo_ta',
        status: 'moi',
      },
      {
        id: 'rep_same_3',
        reporter_id: sameReporterId,
        target_type: 'tin_dang',
        target_id: itemId,
        target_owner_id: sellerId,
        reason: 'spam',
        status: 'dang_xu_ly',
      },
    );

    // Đánh giá auto-moderation
    const evaluation = evaluateAutoModeration(itemId, dbReports, AUTO_MODERATION_REPORT_THRESHOLD);
    assert.strictEqual(evaluation.distinctCount, 1, 'Số người báo cáo khác nhau phải là 1');
    assert.strictEqual(evaluation.shouldTrigger, false, '3 báo cáo từ 1 người KHÔNG được kích hoạt');

    // Tin đăng vẫn giữ nguyên trạng thái công khai
    const item = getMockMarketplaceItems().find((m) => m.id === itemId);
    assert.strictEqual(item.status, 'Còn trống');
    assert.strictEqual(item.moderationStatus, 'approved');

    // Tin vẫn hiển thị bình thường trên chợ
    const visibleItems = mockFilterMarketplaceItems([item], 'public');
    assert.strictEqual(visibleItems.length, 1, 'Tin vẫn xuất hiện trên chợ khi chưa đủ 3 người khác nhau báo cáo');

    // Không có thông báo xem xét lại nào gửi đi
    const notifs = getMockNotifications().filter((n) => n.userId === sellerId);
    assert.strictEqual(notifs.length, 0, 'Không gửi thông báo xem xét lại khi chưa đủ điều kiện');
  });

  // Test 23: 2 người khác nhau báo cáo KHÔNG kích hoạt (distinct = 2 < 3)
  await runTest('2 người khác nhau báo cáo KHÔNG kích hoạt tự chuyển tin chờ duyệt (distinct = 2 < 3)', async () => {
    clearReportsStorage();
    const itemId = 'item_two_reporters_test';
    const sellerId = 'seller_user_02';

    registerMockMarketplaceItem({
      id: itemId,
      name: 'Bàn học gấp gọn',
      userId: sellerId,
      status: 'Còn trống',
      moderationStatus: 'approved',
    });

    // Người thứ 1 gửi báo cáo
    await createReport({
      reporter_id: 'user_reporter_alpha',
      target_type: 'tin_dang',
      target_id: itemId,
      target_owner_id: sellerId,
      reason: 'sai_mo_ta',
    });

    // Người thứ 2 gửi báo cáo
    await createReport({
      reporter_id: 'user_reporter_beta',
      target_type: 'tin_dang',
      target_id: itemId,
      target_owner_id: sellerId,
      reason: 'spam',
    });

    const evaluation = evaluateAutoModeration(itemId, dbReports, AUTO_MODERATION_REPORT_THRESHOLD);
    assert.strictEqual(evaluation.distinctCount, 2);
    assert.strictEqual(evaluation.shouldTrigger, false);

    const item = getMockMarketplaceItems().find((m) => m.id === itemId);
    assert.strictEqual(item.status, 'Còn trống');
    assert.strictEqual(item.moderationStatus, 'approved');

    const visibleItems = mockFilterMarketplaceItems([item], 'public');
    assert.strictEqual(visibleItems.length, 1);
    assert.strictEqual(getMockNotifications().length, 0);
  });

  // Test 24: 3 người khác nhau báo cáo (trạng thái moi hoặc dang_xu_ly) KÍCH HOẠT tự chuyển tin về chờ duyệt và ẩn khỏi chợ
  await runTest('3 người khác nhau báo cáo KÍCH HOẠT chuyển tin về chờ duyệt, ẩn khỏi chợ và gửi thông báo', async () => {
    clearReportsStorage();
    const itemId = 'item_three_distinct_reporters';
    const sellerId = 'seller_user_03';

    registerMockMarketplaceItem({
      id: itemId,
      name: 'Tai nghe Bluetooth Sony',
      userId: sellerId,
      status: 'Còn trống',
      moderationStatus: 'approved',
    });

    // Người 1 báo cáo
    await createReport({
      reporter_id: 'reporter_01',
      target_type: 'tin_dang',
      target_id: itemId,
      target_owner_id: sellerId,
      reason: 'lua_dao',
    });

    // Người 2 báo cáo
    await createReport({
      reporter_id: 'reporter_02',
      target_type: 'tin_dang',
      target_id: itemId,
      target_owner_id: sellerId,
      reason: 'sai_mo_ta',
    });

    // Người 3 báo cáo -> Đạt ngưỡng 3 người khác nhau!
    const rep3 = await createReport({
      reporter_id: 'reporter_03',
      target_type: 'tin_dang',
      target_id: itemId,
      target_owner_id: sellerId,
      reason: 'khong_phu_hop',
    });

    assert.strictEqual(rep3.auto_moderated, true, 'Bản ghi báo cáo thứ 3 phải đánh dấu auto_moderated = true');

    // 1. Kiểm tra trạng thái tin đăng tự động chuyển sang Chờ duyệt lại
    const item = getMockMarketplaceItems().find((m) => m.id === itemId);
    assert.strictEqual(item.status, 'Chờ duyệt', 'Tin đăng phải chuyển về trạng thái Chờ duyệt');
    assert.strictEqual(item.moderationStatus, 'pending', 'Trạng thái kiểm duyệt phải là pending');

    // 2. Kiểm tra tin bị ẩn khỏi Chợ đồ cũ (filter public trả về rỗng)
    const publicItems = mockFilterMarketplaceItems([item], 'public');
    assert.strictEqual(publicItems.length, 0, 'Tin đăng phải tự động bị ẩn khỏi chợ đồ cũ');

    // 3. Kiểm tra gửi thông báo cho người đăng
    const notifications = getMockNotifications().filter((n) => n.userId === sellerId);
    assert.strictEqual(notifications.length, 1, 'Phải tạo chính xác 1 thông báo gửi cho người đăng tin');
    assert.strictEqual(notifications[0].title, 'Tin đăng đang được xem xét lại');
    assert.ok(
      notifications[0].body.toLowerCase().includes('tin đang được xem xét lại') ||
      notifications[0].body.toLowerCase().includes('đang được xem xét lại'),
      'Nội dung thông báo phải có cụm "tin đang được xem xét lại"'
    );
  });

  // Test 25: Báo cáo có trạng thái bac_bo hoặc da_xu_ly KHÔNG được tính vào ngưỡng 3 báo cáo
  await runTest('Báo cáo có trạng thái bac_bo hoặc da_xu_ly KHÔNG tính vào ngưỡng auto-moderation', async () => {
    clearReportsStorage();
    const itemId = 'item_status_filter_test';
    const sellerId = 'seller_user_04';

    registerMockMarketplaceItem({
      id: itemId,
      name: 'Quạt đứng Senko',
      userId: sellerId,
      status: 'Còn trống',
      moderationStatus: 'approved',
    });

    // Báo cáo 1: trạng thái moi (hợp lệ)
    dbReports.push({
      id: 'rep_valid_1',
      reporter_id: 'user_valid_1',
      target_type: 'tin_dang',
      target_id: itemId,
      status: 'moi',
    });

    // Báo cáo 2: trạng thái dang_xu_ly (hợp lệ)
    dbReports.push({
      id: 'rep_valid_2',
      reporter_id: 'user_valid_2',
      target_type: 'tin_dang',
      target_id: itemId,
      status: 'dang_xu_ly',
    });

    // Báo cáo 3: trạng thái bac_bo (bị bác bỏ, không được tính)
    dbReports.push({
      id: 'rep_dismissed_3',
      reporter_id: 'user_dismissed_3',
      target_type: 'tin_dang',
      target_id: itemId,
      status: 'bac_bo',
    });

    // Báo cáo 4: trạng thái da_xu_ly (đã duyệt/giải quyết xong, không tính)
    dbReports.push({
      id: 'rep_resolved_4',
      reporter_id: 'user_resolved_4',
      target_type: 'tin_dang',
      target_id: itemId,
      status: 'da_xu_ly',
    });

    const evaluation = evaluateAutoModeration(itemId, dbReports, AUTO_MODERATION_REPORT_THRESHOLD);
    assert.strictEqual(evaluation.distinctCount, 2, 'Chỉ tính 2 báo cáo có trạng thái moi hoặc dang_xu_ly');
    assert.strictEqual(evaluation.shouldTrigger, false, 'Chưa đủ 3 báo cáo hợp lệ nên không kích hoạt');
  });

  // Test 26: Ngưỡng kích hoạt dễ dàng cấu hình qua hằng số AUTO_MODERATION_REPORT_THRESHOLD
  await runTest('Ngưỡng AUTO_MODERATION_REPORT_THRESHOLD dễ dàng thay đổi và có hiệu lực ngay', async () => {
    clearReportsStorage();
    const itemId = 'item_custom_threshold_test';

    // Tạo 2 báo cáo từ 2 người khác nhau
    const customReports = [
      {
        id: 'rep_c1',
        reporter_id: 'user_custom_1',
        target_type: 'tin_dang',
        target_id: itemId,
        status: 'moi',
      },
      {
        id: 'rep_c2',
        reporter_id: 'user_custom_2',
        target_type: 'tin_dang',
        target_id: itemId,
        status: 'moi',
      },
    ];

    // Với ngưỡng mặc định = 3 -> distinct 2 < 3 -> shouldTrigger false
    const evalDefault = evaluateAutoModeration(itemId, customReports, AUTO_MODERATION_REPORT_THRESHOLD);
    assert.strictEqual(evalDefault.threshold, 3);
    assert.strictEqual(evalDefault.shouldTrigger, false);

    // Khi cấu hình ngưỡng = 2 -> distinct 2 >= 2 -> shouldTrigger true!
    const evalCustom2 = evaluateAutoModeration(itemId, customReports, 2);
    assert.strictEqual(evalCustom2.threshold, 2);
    assert.strictEqual(evalCustom2.shouldTrigger, true);

    // Khi cấu hình ngưỡng = 5 -> distinct 2 < 5 -> shouldTrigger false
    const evalCustom5 = evaluateAutoModeration(itemId, customReports, 5);
    assert.strictEqual(evalCustom5.threshold, 5);
    assert.strictEqual(evalCustom5.shouldTrigger, false);
  });

  // Test 27 (Điểm 1): So khớp giá trị ngưỡng giữa TypeScript code và Migration PostgreSQL
  await runTest('So khớp ngưỡng AUTO_MODERATION_REPORT_THRESHOLD và c_auto_moderation_threshold trong migration SQL', async () => {
    const migrationPath = path.resolve('supabase/migrations/023_auto_moderation_reported_items.sql');
    assert.ok(fs.existsSync(migrationPath), 'File migration 023 phải tồn tại');

    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const match = migrationContent.match(/c_auto_moderation_threshold\s+CONSTANT\s+INTEGER\s*:=\s*(\d+);/i);
    assert.ok(match, 'Phải tìm thấy khai báo hằng số c_auto_moderation_threshold trong file SQL');

    const sqlThreshold = parseInt(match[1], 10);
    assert.strictEqual(
      AUTO_MODERATION_REPORT_THRESHOLD,
      sqlThreshold,
      `Hằng số TypeScript (${AUTO_MODERATION_REPORT_THRESHOLD}) phải khớp hoàn toàn với hằng số PostgreSQL (${sqlThreshold})`
    );
  });

  // Test 28 (Điểm 2): Khi admin bác bỏ bớt báo cáo khiến số lượng tụt dưới ngưỡng -> Tin KHÔNG tự khôi phục
  await runTest('Admin bác bỏ bớt báo cáo khiến số lượng tụt dưới ngưỡng -> Tin KHÔNG tự khôi phục', async () => {
    clearReportsStorage();
    const itemId = 'item_no_auto_restore_test';
    const sellerId = 'seller_user_dismiss_test';

    registerMockMarketplaceItem({
      id: itemId,
      name: 'Nồi chiên không dầu Philips',
      userId: sellerId,
      status: 'Còn trống',
      moderationStatus: 'approved',
    });

    // 3 người khác nhau gửi báo cáo -> Kích hoạt tự ẩn
    const r1 = await createReport({ reporter_id: 'user_rep_1', target_type: 'tin_dang', target_id: itemId, target_owner_id: sellerId, reason: 'lua_dao' });
    const r2 = await createReport({ reporter_id: 'user_rep_2', target_type: 'tin_dang', target_id: itemId, target_owner_id: sellerId, reason: 'sai_mo_ta' });
    const r3 = await createReport({ reporter_id: 'user_rep_3', target_type: 'tin_dang', target_id: itemId, target_owner_id: sellerId, reason: 'spam' });

    const itemAfterReports = getMockMarketplaceItems().find((m) => m.id === itemId);
    assert.strictEqual(itemAfterReports.status, 'Chờ duyệt', 'Tin phải ở trạng thái Chờ duyệt');
    assert.strictEqual(itemAfterReports.moderationStatus, 'pending');

    // Admin bác bỏ 1 báo cáo (r1 chuyển sang 'bac_bo')
    updateReportStatus(r1.id, 'bac_bo', 'Báo cáo không đúng sự thật sau khi kiểm tra');

    // Số báo cáo hợp lệ tụt xuống còn 2 (< 3)
    const evalAfterDismiss = evaluateAutoModeration(itemId, dbReports, AUTO_MODERATION_REPORT_THRESHOLD);
    assert.strictEqual(evalAfterDismiss.distinctCount, 2, 'Số báo cáo hợp lệ còn 2');
    assert.strictEqual(evalAfterDismiss.shouldTrigger, false);

    // Xác nhận: Tin KHÔNG ĐƯỢC TỰ KHÔI PHỤC, vẫn giữ nguyên trạng thái Chờ duyệt
    const itemAfterDismiss = getMockMarketplaceItems().find((m) => m.id === itemId);
    assert.strictEqual(itemAfterDismiss.status, 'Chờ duyệt', 'Tin vẫn phải ở trạng thái Chờ duyệt, KHÔNG tự khôi phục');
    assert.strictEqual(itemAfterDismiss.moderationStatus, 'pending', 'moderationStatus vẫn phải là pending');

    // Tin vẫn bị ẩn khỏi chợ
    const visibleOnMarket = mockFilterMarketplaceItems([itemAfterDismiss], 'public');
    assert.strictEqual(visibleOnMarket.length, 0, 'Tin vẫn phải bị ẩn khỏi chợ đồ cũ');

    // Chỉ khi Admin chủ động bấm duyệt lại thủ công thì tin mới được khôi phục
    approveMarketplaceItemMock(itemId);
    const itemAfterAdminApprove = getMockMarketplaceItems().find((m) => m.id === itemId);
    assert.strictEqual(itemAfterAdminApprove.status, 'Còn trống', 'Chỉ khôi phục khi Admin duyệt lại thủ công');
    assert.strictEqual(itemAfterAdminApprove.moderationStatus, 'approved');
  });

  // Test 29 (Điểm 3): Tin đã bị tự ẩn rồi, nhận thêm báo cáo thứ 4, 5 -> Không ẩn lại và không gửi thông báo trùng
  await runTest('Tin đã bị tự ẩn rồi, nhận thêm báo cáo thứ 4, 5 -> Không gửi thông báo trùng cho người đăng', async () => {
    clearReportsStorage();
    const itemId = 'item_no_duplicate_notifications';
    const sellerId = 'seller_user_duplicate_test';

    registerMockMarketplaceItem({
      id: itemId,
      name: 'Bàn phím cơ DareU',
      userId: sellerId,
      status: 'Còn trống',
      moderationStatus: 'approved',
    });

    // Báo cáo 1, 2, 3 -> Kích hoạt tự ẩn
    await createReport({ reporter_id: 'user_u1', target_type: 'tin_dang', target_id: itemId, target_owner_id: sellerId, reason: 'lua_dao' });
    await createReport({ reporter_id: 'user_u2', target_type: 'tin_dang', target_id: itemId, target_owner_id: sellerId, reason: 'sai_mo_ta' });
    await createReport({ reporter_id: 'user_u3', target_type: 'tin_dang', target_id: itemId, target_owner_id: sellerId, reason: 'spam' });

    // Lúc này đã có chính xác 1 thông báo được tạo
    const notifsAfter3 = getMockNotifications().filter((n) => n.userId === sellerId);
    assert.strictEqual(notifsAfter3.length, 1, 'Sau 3 báo cáo đầu tiên chỉ có 1 thông báo');

    // Nhận thêm báo cáo thứ 4 từ user khác
    await createReport({ reporter_id: 'user_u4', target_type: 'tin_dang', target_id: itemId, target_owner_id: sellerId, reason: 'khong_phu_hop' });

    // Nhận thêm báo cáo thứ 5 từ user khác
    await createReport({ reporter_id: 'user_u5', target_type: 'tin_dang', target_id: itemId, target_owner_id: sellerId, reason: 'khac', description: 'Nghi vấn lừa đảo cọc' });

    // Số lượng thông báo gửi cho người bán VẪN CHỈ LÀ 1 (không gửi thông báo trùng lặp)
    const notifsAfter5 = getMockNotifications().filter((n) => n.userId === sellerId);
    assert.strictEqual(notifsAfter5.length, 1, 'Không gửi thông báo trùng lặp khi có báo cáo thứ 4, 5');

    // Trạng thái tin vẫn là Chờ duyệt
    const itemFinal = getMockMarketplaceItems().find((m) => m.id === itemId);
    assert.strictEqual(itemFinal.status, 'Chờ duyệt');
    assert.strictEqual(itemFinal.moderationStatus, 'pending');
  });

  // Test 30 (Điểm 4): Người đăng có tin bị tự ẩn: Thông báo dẫn thẳng tới tin đó kèm ?edit=true và nút sửa tin
  await runTest('Thông báo dẫn thẳng tới tin đăng kèm ?edit=true và nút Sửa tin & gửi duyệt lại', async () => {
    clearReportsStorage();
    const itemId = 'item_edit_flow_test';
    const sellerId = 'seller_user_edit_flow';

    registerMockMarketplaceItem({
      id: itemId,
      name: 'Giáo trình Giải tích 1',
      userId: sellerId,
      status: 'Còn trống',
      moderationStatus: 'approved',
    });

    // 3 báo cáo kích hoạt auto-moderation
    await createReport({ reporter_id: 'user_e1', target_type: 'tin_dang', target_id: itemId, target_owner_id: sellerId, reason: 'lua_dao' });
    await createReport({ reporter_id: 'user_e2', target_type: 'tin_dang', target_id: itemId, target_owner_id: sellerId, reason: 'sai_mo_ta' });
    await createReport({ reporter_id: 'user_e3', target_type: 'tin_dang', target_id: itemId, target_owner_id: sellerId, reason: 'spam' });

    const notifs = getMockNotifications().filter((n) => n.userId === sellerId);
    assert.strictEqual(notifs.length, 1);
    
    // Kiểm tra ctaUrl có tham số ?edit=true
    assert.strictEqual(notifs[0].ctaUrl, `/cho-do-cu/${itemId}?edit=true`, 'Đường dẫn ctaUrl phải dẫn thẳng tới tin và kèm ?edit=true');
    assert.strictEqual(notifs[0].ctaLabel, 'Sửa tin & gửi duyệt lại', 'Nhãn nút phải là "Sửa tin & gửi duyệt lại"');
  });

  // ==============================================================
  // TỔNG KẾT
  // ==============================================================
  console.log('\n========================================');
  console.log(`KẾT QUẢ TEST BÁO CÁO: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('========================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAllReportTests().catch((err) => {
  console.error('Lỗi nghiêm trọng khi chạy test suite báo cáo:', err);
  process.exit(1);
});
