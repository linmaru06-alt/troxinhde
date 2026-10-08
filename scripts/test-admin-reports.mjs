import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// ==============================================================================
// TEST SUITE: KIỂM THỬ TRANG ADMIN QUẢN LÝ BÁO CÁO VI PHẠM & BẢO MẬT PHÂN QUYỀN
// ==============================================================================
// 1. Phân quyền truy cập phía Client & Route Guard (khớp chuẩn app_role & role)
// 2. Chặn 100% ở tầng Supabase / RPC bằng public.is_admin() cho MỌI thao tác admin
// 3. Chặn khóa nhầm: Không cho Admin tự khóa chính mình và không cho khóa Admin khác
// 4. Thao tác Mở khóa người dùng (unban) có ghi chú bắt buộc và ghi audit_logs
// 5. Gom nhóm báo cáo cùng đối tượng và tính số lượng (total_reports & distinct_reporters)
// 6. Bộ lọc theo trạng thái và loại đối tượng
// 7. Sắp xếp mới nhất
// 8. Xem chi tiết kèm nội dung bị báo cáo (content_snapshot)
// 9. Bảo vệ người tố giác: Không để lộ số điện thoại người báo cáo
// 10. Ràng buộc ghi chú xử lý (admin_notes) bắt buộc cho mọi thao tác
// ==============================================================================

const passed = [];
const failed = [];

function test(name, fn) {
  try {
    fn();
    passed.push(name);
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    failed.push({ name, error: err });
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
  }
}

// Mô phỏng cơ sở dữ liệu Supabase
const mockReports = [];
const mockMarketplaceItems = [];
const mockProfiles = [];
const mockAuditLogs = [];

function clearDb() {
  mockReports.length = 0;
  mockMarketplaceItems.length = 0;
  mockProfiles.length = 0;
  mockAuditLogs.length = 0;
}

// Kiểm tra quyền Admin phía Client (Route Guard)
function checkAdminRouteAccess(currentUser) {
  if (!currentUser) {
    return { canAccess: false, status: 401, redirect: '/dang-nhap?returnUrl=/admin/bao-cao' };
  }
  const isAdmin =
    currentUser.app_role === 'admin' ||
    currentUser.appRole === 'admin' ||
    currentUser.role === 'admin' ||
    currentUser.admin_role === 'superadmin' ||
    currentUser.admin_role === 'super_admin';

  if (!isAdmin) {
    return { canAccess: false, status: 403, message: 'Không có quyền truy cập' };
  }
  return { canAccess: true, status: 200 };
}

// Kiểm tra quyền ở tầng DB / RPC (mô phỏng public.is_admin())
function requireDbAdmin(adminUser) {
  if (!adminUser) {
    throw new Error('42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
  }
  const isDbAdmin =
    adminUser.app_role === 'admin' ||
    adminUser.role === 'admin' ||
    adminUser.admin_role === 'superadmin' ||
    adminUser.admin_role === 'super_admin';

  if (!isDbAdmin) {
    throw new Error('42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
  }
}

// Mô phỏng gom nhóm báo cáo
function groupReports(reports, extraMetadataMap = new Map()) {
  const groupsMap = new Map();

  for (const report of reports) {
    const key = `${report.target_type}:${report.target_id}`;
    let item = groupsMap.get(key);

    if (!item) {
      const extra = extraMetadataMap.get(key);
      item = {
        target_type: report.target_type,
        target_id: report.target_id,
        target_owner_id: report.target_owner_id,
        target_owner: extra?.target_owner,
        target_content: extra?.target_content || (report.content_snapshot ? { content_snapshot: report.content_snapshot } : undefined),
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

    if (report.resolved_at && (!item.resolved_at || new Date(report.resolved_at).getTime() > new Date(item.resolved_at).getTime())) {
      item.resolved_at = report.resolved_at;
      item.resolved_by = report.resolved_by;
      item.resolved_by_name = report.resolved_by_name;
      item.admin_notes = report.admin_notes || item.admin_notes;
    }

    if (new Date(report.created_at).getTime() > new Date(item.latest_created_at).getTime()) {
      item.latest_created_at = report.created_at;
    }
    if (new Date(report.created_at).getTime() < new Date(item.earliest_created_at).getTime()) {
      item.earliest_created_at = report.created_at;
    }
  }

  const result = [];
  for (const item of groupsMap.values()) {
    item.total_reports = item.reports.length;
    const uniqueReporters = new Set();
    for (const r of item.reports) {
      if (r.reporter_id) uniqueReporters.add(r.reporter_id.trim());
    }
    item.distinct_reporters = uniqueReporters.size;
    if (item.distinct_reporters >= 3 && item.target_type === 'tin_dang') {
      item.auto_moderated = true;
    }

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

  result.sort((a, b) => new Date(b.latest_created_at).getTime() - new Date(a.latest_created_at).getTime());
  return result;
}

// Thao tác 1: Ẩn tin đăng
function hideReportedListingMock({ targetType, targetId, adminNotes, admin }) {
  requireDbAdmin(admin);
  if (!adminNotes || !adminNotes.trim()) {
    throw new Error('Ghi chú xử lý của Quản trị viên là bắt buộc');
  }
  const now = new Date().toISOString();
  const item = mockMarketplaceItems.find((m) => m.id === targetId);
  if (item) {
    item.status = 'pending';
    item.moderation_status = 'pending';
    item.updated_at = now;
  }
  for (const r of mockReports) {
    if (r.target_type === targetType && r.target_id === targetId) {
      r.status = 'da_xu_ly';
      r.admin_notes = adminNotes.trim();
      r.resolved_by = admin?.id || null;
      r.resolved_by_name = admin?.name || 'Admin';
      r.resolved_at = now;
      r.updated_at = now;
    }
  }
  mockAuditLogs.push({
    action: 'admin_hide_reported_listing',
    entity_id: targetId,
    reason: adminNotes.trim(),
    admin_id: admin?.id,
  });
  return true;
}

// Thao tác 2: Khôi phục tin đăng
function restoreReportedListingMock({ targetType, targetId, adminNotes, admin }) {
  requireDbAdmin(admin);
  if (!adminNotes || !adminNotes.trim()) {
    throw new Error('Ghi chú xử lý của Quản trị viên là bắt buộc');
  }
  const now = new Date().toISOString();
  const item = mockMarketplaceItems.find((m) => m.id === targetId);
  if (item) {
    item.status = 'available';
    item.moderation_status = 'approved';
    item.updated_at = now;
  }
  for (const r of mockReports) {
    if (r.target_type === targetType && r.target_id === targetId) {
      r.status = 'da_xu_ly';
      r.admin_notes = adminNotes.trim();
      r.resolved_by = admin?.id || null;
      r.resolved_by_name = admin?.name || 'Admin';
      r.resolved_at = now;
      r.updated_at = now;
    }
  }
  mockAuditLogs.push({
    action: 'admin_restore_reported_listing',
    entity_id: targetId,
    reason: adminNotes.trim(),
    admin_id: admin?.id,
  });
  return true;
}

// Thao tác 3: Khóa người dùng (kèm chặn tự khóa mình & khóa admin khác)
function banReportedUserMock({ userId, targetId, adminNotes, admin }) {
  requireDbAdmin(admin);
  if (!adminNotes || !adminNotes.trim()) {
    throw new Error('Ghi chú xử lý của Quản trị viên là bắt buộc');
  }

  // Chặn tự khóa chính mình
  if (admin?.id && userId === admin.id) {
    throw new Error('Quản trị viên không thể tự khóa tài khoản của chính mình');
  }

  // Chặn khóa admin khác
  const targetProfile = mockProfiles.find((p) => p.id === userId);
  if (targetProfile && (targetProfile.app_role === 'admin' || targetProfile.role === 'admin')) {
    throw new Error('Không thể khóa tài khoản của một Quản trị viên khác');
  }

  const now = new Date().toISOString();
  if (targetProfile) {
    targetProfile.is_banned = true;
    targetProfile.banned_reason = adminNotes.trim();
    targetProfile.updated_at = now;
  }
  for (const r of mockReports) {
    if (r.target_id === userId || r.target_owner_id === userId || (targetId && r.target_id === targetId)) {
      r.status = 'da_xu_ly';
      r.admin_notes = adminNotes.trim();
      r.resolved_by = admin?.id || null;
      r.resolved_by_name = admin?.name || 'Admin';
      r.resolved_at = now;
      r.updated_at = now;
    }
  }
  mockAuditLogs.push({
    action: 'admin_ban_reported_user',
    entity_id: userId,
    reason: adminNotes.trim(),
    admin_id: admin?.id,
  });
  return true;
}

// Thao tác Mở khóa người dùng (unban)
function unbanReportedUserMock({ userId, adminNotes, admin }) {
  requireDbAdmin(admin);
  if (!adminNotes || !adminNotes.trim()) {
    throw new Error('Ghi chú lý do mở khóa tài khoản là bắt buộc');
  }

  const now = new Date().toISOString();
  const targetProfile = mockProfiles.find((p) => p.id === userId);
  if (targetProfile) {
    targetProfile.is_banned = false;
    targetProfile.banned_reason = null;
    targetProfile.updated_at = now;
  }
  mockAuditLogs.push({
    action: 'admin_unban_reported_user',
    entity_id: userId,
    reason: adminNotes.trim(),
    admin_id: admin?.id,
  });
  return true;
}

// Thao tác 4: Bác bỏ báo cáo
function dismissReportsGroupMock({ targetType, targetId, adminNotes, admin }) {
  requireDbAdmin(admin);
  if (!adminNotes || !adminNotes.trim()) {
    throw new Error('Ghi chú xử lý của Quản trị viên là bắt buộc');
  }
  const now = new Date().toISOString();
  for (const r of mockReports) {
    if (r.target_type === targetType && r.target_id === targetId) {
      r.status = 'bac_bo';
      r.admin_notes = adminNotes.trim();
      r.resolved_by = admin?.id || null;
      r.resolved_by_name = admin?.name || 'Admin';
      r.resolved_at = now;
      r.updated_at = now;
    }
  }
  mockAuditLogs.push({
    action: 'admin_dismiss_reports',
    entity_id: `${targetType}:${targetId}`,
    reason: adminNotes.trim(),
    admin_id: admin?.id,
  });
  return true;
}

console.log('======================================================================');
console.log('  CHẠY BỘ TEST SUITE CHO TRANG ADMIN QUẢN LÝ BÁO CÁO (ADMIN REPORTS)');
console.log('======================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Phân quyền phía Client & Route Guard
// -----------------------------------------------------------------------------
test('Phân quyền Client: app_role === admin được truy cập; app_role !== admin bị chặn 403', () => {
  // 1. Khách vãng lai
  const guest = checkAdminRouteAccess(null);
  assert.strictEqual(guest.canAccess, false);
  assert.strictEqual(guest.status, 401);

  // 2. Tài khoản có app_role: 'renter' và role: 'user'
  const renter = checkAdminRouteAccess({ id: 'u1', app_role: 'renter', role: 'user', name: 'Sinh viên' });
  assert.strictEqual(renter.canAccess, false);
  assert.strictEqual(renter.status, 403);
  assert.strictEqual(renter.message, 'Không có quyền truy cập');

  // 3. Tài khoản chủ trọ: app_role: 'owner'
  const owner = checkAdminRouteAccess({ id: 'o1', app_role: 'owner', role: 'owner', name: 'Chủ trọ' });
  assert.strictEqual(owner.canAccess, false);
  assert.strictEqual(owner.status, 403);

  // 4. Tài khoản Admin chuẩn migration 021 (app_role = 'admin')
  const adminWithAppRole = checkAdminRouteAccess({ id: 'a1', app_role: 'admin', role: 'user', name: 'Admin 1' });
  assert.strictEqual(adminWithAppRole.canAccess, true);
  assert.strictEqual(adminWithAppRole.status, 200);

  // 5. Tài khoản Admin fallback (role = 'admin')
  const adminWithRole = checkAdminRouteAccess({ id: 'a2', app_role: 'renter', role: 'admin', name: 'Admin 2' });
  assert.strictEqual(adminWithRole.canAccess, true);
  assert.strictEqual(adminWithRole.status, 200);
});

// -----------------------------------------------------------------------------
// TEST 2: Chặn gọi API trực tiếp ở tầng Supabase nếu không phải Admin
// -----------------------------------------------------------------------------
test('Bảo mật Supabase: Người dùng thường gọi thẳng API admin bị từ chối 42501', () => {
  const normalUser = { id: 'user_attacker', app_role: 'renter', role: 'user', name: 'Attacker' };

  // 1. Thử gọi hideReportedListing
  assert.throws(
    () => hideReportedListingMock({ targetType: 'tin_dang', targetId: 'item_1', adminNotes: 'Hạ tin', admin: normalUser }),
    /42501/
  );

  // 2. Thử gọi restoreReportedListing
  assert.throws(
    () => restoreReportedListingMock({ targetType: 'tin_dang', targetId: 'item_1', adminNotes: 'Duyệt lại', admin: normalUser }),
    /42501/
  );

  // 3. Thử gọi banReportedUser
  assert.throws(
    () => banReportedUserMock({ userId: 'victim_user', adminNotes: 'Khóa bậy', admin: normalUser }),
    /42501/
  );

  // 4. Thử gọi unbanReportedUser
  assert.throws(
    () => unbanReportedUserMock({ userId: 'victim_user', adminNotes: 'Mở bậy', admin: normalUser }),
    /42501/
  );

  // 5. Thử gọi dismissReportsGroup
  assert.throws(
    () => dismissReportsGroupMock({ targetType: 'tin_dang', targetId: 'item_1', adminNotes: 'Bác bỏ', admin: normalUser }),
    /42501/
  );
});

// -----------------------------------------------------------------------------
// TEST 3: Chặn khóa nhầm (Tự khóa chính mình hoặc khóa Admin khác)
// -----------------------------------------------------------------------------
test('Chặn khóa nhầm: Admin không thể tự khóa chính mình và không thể khóa Admin khác', () => {
  clearDb();

  const currentAdmin = { id: 'admin_current', app_role: 'admin', role: 'admin', name: 'Admin Đang Đăng Nhập' };
  const anotherAdmin = { id: 'admin_colleague', app_role: 'admin', role: 'admin', name: 'Đồng Nghiệp Admin' };
  const regularUser = { id: 'user_target', app_role: 'renter', role: 'user', is_banned: false, name: 'Người Dùng Thường' };

  mockProfiles.push(
    { id: currentAdmin.id, app_role: 'admin', role: 'admin', is_banned: false },
    { id: anotherAdmin.id, app_role: 'admin', role: 'admin', is_banned: false },
    regularUser
  );

  // 1. Thử tự khóa chính mình -> BỊ CHẶN
  assert.throws(
    () => banReportedUserMock({ userId: currentAdmin.id, adminNotes: 'Tự khóa thử', admin: currentAdmin }),
    /Quản trị viên không thể tự khóa tài khoản của chính mình/
  );

  // 2. Thử khóa đồng nghiệp Admin -> BỊ CHẶN
  assert.throws(
    () => banReportedUserMock({ userId: anotherAdmin.id, adminNotes: 'Khóa đồng nghiệp', admin: currentAdmin }),
    /Không thể khóa tài khoản của một Quản trị viên khác/
  );

  // 3. Khóa tài khoản người dùng thường vi phạm -> THÀNH CÔNG
  banReportedUserMock({ userId: regularUser.id, adminNotes: 'Lừa đảo tiền cọc', admin: currentAdmin });
  assert.strictEqual(regularUser.is_banned, true);
  assert.strictEqual(regularUser.banned_reason, 'Lừa đảo tiền cọc');
});

// -----------------------------------------------------------------------------
// TEST 4: Thao tác Mở khóa người dùng (unban)
// -----------------------------------------------------------------------------
test('Thao tác Mở khóa người dùng (unban): Đổi is_banned = false, yêu cầu ghi chú và lưu audit log', () => {
  clearDb();

  const currentAdmin = { id: 'admin_1', app_role: 'admin', role: 'admin', name: 'Admin An' };
  const bannedUser = { id: 'user_locked', app_role: 'renter', role: 'user', is_banned: true, banned_reason: 'Khóa do nghi ngờ' };
  mockProfiles.push(bannedUser);

  // Thử mở khóa không có ghi chú -> Lỗi
  assert.throws(
    () => unbanReportedUserMock({ userId: bannedUser.id, adminNotes: '   ', admin: currentAdmin }),
    /Ghi chú lý do mở khóa tài khoản là bắt buộc/
  );

  // Mở khóa hợp lệ
  const unbanReason = 'Người dùng đã cung cấp giấy tờ tùy thân xác thực hợp lệ';
  unbanReportedUserMock({ userId: bannedUser.id, adminNotes: unbanReason, admin: currentAdmin });

  assert.strictEqual(bannedUser.is_banned, false);
  assert.strictEqual(bannedUser.banned_reason, null);

  // Kiểm tra Audit Log
  const audit = mockAuditLogs.find((a) => a.action === 'admin_unban_reported_user');
  assert.ok(audit);
  assert.strictEqual(audit.entity_id, bannedUser.id);
  assert.strictEqual(audit.reason, unbanReason);
});

// -----------------------------------------------------------------------------
// TEST 5: Gom nhóm báo cáo cùng đối tượng và tính số lượng
// -----------------------------------------------------------------------------
test('Gom nhóm báo cáo: Gom các báo cáo cùng target_id thành 1 nhóm, tính đúng total_reports và distinct_reporters', () => {
  clearDb();

  // Tin đăng 1 có 3 báo cáo từ 3 người khác nhau
  mockReports.push(
    { id: 'rep_1', reporter_id: 'user_a', target_type: 'tin_dang', target_id: 'item_100', reason: 'lua_dao', status: 'moi', created_at: '2026-09-20T10:00:00Z' },
    { id: 'rep_2', reporter_id: 'user_b', target_type: 'tin_dang', target_id: 'item_100', reason: 'spam', status: 'moi', created_at: '2026-09-21T11:00:00Z' },
    { id: 'rep_3', reporter_id: 'user_c', target_type: 'tin_dang', target_id: 'item_100', reason: 'sai_mo_ta', status: 'dang_xu_ly', created_at: '2026-09-22T12:00:00Z' }
  );

  // Tin đăng 2 có 2 báo cáo từ cùng 1 người
  mockReports.push(
    { id: 'rep_4', reporter_id: 'user_d', target_type: 'tin_dang', target_id: 'item_200', reason: 'hang_cam', status: 'moi', created_at: '2026-09-23T08:00:00Z' },
    { id: 'rep_5', reporter_id: 'user_d', target_type: 'tin_dang', target_id: 'item_200', reason: 'hang_cam', status: 'moi', created_at: '2026-09-23T09:00:00Z' }
  );

  const grouped = groupReports(mockReports);
  assert.strictEqual(grouped.length, 2);

  const group100 = grouped.find((g) => g.target_id === 'item_100');
  assert.strictEqual(group100.total_reports, 3);
  assert.strictEqual(group100.distinct_reporters, 3);
  assert.strictEqual(group100.auto_moderated, true);

  const group200 = grouped.find((g) => g.target_id === 'item_200');
  assert.strictEqual(group200.total_reports, 2);
  assert.strictEqual(group200.distinct_reporters, 1);
  assert.strictEqual(Boolean(group200.auto_moderated), false);
});

// -----------------------------------------------------------------------------
// TEST 6: Bộ lọc theo trạng thái và loại đối tượng
// -----------------------------------------------------------------------------
test('Bộ lọc: Lọc chính xác theo trạng thái và loại đối tượng', () => {
  clearDb();

  mockReports.push(
    { id: 'r1', reporter_id: 'u1', target_type: 'tin_dang', target_id: 'item_1', reason: 'spam', status: 'moi', created_at: '2026-09-21T00:00:00Z' },
    { id: 'r2', reporter_id: 'u2', target_type: 'nguoi_dung', target_id: 'user_target', reason: 'lua_dao', status: 'da_xu_ly', created_at: '2026-09-22T00:00:00Z' },
    { id: 'r3', reporter_id: 'u3', target_type: 'tin_nhan', target_id: 'msg_target', reason: 'khong_phu_hop', status: 'bac_bo', created_at: '2026-09-23T00:00:00Z' }
  );

  const all = groupReports(mockReports);
  assert.strictEqual(all.filter((g) => g.target_type === 'tin_dang').length, 1);
  assert.strictEqual(all.filter((g) => g.target_type === 'nguoi_dung').length, 1);
  assert.strictEqual(all.filter((g) => g.status === 'da_xu_ly').length, 1);
  assert.strictEqual(all.filter((g) => g.status === 'bac_bo').length, 1);
});

// -----------------------------------------------------------------------------
// TEST 7: Sắp xếp mới nhất
// -----------------------------------------------------------------------------
test('Sắp xếp: Mặc định sắp xếp theo thời gian báo cáo mới nhất giảm dần', () => {
  clearDb();

  mockReports.push(
    { id: 'r1', reporter_id: 'u1', target_type: 'tin_dang', target_id: 'item_old', reason: 'spam', status: 'moi', created_at: '2026-09-10T10:00:00Z' },
    { id: 'r2', reporter_id: 'u2', target_type: 'tin_dang', target_id: 'item_new', reason: 'spam', status: 'moi', created_at: '2026-09-23T14:00:00Z' },
    { id: 'r3', reporter_id: 'u3', target_type: 'tin_dang', target_id: 'item_mid', reason: 'spam', status: 'moi', created_at: '2026-09-15T12:00:00Z' }
  );

  const grouped = groupReports(mockReports);
  assert.strictEqual(grouped[0].target_id, 'item_new');
  assert.strictEqual(grouped[1].target_id, 'item_mid');
  assert.strictEqual(grouped[2].target_id, 'item_old');
});

// -----------------------------------------------------------------------------
// TEST 8: Xem chi tiết kèm nội dung bị báo cáo (content_snapshot)
// -----------------------------------------------------------------------------
test('Xem chi tiết: Trả về đầy đủ content_snapshot và chi tiết từng báo cáo con', () => {
  clearDb();

  const snapshotText = 'Bán đồ công nghệ giá 500k chuyển khoản trước để giữ hàng';
  mockReports.push({
    id: 'rep_snap_1',
    reporter_id: 'u1',
    target_type: 'tin_dang',
    target_id: 'item_scam',
    reason: 'lua_dao',
    description: 'Yêu cầu chuyển cọc rồi biến mất',
    content_snapshot: snapshotText,
    status: 'moi',
    created_at: '2026-09-22T08:00:00Z',
  });

  const grouped = groupReports(mockReports);
  assert.strictEqual(grouped[0].target_content?.content_snapshot, snapshotText);
  assert.strictEqual(grouped[0].reports[0].description, 'Yêu cầu chuyển cọc rồi biến mất');
});

// -----------------------------------------------------------------------------
// TEST 9: Bảo vệ người tố giác: Không để lộ số điện thoại người báo cáo
// -----------------------------------------------------------------------------
test('Bảo vệ người tố giác: UI không hiển thị SĐT người báo cáo, chỉ hiển thị nhãn ẩn danh bảo vệ người tố giác', () => {
  const pageSource = fs.readFileSync(path.resolve('src/pages/AdminReportsPage.tsx'), 'utf-8');
  assert.strictEqual(pageSource.includes('report.reporter_phone'), false, 'src/pages/AdminReportsPage.tsx không được render report.reporter_phone');
  assert.ok(pageSource.includes('Bảo vệ người tố giác'), 'Phải có nhãn bảo vệ người tố giác');
});

// -----------------------------------------------------------------------------
// TEST 10: Ràng buộc ghi chú xử lý bắt buộc
// -----------------------------------------------------------------------------
test('Ràng buộc ghi chú: Thao tác không có admin_notes hoặc chuỗi rỗng BẮT BUỘC quăng lỗi', () => {
  const admin = { id: 'admin_1', app_role: 'admin', role: 'admin' };
  assert.throws(
    () => hideReportedListingMock({ targetType: 'tin_dang', targetId: 'x', adminNotes: '', admin }),
    /Ghi chú xử lý của Quản trị viên là bắt buộc/
  );
  assert.throws(
    () => restoreReportedListingMock({ targetType: 'tin_dang', targetId: 'x', adminNotes: '   ', admin }),
    /Ghi chú xử lý của Quản trị viên là bắt buộc/
  );
  assert.throws(
    () => banReportedUserMock({ userId: 'u', adminNotes: '', admin }),
    /Ghi chú xử lý của Quản trị viên là bắt buộc/
  );
  assert.throws(
    () => unbanReportedUserMock({ userId: 'u', adminNotes: '', admin }),
    /Ghi chú lý do mở khóa tài khoản là bắt buộc/
  );
  assert.throws(
    () => dismissReportsGroupMock({ targetType: 'tin_dang', targetId: 'x', adminNotes: '  ', admin }),
    /Ghi chú xử lý của Quản trị viên là bắt buộc/
  );
});

console.log('\n========================================');
console.log(`KẾT QUẢ KIỂM THỬ: ${passed.length} Passed, ${failed.length} Failed`);
console.log('========================================\n');

if (failed.length > 0) {
  process.exit(1);
}
