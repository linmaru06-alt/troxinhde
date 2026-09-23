import assert from 'node:assert';

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

// Bộ nhớ mô phỏng Database cho Báo cáo
const dbReports = [];

export function clearReportsStorage() {
  dbReports.length = 0;
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

  return {
    reporterId,
    targetType,
    targetId: rawTargetId,
    targetOwnerId,
    reason,
    description: description || undefined,
  };
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
    status: 'moi',
    reporter_name: payload.reporter_name,
    reporter_phone: payload.reporter_phone,
    created_at: currentTime,
    updated_at: currentTime,
  };

  dbReports.push(reportRecord);
  return reportRecord;
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
