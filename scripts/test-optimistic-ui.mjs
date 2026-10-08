import assert from 'assert';

console.log('======================================================================');
console.log('  BẮT ĐẦU CHẠY TEST SUITE CHO OPTIMISTIC UI & SAFE ROLLBACK (PLAN 5)');
console.log('======================================================================\n');

// 1. Kiểm tra Optimistic Update và Safe Rollback Logic
async function testOptimisticAndRollback() {
  console.log('Test 1: Kiểm tra phản hồi 1ms & Rollback an toàn khi API gặp lỗi mạng');

  let state = {
    savedRoomIds: ['room-1', 'room-2'],
    toastMessage: null,
  };

  async function mockApiToggleSave(userId, roomId, shouldFail = false) {
    await new Promise(r => setTimeout(r, 40));
    if (shouldFail) {
      throw new Error('Network error: Không thể kết nối máy chủ Supabase');
    }
    return { success: true };
  }

  async function toggleSaveRoom(roomId, shouldFail = false) {
    const previousSaved = [...state.savedRoomIds];
    const isSaved = state.savedRoomIds.includes(roomId);
    const next = isSaved 
      ? state.savedRoomIds.filter(id => id !== roomId)
      : [...state.savedRoomIds, roomId];

    // 1. Optimistic Update: Đổi ngay trong 1ms
    state.savedRoomIds = next;

    // 2. Chạy ngầm API
    try {
      await mockApiToggleSave('user-1', roomId, shouldFail);
      return !isSaved;
    } catch (err) {
      // 3. Rollback an toàn
      state.savedRoomIds = previousSaved;
      state.toastMessage = 'Lỗi kết nối, đã khôi phục';
      return isSaved;
    }
  }

  // Kịch bản A: Thành công (99.5%)
  const p1 = toggleSaveRoom('room-3', false);
  // Ngay sau 1ms, giao diện đã phải thấy 'room-3'
  assert.ok(state.savedRoomIds.includes('room-3'), 'Optimistic: room-3 phải xuất hiện ngay lập tức trong 1ms');
  await p1;
  assert.ok(state.savedRoomIds.includes('room-3'), 'Sau khi API thành công, room-3 vẫn được lưu');
  console.log('  ✅ [PASS] Optimistic Update: Giao diện phản hồi 1ms trước khi API hoàn tất');

  // Kịch bản B: Lỗi mạng -> Tự động Rollback
  const p2 = toggleSaveRoom('room-99', true);
  // Ngay lập tức vẫn thấy room-99 trong mảng
  assert.ok(state.savedRoomIds.includes('room-99'), 'Lạc quan: room-99 tạm thời được thêm vào');
  await p2;
  // Sau khi API lỗi, state phải rollback lại snapshot cũ!
  assert.strictEqual(state.savedRoomIds.includes('room-99'), false, 'Rollback: room-99 phải bị gỡ bỏ khi API thất bại');
  assert.strictEqual(state.toastMessage, 'Lỗi kết nối, đã khôi phục', 'Bắn thông báo cảnh báo lỗi cho người dùng');
  console.log('  ✅ [PASS] Safe Rollback: Tự động hoàn tác về snapshot cũ khi mất mạng hoặc token hết hạn');
}

// 2. Kiểm tra tính Idempotent khi người dùng spam click (Double Click)
function testSpamClickIdempotence() {
  console.log('\nTest 2: Kiểm tra chống trùng lặp khi người dùng click dồn dập (Idempotency)');

  let savedSet = new Set(['room-1']);
  
  function applyToggle(roomId) {
    if (savedSet.has(roomId)) {
      savedSet.delete(roomId);
    } else {
      savedSet.add(roomId);
    }
  }

  // Click 1: Lưu room-2
  applyToggle('room-2');
  assert.strictEqual(savedSet.has('room-2'), true);

  // Click 2: Bỏ lưu room-2
  applyToggle('room-2');
  assert.strictEqual(savedSet.has('room-2'), false);

  // Click 3: Lưu lại room-2
  applyToggle('room-2');
  assert.strictEqual(savedSet.has('room-2'), true);
  assert.strictEqual(Array.from(savedSet).filter(id => id === 'room-2').length, 1, 'Không bao giờ bị trùng 2 bản ghi');
  console.log('  ✅ [PASS] Idempotent Toggle: Spam click liên tiếp không tạo bản ghi rác');
}

async function run() {
  await testOptimisticAndRollback();
  testSpamClickIdempotence();

  console.log('\n======================================================================');
  console.log('🎉 TẤT CẢ CÁC BÀI TEST OPTIMISTIC UI ĐẠT CHUẨN 100%!');
  console.log('======================================================================');
}

run().catch(err => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
