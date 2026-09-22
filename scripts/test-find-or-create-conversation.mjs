import assert from 'node:assert';

// Mô phỏng bộ nhớ test độc lập
const memoryStore = new Map();

function safeGetStorage(key) {
  return memoryStore.get(key) || null;
}

function safeSetStorage(key, value) {
  memoryStore.set(key, value);
}

const LOCAL_CONVS_KEY = 'troxinh_local_conversations';
const LOCAL_MSGS_KEY = 'troxinh_local_messages';
const CONV_META_PREFIX = 'troxinh_conv_meta_';

const KNOWN_DEMO_UUIDS = {
  demo_admin_uuid: '00000000-0000-0000-0000-000000000001',
  demo_owner_uuid: '00000000-0000-0000-0000-000000000002',
  user_owner_1: '00000000-0000-0000-0000-000000000002',
  demo_renter_uuid: '00000000-0000-0000-0000-000000000003',
  user_renter_1: '00000000-0000-0000-0000-000000000003',
};

function isSameUserId(id1, id2) {
  if (!id1 || !id2) return false;
  const clean1 = String(id1).trim();
  const clean2 = String(id2).trim();
  if (clean1 === clean2) return true;

  const DEMO_GROUPS = [
    ['00000000-0000-0000-0000-000000000001', 'demo_admin_uuid'],
    ['00000000-0000-0000-0000-000000000002', 'demo_owner_uuid', 'user_owner_1'],
    ['00000000-0000-0000-0000-000000000003', 'demo_renter_uuid', 'user_renter_1'],
  ];

  for (const group of DEMO_GROUPS) {
    if (group.includes(clean1) && group.includes(clean2)) {
      return true;
    }
  }
  return false;
}

function resolveUserIdToUuid(userId) {
  if (!userId) return '';
  const trimmed = String(userId).trim();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (UUID_REGEX.test(trimmed)) return trimmed;
  if (KNOWN_DEMO_UUIDS[trimmed]) return KNOWN_DEMO_UUIDS[trimmed];
  return `mock-${trimmed}`;
}

function getConversationMeta(convId) {
  const raw = safeGetStorage(`${CONV_META_PREFIX}${convId}`);
  return raw ? JSON.parse(raw) : null;
}

function saveConversationMeta(convId, meta) {
  const existing = getConversationMeta(convId) || {};
  const merged = { ...existing, ...meta };
  safeSetStorage(`${CONV_META_PREFIX}${convId}`, JSON.stringify(merged));
}

function getLocalConversations() {
  const raw = safeGetStorage(LOCAL_CONVS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveLocalConversation(conv) {
  const list = getLocalConversations().filter((c) => c.id !== conv.id);
  list.unshift(conv);
  safeSetStorage(LOCAL_CONVS_KEY, JSON.stringify(list));
}

function getLocalMessages(conversationId) {
  const raw = safeGetStorage(`${LOCAL_MSGS_KEY}_${conversationId}`);
  return raw ? JSON.parse(raw) : [];
}

function saveLocalMessage(msg) {
  const list = getLocalMessages(msg.conversation_id);
  list.push(msg);
  safeSetStorage(`${LOCAL_MSGS_KEY}_${msg.conversation_id}`, JSON.stringify(list));
}

function formatItemContextMessage(itemName, price, itemId) {
  const name = itemName ? `"${itemName}"` : 'món đồ thanh lý của bạn';
  const priceText =
    price !== undefined
      ? price === 0
        ? ' (Đồ tặng miễn phí)'
        : ` (${Number(price).toLocaleString('vi-VN')} đ)`
      : '';
  return `👋 Xin chào! Tôi quan tâm đến ${name}${priceText}. Món này còn không bạn?`;
}

async function sendMessage(conversationId, senderId, content, senderName) {
  const newMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    sender_name: senderName || 'Người mua',
    created_at: new Date().toISOString(),
  };
  saveLocalMessage(newMsg);
  return newMsg;
}

/**
 * Triển khai hàm findOrCreateConversation theo cấu trúc gom theo cặp người dùng
 */
async function findOrCreateConversation(buyerId, sellerId, itemId, options = {}) {
  // 1. Kiểm tra đầu vào
  if (!buyerId || !sellerId) {
    throw new Error('Thiếu thông tin người tham gia hội thoại.');
  }

  const cleanItemId = itemId ? String(itemId).trim() : '';
  if (!cleanItemId) {
    throw new Error('Thiếu thông tin món đồ cần trao đổi.');
  }

  // 2. Chặn tự nhắn tin cho chính mình
  if (isSameUserId(buyerId, sellerId)) {
    throw new Error('Không thể tự nhắn tin cho chính mình.');
  }

  const cleanBuyerId = resolveUserIdToUuid(buyerId);
  const cleanSellerId = resolveUserIdToUuid(sellerId);

  if (cleanBuyerId === cleanSellerId) {
    throw new Error('Không thể tự nhắn tin cho chính mình.');
  }

  // 3. Tìm cuộc trò chuyện hiện có
  let existingId = null;
  let isNew = false;
  let contextInserted = false;

  const localList = getLocalConversations();
  const found = localList.find(
    (c) =>
      (isSameUserId(c.participant_1, cleanBuyerId) && isSameUserId(c.participant_2, cleanSellerId)) ||
      (isSameUserId(c.participant_1, cleanSellerId) && isSameUserId(c.participant_2, cleanBuyerId)),
  );

  if (found) {
    existingId = found.id;
  }

  // 4. Nếu chưa có -> Tạo mới
  if (!existingId) {
    isNew = true;
    existingId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    saveConversationMeta(existingId, {
      other_name: options.sellerName || 'Người bán',
      other_avatar: options.sellerAvatar || '/images/user-avatar.jpg',
      last_item_id: cleanItemId,
      last_item_name: options.itemName,
      last_item_price: options.itemPrice,
      discussed_items: [cleanItemId],
    });

    saveLocalConversation({
      id: existingId,
      participant_1: cleanBuyerId,
      participant_2: cleanSellerId,
      item_id: cleanItemId,
      last_message: 'Bắt đầu cuộc trò chuyện...',
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    const contextMsg =
      options.initialMessage ||
      formatItemContextMessage(options.itemName, options.itemPrice, cleanItemId);
    await sendMessage(existingId, cleanBuyerId, contextMsg, options.buyerName);
    contextInserted = true;
  } else {
    // 5. Nếu đã có -> Kiểm tra xem đã có ngữ cảnh món này chưa
    isNew = false;
    const meta = getConversationMeta(existingId) || {};
    const discussed = Array.isArray(meta.discussed_items)
      ? meta.discussed_items
      : meta.last_item_id
        ? [meta.last_item_id]
        : [];

    const isSameItem = meta.last_item_id === cleanItemId || discussed.includes(cleanItemId);

    if (isSameItem) {
      // Cùng món: Không tạo trùng, không chèn lại ngữ cảnh thừa
      contextInserted = false;
    } else {
      // Món khác: Chèn ngữ cảnh món mới vào hội thoại chung
      const contextMsg =
        options.initialMessage ||
        formatItemContextMessage(options.itemName, options.itemPrice, cleanItemId);
      await sendMessage(existingId, cleanBuyerId, contextMsg, options.buyerName);
      contextInserted = true;

      saveConversationMeta(existingId, {
        last_item_id: cleanItemId,
        last_item_name: options.itemName,
        last_item_price: options.itemPrice,
        discussed_items: Array.from(new Set([...discussed, cleanItemId])),
      });
    }
  }

  const finalConvId = existingId;
  return {
    id: finalConvId,
    conversationId: finalConvId,
    isNew,
    contextInserted,
    itemId: cleanItemId,
    toString() {
      return finalConvId;
    },
    valueOf() {
      return finalConvId;
    },
  };
}

// ==============================================================
// TEST SUITE
// ==============================================================
console.log('=== BẮT ĐẦU CHẠY TEST SUITE CHO findOrCreateConversation ===\n');

let totalPassed = 0;
let totalFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    totalFailed++;
  }
}

async function runAsyncTest(name, fn) {
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

async function main() {
  // Test 1: Tự nhắn mình bị từ chối (cùng ID)
  await runAsyncTest('Tự nhắn mình bị từ chối khi buyerId trùng khớp sellerId', async () => {
    let caught = false;
    try {
      await findOrCreateConversation('user_1', 'user_1', 'item-101');
    } catch (err) {
      caught = true;
      assert.strictEqual(err.message, 'Không thể tự nhắn tin cho chính mình.');
    }
    assert.strictEqual(caught, true, 'Hàm phải throw Error khi buyerId trùng sellerId');
  });

  // Test 1b: Tự nhắn mình bị từ chối với alias demo
  await runAsyncTest('Tự nhắn mình bị từ chối với alias demo (demo_renter_uuid và user_renter_1)', async () => {
    let caught = false;
    try {
      await findOrCreateConversation('demo_renter_uuid', 'user_renter_1', 'item-101');
    } catch (err) {
      caught = true;
      assert.strictEqual(err.message, 'Không thể tự nhắn tin cho chính mình.');
    }
    assert.strictEqual(caught, true, 'Hàm phải nhận diện được 2 alias trỏ về cùng 1 tài khoản');
  });

  // Test 2: Gọi lần đầu tạo cuộc hội thoại mới và chèn ngữ cảnh
  let convRes1;
  await runAsyncTest('Gọi lần đầu tạo hội thoại mới và chèn tin nhắn ngữ cảnh món đồ', async () => {
    convRes1 = await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_B', 'item-quat-senko-101', {
      itemName: 'Quạt đứng Senko lỡ 5 cánh',
      itemPrice: 150000,
    });

    assert.ok(convRes1.conversationId, 'Phải có conversationId');
    assert.strictEqual(convRes1.isNew, true, 'Lần đầu phải có isNew = true');
    assert.strictEqual(convRes1.contextInserted, true, 'Lần đầu phải có contextInserted = true');
    assert.strictEqual(convRes1.itemId, 'item-quat-senko-101');

    // Kiểm tra tin nhắn ngữ cảnh trong hội thoại
    const msgs = getLocalMessages(convRes1.conversationId);
    assert.strictEqual(msgs.length, 1, 'Hội thoại mới phải có đúng 1 tin nhắn ngữ cảnh ban đầu');
    assert.ok(msgs[0].content.includes('Quạt đứng Senko lỡ 5 cánh'), 'Nội dung tin nhắn phải có tên món đồ');
    assert.ok(msgs[0].content.includes('150.000 đ'), 'Nội dung tin nhắn phải có giá');
  });

  // Test 3: Gọi lần 2 với CÙNG MÓN ĐỒ -> không tạo trùng, không chèn lại ngữ cảnh
  await runAsyncTest('Gọi lần 2 với cùng món đồ: trả về hội thoại cũ, không tạo trùng', async () => {
    const convRes2 = await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_B', 'item-quat-senko-101', {
      itemName: 'Quạt đứng Senko lỡ 5 cánh',
      itemPrice: 150000,
    });

    assert.strictEqual(convRes2.conversationId, convRes1.conversationId, 'Phải trả về chính xác ID hội thoại cũ');
    assert.strictEqual(convRes2.isNew, false, 'Không được tạo mới (isNew = false)');
    assert.strictEqual(convRes2.contextInserted, false, 'Không được chèn lại ngữ cảnh thừa (contextInserted = false)');

    // Số tin nhắn không đổi
    const msgs = getLocalMessages(convRes2.conversationId);
    assert.strictEqual(msgs.length, 1, 'Không được gửi tin nhắn trùng lặp vào hội thoại');
  });

  // Test 4: Món khác của cùng người bán -> Giữ hội thoại chung và chèn ngữ cảnh món mới
  await runAsyncTest('Món khác của cùng người bán: giữ hội thoại chung và chèn ngữ cảnh món mới', async () => {
    const convRes3 = await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_B', 'item-bep-tu-202', {
      itemName: 'Bếp từ đơn Kangaroo',
      itemPrice: 200000,
    });

    assert.strictEqual(convRes3.conversationId, convRes1.conversationId, 'Giữ nguyên hội thoại chung giữa 2 người');
    assert.strictEqual(convRes3.isNew, false, 'Không tạo thêm phòng chat rác giữa 2 người');
    assert.strictEqual(convRes3.contextInserted, true, 'Phải chèn ngữ cảnh món mới vào luồng chat (contextInserted = true)');
    assert.strictEqual(convRes3.itemId, 'item-bep-tu-202');

    // Kiểm tra tin nhắn thứ 2 được chèn vào hội thoại
    const msgs = getLocalMessages(convRes3.conversationId);
    assert.strictEqual(msgs.length, 2, 'Hội thoại bây giờ có 2 tin nhắn');
    assert.ok(msgs[1].content.includes('Bếp từ đơn Kangaroo'), 'Tin nhắn thứ 2 phải chứa tên món đồ mới');
    assert.ok(msgs[1].content.includes('200.000 đ'), 'Tin nhắn thứ 2 phải chứa giá món đồ mới');
  });

  // Test 5: Gọi lại món thứ 2 -> không chèn lại ngữ cảnh
  await runAsyncTest('Gọi lại món thứ 2 đã chèn ngữ cảnh: không chèn lại', async () => {
    const convRes4 = await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_B', 'item-bep-tu-202', {
      itemName: 'Bếp từ đơn Kangaroo',
      itemPrice: 200000,
    });

    assert.strictEqual(convRes4.conversationId, convRes1.conversationId);
    assert.strictEqual(convRes4.isNew, false);
    assert.strictEqual(convRes4.contextInserted, false, 'Đã từng trao đổi về item-bep-tu-202 nên không chèn lại');

    const msgs = getLocalMessages(convRes4.conversationId);
    assert.strictEqual(msgs.length, 2, 'Số lượng tin nhắn vẫn giữ nguyên 2');
  });

  // Test 6: Đồ tặng miễn phí (itemPrice = 0)
  await runAsyncTest('Đồ tặng miễn phí (price = 0) format đúng "(Đồ tặng miễn phí)"', async () => {
    const convFree = await findOrCreateConversation('buyer_sinh_vien_C', 'seller_sinh_vien_D', 'item-sach-giao-trinh', {
      itemName: 'Giáo trình Giải tích 1',
      itemPrice: 0,
    });

    assert.strictEqual(convFree.isNew, true);
    assert.strictEqual(convFree.contextInserted, true);

    const msgs = getLocalMessages(convFree.conversationId);
    assert.ok(msgs[0].content.includes('Đồ tặng miễn phí'), 'Tin nhắn phải chứa nhãn Đồ tặng miễn phí');
  });

  // Test 7: Coercion sang string
  runTest('Đối tượng trả về có thể ép kiểu thành string (conversationId)', () => {
    assert.strictEqual(String(convRes1), convRes1.conversationId);
    assert.strictEqual(`${convRes1}`, convRes1.conversationId);
  });

  // Test 8: Thiếu tham số bị từ chối
  await runAsyncTest('Thiếu buyerId, sellerId hoặc itemId ném lỗi rõ ràng', async () => {
    let err1 = false;
    let err2 = false;
    try {
      await findOrCreateConversation('', 'seller_1', 'item-1');
    } catch {
      err1 = true;
    }
    try {
      await findOrCreateConversation('buyer_1', 'seller_1', '');
    } catch {
      err2 = true;
    }
    assert.strictEqual(err1, true, 'Thiếu buyerId phải ném lỗi');
    assert.strictEqual(err2, true, 'Thiếu itemId phải ném lỗi');
  });

  console.log(`\n========================================`);
  console.log(`KẾT QUẢ: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log(`========================================`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main();
