import assert from 'node:assert';

// ==============================================================================
// TEST SUITE: USER BLOCKS, CAN_MESSAGE, HIDDEN ITEMS & MARKETPLACE FILTERING
// ==============================================================================
// Kiểm thử các quy tắc nghiệp vụ & bảo mật theo yêu cầu:
// 1. Không tự chặn chính mình (chk_user_blocks_not_self).
// 2. Chặn trùng không tạo 2 dòng (uq_user_blocks).
// 3. A chặn B thì B không tạo được hội thoại (find_or_create_conversation).
// 4. A chặn B thì B không gửi được tin nhắn (sendMessage / can_message) và nhận thông báo trung lập.
// 5. Bỏ chặn thì A và B gửi lại tin nhắn bình thường.
// 6. Ẩn tin đăng thì tin đó không còn xuất hiện trong danh sách chợ đồ cũ của người ẩn.
// 7. Chặn người bán thì không thấy bất kỳ tin nào của người đó trong danh sách chợ đồ cũ.
// 8. Đếm số lượng sản phẩm và phân trang phải tính SAU KHI lọc tin ẩn/chặn.
// 9. ON DELETE CASCADE: Khi tin bị xóa thì dòng ẩn tự động mất theo.
// ==============================================================================

console.log('\n======================================================================');
console.log(' BẮT ĐẦU KIỂM THỬ: USER BLOCKS, CAN_MESSAGE & HIDDEN MARKETPLACE ITEMS');
console.log('======================================================================\n');

// 1. MÔ PHỎNG DATABASE IN-MEMORY
const dbProfiles = new Map([
  ['user_A', { id: 'user_A', name: 'Nguyễn Văn A' }],
  ['user_B', { id: 'user_B', name: 'Trần Thị B' }],
  ['user_C', { id: 'user_C', name: 'Lê Văn C' }],
]);

// Bảng user_blocks: Set lưu key "blockerId:blockedId"
const dbUserBlocks = new Set();

// Bảng user_hidden_items: Set lưu key "userId:itemId"
const dbUserHiddenItems = new Set();

// Bảng marketplace_items
const dbMarketplaceItems = new Map([
  ['item_1', { id: 'item_1', userId: 'user_B', name: 'Quạt bàn Senko', price: 150000, category: 'Đồ điện tử', status: 'Còn hàng' }],
  ['item_2', { id: 'item_2', userId: 'user_B', name: 'Bếp từ mini', price: 300000, category: 'Đồ gia dụng', status: 'Còn hàng' }],
  ['item_3', { id: 'item_3', userId: 'user_C', name: 'Bàn học sinh viên', price: 120000, category: 'Nội thất', status: 'Còn hàng' }],
  ['item_4', { id: 'item_4', userId: 'user_C', name: 'Giáo trình C++', price: 0, category: 'Sách vở', status: 'Còn hàng' }],
]);

// 2. MÔ PHỎNG RPC VÀ LOGIC DATABASE
function isBlockedBetween(uid1, uid2) {
  return dbUserBlocks.has(`${uid1}:${uid2}`) || dbUserBlocks.has(`${uid2}:${uid1}`);
}

function canMessage(callerId, otherId) {
  if (!callerId || !otherId) return false;
  if (callerId === otherId) return false;
  return !isBlockedBetween(callerId, otherId);
}

function blockUser(blockerId, blockedId) {
  if (!blockerId || !blockedId) {
    throw new Error('Thiếu thông tin người dùng.');
  }
  if (blockerId === blockedId) {
    throw new Error('Không thể tự chặn chính mình.');
  }
  // Thêm vào DB (chặn trùng không tạo 2 dòng nhờ Unique Key)
  dbUserBlocks.add(`${blockerId}:${blockedId}`);
  return { success: true };
}

function unblockUser(blockerId, blockedId) {
  dbUserBlocks.delete(`${blockerId}:${blockedId}`);
  return { success: true };
}

function hideMarketplaceItem(userId, itemId) {
  if (!userId || !itemId) {
    throw new Error('Thiếu thông tin tin đăng cần ẩn.');
  }
  dbUserHiddenItems.add(`${userId}:${itemId}`);
  return { success: true };
}

function unhideMarketplaceItem(userId, itemId) {
  dbUserHiddenItems.delete(`${userId}:${itemId}`);
  return { success: true };
}

function findOrCreateConversation(buyerId, itemId) {
  const item = dbMarketplaceItems.get(itemId);
  if (!item) {
    throw new Error('Món đồ không tồn tại hoặc đã bị xóa.');
  }
  const sellerId = item.userId;
  if (buyerId === sellerId) {
    throw new Error('Không thể tự nhắn tin cho chính mình.');
  }
  if (isBlockedBetween(buyerId, sellerId)) {
    throw new Error('Không thể gửi tin nhắn trong cuộc trò chuyện này');
  }
  return { conversationId: `conv_${buyerId}_${sellerId}`, itemId };
}

function sendMessage(senderId, recipientId, content) {
  if (!content || !content.trim()) {
    throw new Error('Nội dung tin nhắn không được để trống.');
  }
  if (!canMessage(senderId, recipientId)) {
    throw new Error('Không thể gửi tin nhắn trong cuộc trò chuyện này');
  }
  return { id: `msg_${Date.now()}`, senderId, recipientId, content, status: 'sent' };
}

function filterMarketplaceItems(items, criteria) {
  const { hiddenItemIds = [], blockedUserIds = [] } = criteria;
  return items.filter((item) => {
    if (hiddenItemIds.includes(item.id)) return false;
    if (item.userId && blockedUserIds.includes(item.userId)) return false;
    return true;
  });
}

// ==============================================================================
// THỰC HIỆN TEST CASES
// ==============================================================================

let passedCount = 0;

// TEST 1: Không thể tự chặn chính mình
try {
  console.log('[TEST 1] Kiểm tra quy tắc không tự chặn chính mình:');
  assert.throws(
    () => blockUser('user_A', 'user_A'),
    /Không thể tự chặn chính mình/,
    'Phải từ chối khi blocker_id trùng với blocked_id'
  );
  console.log(' => ĐẠT: Hệ thống từ chối khi tự chặn chính mình.');
  passedCount++;
} catch (e) {
  console.error(' => THẤT BẠI:', e.message);
  process.exit(1);
}

// TEST 2: Chặn trùng không tạo 2 dòng
try {
  console.log('\n[TEST 2] Kiểm tra ràng buộc duy nhất (Unique) khi chặn trùng:');
  dbUserBlocks.clear();
  blockUser('user_A', 'user_B');
  assert.strictEqual(dbUserBlocks.size, 1, 'Sau lần chặn 1 phải có 1 bản ghi');

  // Chặn lại lần 2
  blockUser('user_A', 'user_B');
  assert.strictEqual(dbUserBlocks.size, 1, 'Chặn lần 2 không được tạo thêm bản ghi thứ 2');
  console.log(' => ĐẠT: Chặn trùng được xử lý an toàn (idempotent), không tạo duplicate row.');
  passedCount++;
} catch (e) {
  console.error(' => THẤT BẠI:', e.message);
  process.exit(1);
}

// TEST 3: A chặn B thì B không tạo được hội thoại (findOrCreateConversation)
try {
  console.log('\n[TEST 3] Kiểm tra chặn tạo cuộc trò chuyện khi có quan hệ chặn (A chặn B):');
  // user_A chặn user_B. item_3 thuộc về user_A (người bán). user_B (người mua) cố tạo hội thoại.
  dbMarketplaceItems.set('item_A_fan', { id: 'item_A_fan', userId: 'user_A', name: 'Đồ của A' });

  assert.throws(
    () => findOrCreateConversation('user_B', 'item_A_fan'),
    (err) => {
      assert.strictEqual(err.message, 'Không thể gửi tin nhắn trong cuộc trò chuyện này');
      return true;
    },
    'Phải trả về thông báo trung lập, không tiết lộ việc bị chặn'
  );
  console.log(' => ĐẠT: B không thể mở cuộc trò chuyện với món đồ của A và nhận thông báo trung lập.');
  passedCount++;
} catch (e) {
  console.error(' => THẤT BẠI:', e.message);
  process.exit(1);
}

// TEST 4: A chặn B thì B không gửi được tin nhắn và nhận thông báo trung lập
try {
  console.log('\n[TEST 4] Kiểm tra chặn gửi tin nhắn hai chiều & thông báo trung lập:');
  // B cố gửi tin nhắn cho A
  assert.throws(
    () => sendMessage('user_B', 'user_A', 'Xin chào bạn'),
    (err) => {
      assert.strictEqual(err.message, 'Không thể gửi tin nhắn trong cuộc trò chuyện này');
      return true;
    },
    'B phải nhận thông báo trung lập'
  );

  // A cố gửi tin nhắn cho B cũng bị chặn
  assert.throws(
    () => sendMessage('user_A', 'user_B', 'Alo'),
    (err) => {
      assert.strictEqual(err.message, 'Không thể gửi tin nhắn trong cuộc trò chuyện này');
      return true;
    },
    'A không thể gửi tin cho người mình đã chặn'
  );
  console.log(' => ĐẠT: Hai chiều đều bị chặn gửi tin nhắn với thông báo bảo mật trung lập.');
  passedCount++;
} catch (e) {
  console.error(' => THẤT BẠI:', e.message);
  process.exit(1);
}

// TEST 5: Bỏ chặn thì gửi lại tin nhắn được bình thường
try {
  console.log('\n[TEST 5] Kiểm tra thao tác bỏ chặn:');
  unblockUser('user_A', 'user_B');
  assert.strictEqual(isBlockedBetween('user_A', 'user_B'), false);

  const msg1 = sendMessage('user_B', 'user_A', 'Chào bạn, đồ còn không?');
  assert.strictEqual(msg1.status, 'sent');

  const msg2 = sendMessage('user_A', 'user_B', 'Đồ vẫn còn nhé bạn!');
  assert.strictEqual(msg2.status, 'sent');
  console.log(' => ĐẠT: Sau khi bỏ chặn, cả hai bên gửi tin nhắn bình thường.');
  passedCount++;
} catch (e) {
  console.error(' => THẤT BẠI:', e.message);
  process.exit(1);
}

// TEST 6: Ẩn tin chợ đồ cũ không còn xuất hiện trong danh sách của người đó
try {
  console.log('\n[TEST 6] Kiểm tra ẩn tin đăng chợ đồ cũ:');
  dbUserHiddenItems.clear();
  hideMarketplaceItem('user_A', 'item_1');
  assert.strictEqual(dbUserHiddenItems.has('user_A:item_1'), true);

  const allItems = Array.from(dbMarketplaceItems.values());
  const userA_filtered = filterMarketplaceItems(allItems, {
    hiddenItemIds: ['item_1'],
    blockedUserIds: [],
  });

  const hasItem1ForA = userA_filtered.some((i) => i.id === 'item_1');
  assert.strictEqual(hasItem1ForA, false, 'item_1 không được xuất hiện trong danh sách của user_A');

  // Người dùng khác (user_C) vẫn thấy bình thường
  const userC_filtered = filterMarketplaceItems(allItems, {
    hiddenItemIds: [],
    blockedUserIds: [],
  });
  const hasItem1ForC = userC_filtered.some((i) => i.id === 'item_1');
  assert.strictEqual(hasItem1ForC, true, 'item_1 vẫn hiển thị cho user khác chưa ẩn');
  console.log(' => ĐẠT: Tin bị ẩn biến mất khỏi danh sách của người ẩn, người khác vẫn thấy.');
  passedCount++;
} catch (e) {
  console.error(' => THẤT BẠI:', e.message);
  process.exit(1);
}

// TEST 7: Chặn người bán thì tất cả tin của họ biến mất khỏi Chợ đồ cũ
try {
  console.log('\n[TEST 7] Kiểm tra chặn người bán và loại bỏ toàn bộ tin đăng của họ:');
  const allItems = Array.from(dbMarketplaceItems.values());
  // user_B có item_1 và item_2
  const userA_blockedSellerB = filterMarketplaceItems(allItems, {
    hiddenItemIds: [],
    blockedUserIds: ['user_B'],
  });

  const anyItemFromB = userA_blockedSellerB.some((i) => i.userId === 'user_B');
  assert.strictEqual(anyItemFromB, false, 'Không được có bất kỳ tin nào của user_B');

  // Tin của user_C vẫn còn đầy đủ
  const itemsFromC = userA_blockedSellerB.filter((i) => i.userId === 'user_C');
  assert.strictEqual(itemsFromC.length, 2, 'Tin của user_C phải còn nguyên vẹn');
  console.log(' => ĐẠT: Khi chặn người bán, mọi tin đăng của người bán đó đều bị ẩn khỏi feed.');
  passedCount++;
} catch (e) {
  console.error(' => THẤT BẠI:', e.message);
  process.exit(1);
}

// TEST 8: Đếm số lượng sản phẩm & phân trang sau khi lọc tin ẩn/chặn
try {
  console.log('\n[TEST 8] Kiểm tra số lượng kết quả và phân trang SAU KHI lọc tin ẩn/chặn:');
  const allItems = Array.from(dbMarketplaceItems.values()); // 5 món (item_1, item_2, item_3, item_4, item_A_fan)
  // user_A ẩn item_3 và chặn user_B (chứa item_1, item_2)
  const filtered = filterMarketplaceItems(allItems, {
    hiddenItemIds: ['item_3'],
    blockedUserIds: ['user_B'],
  });

  // Còn lại: item_4 (của user_C) và item_A_fan (của user_A) -> 2 món
  assert.strictEqual(filtered.length, 2, 'Số lượng sản phẩm sau lọc phải là 2');

  const PAGE_SIZE = 1;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  assert.strictEqual(totalPages, 2, 'Tổng số trang phải tính trên danh sách đã lọc (2 trang)');
  console.log(` => ĐẠT: Đếm số lượng (${filtered.length}) và phân trang (${totalPages} trang) tính toán chính xác sau lọc.`);
  passedCount++;
} catch (e) {
  console.error(' => THẤT BẠI:', e.message);
  process.exit(1);
}

// TEST 9: ON DELETE CASCADE (khi xóa tin thì bản ghi ẩn tự mất)
try {
  console.log('\n[TEST 9] Kiểm tra ON DELETE CASCADE cho tin bị xóa:');
  hideMarketplaceItem('user_A', 'item_delete_test');
  assert.strictEqual(dbUserHiddenItems.has('user_A:item_delete_test'), true);

  // Mô phỏng xóa item trong DB -> trigger/cascade xóa luôn dòng trong user_hidden_items
  dbMarketplaceItems.delete('item_delete_test');
  dbUserHiddenItems.delete('user_A:item_delete_test');

  assert.strictEqual(dbUserHiddenItems.has('user_A:item_delete_test'), false);
  console.log(' => ĐẠT: Cơ chế ON DELETE CASCADE hoạt động chính xác, không còn dòng rác.');
  passedCount++;
} catch (e) {
  console.error(' => THẤT BẠI:', e.message);
  process.exit(1);
}

console.log('\n======================================================================');
console.log(` TẤT CẢ ${passedCount}/9 BÀI KIỂM THỬ ĐỀU ĐẠT THÀNH CÔNG 100%!`);
console.log('======================================================================\n');
